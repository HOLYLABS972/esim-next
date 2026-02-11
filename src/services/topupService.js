import { supabase } from '../lib/supabase'

const API_URL = typeof window !== 'undefined' 
  ? window.location.origin 
  : process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';

async function ensureTopupOrderHasIccid(params) {
  // The backend create-pending endpoint may create the order without setting the `iccid` column.
  // We patch it here so n8n (and the app) can reliably read the ICCID for topup.
  const { airaloOrderId, userId, iccid, metadata } = params

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: row, error: fetchErr } = await supabase
      .from('esim_orders')
      .select('id, iccid, metadata')
      .eq('airalo_order_id', airaloOrderId)
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchErr) throw fetchErr

    if (row?.id) {
      const existingMeta = (row.metadata && typeof row.metadata === 'object') ? row.metadata : {}
      const nextMeta = { ...existingMeta, ...(metadata || {}), existingEsimIccid: iccid, type: 'esim_topup' }

      const { error: updateErr } = await supabase
        .from('esim_orders')
        .update({
          iccid,
          metadata: nextMeta,
        })
        .eq('id', row.id)

      if (updateErr) throw updateErr
      return
    }

    // Not found yet (eventual consistency) – short backoff.
    await new Promise((r) => setTimeout(r, 250))
  }
}

export async function prepareExistingOrderForTopup(params) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) throw new Error('NO_USER')

  const { packageId, iccid, countryCode, countryName, countryFlag } = params

  const orderRowId = params.orderId ?? null
  const airaloOrderIdValue = params.airaloOrderId ?? null

  let fetch = supabase
    .from('esim_orders')
    .select('id, metadata')
    .limit(1)

  if (orderRowId != null && `${orderRowId}`.trim()) {
    fetch = fetch.eq('id', `${orderRowId}`.trim())
  } else if (airaloOrderIdValue != null && `${airaloOrderIdValue}`.trim()) {
    fetch = fetch.eq('airalo_order_id', `${airaloOrderIdValue}`.trim())
  } else {
    throw new Error('ORDER_NOT_FOUND')
  }

  // Don't include user_id in the filter: RLS already guarantees we can only read/update our own row.
  const { data: row, error: fetchErr } = await fetch.maybeSingle()

  if (fetchErr) throw fetchErr
  if (!row?.id) throw new Error('ORDER_NOT_FOUND')

  const existingMeta = (row.metadata && typeof row.metadata === 'object') ? row.metadata : {}
  const nextMeta = {
    ...existingMeta,
    // required for n8n (reads metadata.package_slug for Airalo API)
    package_slug: packageId,
    source: 'airalo',
    // required for n8n topup branch
    type: 'esim_topup',
    existingEsimIccid: iccid,
    // required for n8n to pick the selected package for topup
    planSlug: packageId,
    packageId,
    // keep compatibility with older nodes reading this field
    airalo_package_slug: packageId,
    countryCode: countryCode || existingMeta?.countryCode,
    countryName: countryName || existingMeta?.countryName,
    countryFlag: countryFlag || existingMeta?.countryFlag,
  }

  const { error: updateErr } = await supabase
    .from('esim_orders')
    .update({
      // Ensure ICCID is stored on the order row as well (n8n/user views may rely on it).
      iccid,
      metadata: nextMeta,
    })
    .eq('id', row.id)

  if (updateErr) throw updateErr
}

function formatDaysRu(days) {
  const mod10 = days % 10
  const mod100 = days % 100
  if (mod100 >= 11 && mod100 <= 14) return `${days} дней`
  if (mod10 === 1) return `${days} день`
  if (mod10 >= 2 && mod10 <= 4) return `${days} дня`
  return `${days} дней`
}

function formatDataRu(pkg) {
  if (!pkg?.data_amount_mb) return 'Н/Д'
  if (pkg?.is_unlimited) return 'Безлимит'
  const mb = Number(pkg.data_amount_mb)
  if (!Number.isFinite(mb) || mb <= 0) return 'Н/Д'
  if (mb >= 1000) return `${(mb / 1000).toFixed(0)} ГБ`
  return `${mb} МБ`
}

/**
 * Extract operator prefix from an Airalo package slug.
 * e.g. "eu-connect-in-7days-1gb" → "eu-connect"
 *      "merhaba-7days-1gb"       → "merhaba"
 *      "lavranet-in-30days-5gb"  → "lavranet"
 */
function getOperatorPrefix(slug) {
  return slug.replace(/(-in)?-\d+.*$/, '')
}

/**
 * Fetch rechargeable (topup) packages.
 * Uses the original plan slug to find sibling packages from the same operator,
 * which works for both country-specific and regional/global plans.
 * Falls back to country_code matching if no slug is available.
 */
export async function fetchTopupPackages(countryCode, originalPlanSlug) {
  try {
    const code = countryCode?.toUpperCase() || ''
    const operatorPrefix = originalPlanSlug ? getOperatorPrefix(originalPlanSlug) : ''

    console.log('📡 Fetching topup packages | country:', code, '| slug:', originalPlanSlug, '| prefix:', operatorPrefix)

    // First, try using the existing API endpoint
    try {
      const params = new URLSearchParams({
        limit: '100',
        ...(code && { country: code }),
        ...(operatorPrefix && { slugPrefix: operatorPrefix })
      })
      
      const response = await fetch(`${API_URL}/api/public/topups?${params}`)
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success && result.data?.plans && result.data.plans.length > 0) {
          console.log('✅ Found', result.data.plans.length, 'topup packages from API')
          
          // Transform API response to our format
          const packages = result.data.plans.map((pkg) => ({
            id: pkg.id || pkg._id,
            slug: pkg.slug || pkg.package_id || pkg.id,
            airaloSlug: pkg.slug || pkg.package_id || pkg.id,
            name: pkg.name || pkg.title || 'Package',
            data: pkg.dataAmount || pkg.data || formatDataFromMB(pkg.data_amount_mb),
            price: parseFloat(pkg.price_usd || pkg.price) || 0,
            price_rub: pkg.price_rub || Math.round((parseFloat(pkg.price_usd || pkg.price) || 0) * 95),
            validity: pkg.validity || formatDaysFromNumber(pkg.period) || 'Н/Д',
            period: pkg.validity || formatDaysFromNumber(pkg.period) || 'Н/Д',
            country_codes: pkg.country_codes || pkg.country_ids || [code],
            country_code: pkg.country || code,
            country_name: null, // API doesn't include country names
            is_unlimited: pkg.is_unlimited || false,
            data_amount_mb: null,
          }))
          
          return packages
        }
      }
    } catch (apiError) {
      console.log('⚠️ API request failed, falling back to direct Supabase query:', apiError.message)
    }

    // Fallback: Direct Supabase query
    let plans = null
    let error = null

    if (operatorPrefix) {
      // Primary strategy: find packages from the same operator by slug prefix
      const result = await supabase
        .from('esim_packages')
        .select('*')
        .ilike('package_id', `${operatorPrefix}-%`)
        .eq('enabled', true)
        .eq('plan_type', 'topup')
        .order('price_usd', { ascending: true })
        .limit(100)
      plans = result.data
      error = result.error
    }

    // Fallback: if no slug or no results, try country_code matching
    if (!error && (!plans || plans.length === 0) && code && code !== 'GLOBAL') {
      console.log('📡 Falling back to country_code matching for:', code)
      const result = await supabase
        .from('esim_packages')
        .select('*')
        .or(`country_codes.cs.{${code}},country_id.eq.${code}`)
        .eq('enabled', true)
        .eq('plan_type', 'topup')
        .order('price_usd', { ascending: true })
        .limit(100)
      plans = result.data
      error = result.error
    }

    if (error) {
      console.error('❌ Supabase query error:', error)
      throw error
    }

    if (!plans || plans.length === 0) {
      console.log('❌ No topup packages found')
      return []
    }

    // Transform Supabase response to our format
    const packages = plans.map((pkg) => ({
      id: pkg.id.toString(),
      slug: pkg.package_id || pkg.id.toString(),
      airaloSlug: pkg.package_id || pkg.id.toString(),
      name: pkg.title || pkg.title_ru || 'Package',
      data: formatDataRu(pkg),
      price: parseFloat(pkg.price_usd) || 0,
      price_rub: pkg.price_rub || Math.round((parseFloat(pkg.price_usd) || 0) * 95),
      validity: pkg.validity_days ? formatDaysRu(Number(pkg.validity_days)) : 'Н/Д',
      period: pkg.validity_days ? formatDaysRu(Number(pkg.validity_days)) : 'Н/Д',
      country_codes: pkg.country_codes || [code],
      country_code: pkg.country_id || code,
      country_name: null, // We'll skip country name lookup for fallback
      is_unlimited: pkg.is_unlimited || false,
      data_amount_mb: pkg.data_amount_mb || null,
    }))

    console.log('✅ Found', packages.length, 'topup packages from Supabase fallback')
    return packages
  } catch (error) {
    console.error('❌ Error fetching topup packages:', error)
    throw error
  }
}

// Helper function to format data amount from MB to readable format
function formatDataFromMB(mb) {
  if (!mb) return 'Н/Д'
  const mbNum = Number(mb)
  if (!Number.isFinite(mbNum) || mbNum <= 0) return 'Н/Д'
  if (mbNum >= 1000) return `${(mbNum / 1000).toFixed(0)} ГБ`
  return `${mbNum} МБ`
}

// Helper function to format days from number
function formatDaysFromNumber(days) {
  if (!days) return null
  return formatDaysRu(Number(days))
}

/**
 * Get order information by ICCID or order ID
 */
export async function getOrderInfo(identifier) {
  try {
    // ICCIDs are typically 19-20 digits and start with "89" (telecom industry prefix).
    const looksLikeIccid = /^89\d{17,18}$/.test(identifier)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id || null
    const userEmail = user?.email || ''

    let foundIccid = looksLikeIccid ? identifier : null
    let foundOrderId = looksLikeIccid ? null : identifier
    let foundAiraloOrderId = null
    let orderCountryCode = null
    let orderCountryName = null
    let originalPlanSlug = null
    let customerEmail = userEmail

    try {
      // Join esim_packages to get the original package slug reliably
      const baseSelect = 'id, iccid, customer_email, country_code, country_name, metadata, airalo_order_id, esim_packages(package_id)'

      const extractFromRow = (data) => {
        if (!data) return
        foundIccid = data.iccid || foundIccid
        foundOrderId = data.id || foundOrderId
        foundAiraloOrderId = data.airalo_order_id || foundAiraloOrderId
        orderCountryCode = data.country_code || null
        orderCountryName = data.country_name || null
        customerEmail = data.customer_email || customerEmail
        const md = data.metadata || null
        // metadata stores slug as "package_slug" (not "airalo_package_slug")
        originalPlanSlug = md?.package_slug || md?.airalo_package_slug || originalPlanSlug
        // Also try the joined package table slug as fallback
        if (!originalPlanSlug && data.esim_packages?.package_id) {
          originalPlanSlug = data.esim_packages.package_id
        }
      }

      if (looksLikeIccid) {
        const fetchByIccid = async (onlyActive) => {
          let q = supabase
            .from('esim_orders')
            .select(baseSelect)
            .eq('iccid', identifier)
            .order('created_at', { ascending: false })
            .limit(1)

          if (onlyActive) q = q.eq('status', 'active')
          if (userId) q = q.eq('user_id', userId)

          const { data, error } = await q.maybeSingle()
          if (error) throw error
          return data
        }

        extractFromRow((await fetchByIccid(true)) || (await fetchByIccid(false)))
      } else {
        const tryFetch = async (where) => {
          let q = supabase
            .from('esim_orders')
            .select(baseSelect)
            .eq(where.col, where.val)
            .limit(1)

          if (userId) q = q.eq('user_id', userId)

          const { data, error } = await q.maybeSingle()
          if (error) throw error
          return data
        }

        extractFromRow(
          (await tryFetch({ col: 'id', val: identifier })) ||
          (await tryFetch({ col: 'airalo_order_id', val: identifier }))
        )
      }
    } catch (error) {
      console.log('⚠️ Could not fetch order info from Supabase:', error)
    }

    return {
      iccid: foundIccid,
      orderId: foundOrderId,
      airaloOrderId: foundAiraloOrderId,
      customerEmail,
      countryCode: orderCountryCode,
      countryName: orderCountryName,
      originalPlanSlug,
    }
  } catch (error) {
    console.error('❌ Error getting order info:', error)
    throw error
  }
}

/**
 * Create a pending topup order in Supabase
 */
export async function createPendingTopupOrder(orderData) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id || null
    const userEmail = user?.email || ''

    // Try to copy install URL/QR fields from the existing eSIM order (best-effort).
    let installDirectUrl = null
    let installQrUrl = null
    let installQrCode = null
    let installLpa = null
    try {
      let q = supabase
        .from('esim_orders')
        .select('direct_apple_installation_url, qr_code_url, qr_code, lpa')
        .eq('iccid', orderData.iccid)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (userId) q = q.eq('user_id', userId)

      const { data: prev, error: prevErr } = await q.maybeSingle()
      if (!prevErr && prev) {
        installDirectUrl = prev.direct_apple_installation_url || null
        installQrUrl = prev.qr_code_url || null
        installQrCode = prev.qr_code || null
        installLpa = prev.lpa || null
      }
    } catch {
      // ignore
    }

    // Prefer creating the pending topup order directly in Supabase so the ICCID + slug are persisted.
    try {
      if (!userId) throw new Error('NO_USER')

      // Resolve package_id to the numeric `esim_packages.id` when needed.
      let numericPackageId = null
      if (/^\d+$/.test(orderData.packageId)) {
        numericPackageId = orderData.packageId
      } else {
        const { data: pkgRow, error: pkgErr } = await supabase
          .from('esim_packages')
          .select('id')
          .eq('package_id', orderData.packageId)
          .maybeSingle()

        if (pkgErr) throw pkgErr
        numericPackageId = pkgRow?.id || null
      }

      if (!numericPackageId) throw new Error('NO_PACKAGE_ID')

      const customerEmail = (orderData.customerEmail || userEmail || '').trim()
      if (!customerEmail) throw new Error('NO_EMAIL')

      const { error: insertError } = await supabase
        .from('esim_orders')
        .insert({
          airalo_order_id: String(orderData.orderId),
          user_id: userId,
          customer_email: customerEmail,
          package_id: numericPackageId,
          country_code: orderData.countryCode || null,
          country_name: orderData.countryName || null,
          price_rub: Math.max(10, Math.round(orderData.amount)),
          status: 'pending',
          order_type: 'esim_topup',
          // Store ICCID explicitly for topup orders
          iccid: orderData.iccid,
          // Copy install data so the topup record has the same install URL (optional)
          direct_apple_installation_url: installDirectUrl,
          qr_code_url: installQrUrl,
          qr_code: installQrCode,
          lpa: installLpa,
          metadata: {
            package_slug: orderData.packageId, // CRITICAL: n8n reads metadata.package_slug
            source: 'airalo',
            type: 'esim_topup',
            existingEsimIccid: orderData.iccid,
            packageId: orderData.packageId,
            planSlug: orderData.packageId,
            airalo_package_slug: orderData.packageId,
            countryCode: orderData.countryCode,
            countryName: orderData.countryName,
            countryFlag: orderData.countryFlag,
          },
        })

      if (!insertError) {
        console.log('✅ Pending topup order created (Supabase)')
        return true
      }
    } catch (e) {
      // Fall back to backend API if direct insert is blocked (RLS/permissions) or any transient error occurs.
      console.log('⚠️ Supabase pending topup insert failed, falling back to API:', e)
    }

    const response = await fetch(`${API_URL}/api/orders/create-pending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: orderData.orderId,
        packageId: orderData.packageId,
        customerEmail: (orderData.customerEmail || userEmail || '').trim(),
        amount: orderData.amount,
        currency: orderData.currency,
        description: `Topup: ${orderData.packageName}`,
        userId,
        quantity: 1,
        orderType: 'esim_topup',
        // Also send ICCID at top-level for backends that support it
        iccid: orderData.iccid,
        metadata: {
          package_slug: orderData.packageId, // CRITICAL: n8n reads metadata.package_slug
          source: 'airalo',
          type: 'esim_topup',
          existingEsimIccid: orderData.iccid,
          packageId: orderData.packageId,
          planSlug: orderData.packageId,
          airalo_package_slug: orderData.packageId,
          countryCode: orderData.countryCode,
          countryName: orderData.countryName,
          countryFlag: orderData.countryFlag,
        },
      }),
    })

    if (response.ok) {
      console.log('✅ Pending topup order created')
      if (userId) {
        try {
          await ensureTopupOrderHasIccid({
            airaloOrderId: String(orderData.orderId),
            userId,
            iccid: orderData.iccid,
            metadata: {
              package_slug: orderData.packageId,
              source: 'airalo',
              type: 'esim_topup',
              existingEsimIccid: orderData.iccid,
              packageId: orderData.packageId,
              planSlug: orderData.packageId,
              airalo_package_slug: orderData.packageId,
              countryCode: orderData.countryCode,
              countryName: orderData.countryName,
              countryFlag: orderData.countryFlag,
            },
          })
        } catch (e) {
          console.log('⚠️ Could not patch topup order ICCID in Supabase:', e)
        }
      }
      return true
    } else {
      const errorText = await response.text()
      console.error('⚠️ Failed to create pending topup order:', errorText.substring(0, 200))
      throw new Error('Не удалось создать заказ на пополнение')
    }
  } catch (error) {
    console.error('⚠️ Error creating pending topup order:', error)
    throw error
  }
}

/**
 * Create payment URL for topup
 */
export async function createTopupPayment(orderData) {
  try {
    const response = await fetch(`${API_URL}/api/robokassa/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order: orderData.orderId,
        email: orderData.customerEmail,
        name: `Topup: ${orderData.packageName}`,
        total: orderData.amount,
        currency: orderData.currency,
        domain: API_URL,
        description: `eSIM Topup for ICCID ${orderData.iccid.substring(0, 10)}...`,
      }),
    })

    const raw = await response.text()
    const contentType = response.headers.get('content-type') || ''
    const result = contentType.includes('application/json')
      ? (() => {
          try {
            return JSON.parse(raw)
          } catch {
            return null
          }
        })()
      : null

    if (!response.ok) {
      const msg =
        (result && (result.error || result.message)) ||
        raw?.substring(0, 200) ||
        'Не удалось создать оплату'
      throw new Error(typeof msg === 'string' ? msg : 'Не удалось создать оплату')
    }

    if (!result) {
      console.error('❌ Payment API returned non-JSON:', raw.substring(0, 200))
      throw new Error('Ошибка сервера оплаты (неверный ответ)')
    }

    if (!result.paymentUrl) {
      throw new Error('No payment URL received')
    }

    console.log('✅ Payment URL created')
    return result.paymentUrl
  } catch (error) {
    console.error('❌ Error creating payment:', error)
    throw error
  }
}