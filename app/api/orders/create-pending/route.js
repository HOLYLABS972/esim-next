import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export async function POST(request) {
  console.log('🚀 POST /api/orders/create-pending called');
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const orderData = await request.json();
    console.log('📦 Creating pending order with data:', JSON.stringify(orderData, null, 2));
    console.log('📦 Order ID:', orderData.orderId);
    console.log('📦 Package ID:', orderData.packageId);
    console.log('📦 Customer Email:', orderData.customerEmail);
    
    // Validate required fields
    if (!orderData.orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }
    
    if (!orderData.packageId) {
      return NextResponse.json(
        { error: 'packageId is required' },
        { status: 400 }
      );
    }
    
    if (!orderData.customerEmail) {
      return NextResponse.json(
        { error: 'customerEmail is required' },
        { status: 400 }
      );
    }
    
    // Automatically apply minimum price constraint (10 RUB) - no error, just correct it
    const MINIMUM_PRICE_RUB = 10;
    const finalAmount = orderData.amount && orderData.amount < MINIMUM_PRICE_RUB 
      ? MINIMUM_PRICE_RUB 
      : (orderData.amount || 0);
    
    if (orderData.amount && orderData.amount < MINIMUM_PRICE_RUB) {
      console.log(`⚠️ Order amount ${orderData.amount} RUB is below minimum ${MINIMUM_PRICE_RUB} RUB, automatically correcting to ${MINIMUM_PRICE_RUB} RUB`);
    }
    
    // Ensure orderId is a string
    const orderIdStr = orderData.orderId ? orderData.orderId.toString() : null;
    if (!orderIdStr) {
      return NextResponse.json(
        { error: 'orderId is required and must be a valid value' },
        { status: 400 }
      );
    }
    
    // Determine orderType from metadata
    let orderType = orderData.orderType;
    if (!orderType && orderData.metadata?.type) {
      if (orderData.metadata.type === 'credit_card_application') {
        orderType = 'credit_card_application';
      } else if (orderData.metadata.type === 'esim_topup') {
        orderType = 'esim_topup';
      } else {
        orderType = 'esim_purchase';
      }
    }
    if (!orderType) {
      orderType = 'esim_purchase'; // Default
    }
    
    // Validate top-up orders have required metadata
    if (orderType === 'esim_topup') {
      const hasEsimIdentifier = 
        orderData.metadata?.existingEsimIccid || 
        orderData.metadata?.iccid ||
        orderData.metadata?.existingEsimOrderId ||
        orderData.metadata?.originalOrderId;
      
      if (!hasEsimIdentifier) {
        return NextResponse.json(
          { error: 'Top-up orders require existing eSIM identifier (existingEsimIccid or existingEsimOrderId) in metadata' },
          { status: 400 }
        );
      }
    }
    
    // Extract country info from metadata
    const countryCode = orderData.metadata?.countryCode || orderData.countryCode || null;
    const countryName = orderData.metadata?.countryName || orderData.countryName || null;
    
    // Parse packageId - try to find numeric package ID and get slug (package_id)
    let packageId = null;
    let packageSlug = null; // Store the slug for later use in Airalo API
    const packageIdStr = orderData.packageId?.toString();
    if (packageIdStr) {
      // CRITICAL: Always save the packageIdStr as packageSlug fallback
      // This ensures n8n has the package slug even if package not in DB
      packageSlug = packageIdStr;

      // Try to find package by package_id (slug) first
      const { data: packageData } = await supabaseAdmin
        .from('esim_packages')
        .select('id, package_id')
        .eq('package_id', packageIdStr)
        .maybeSingle();

      if (packageData?.id) {
        packageId = packageData.id;
        packageSlug = packageData.package_id || packageIdStr; // Use DB slug if available
      } else {
        // Try parsing as numeric ID
        const packageIdNum = parseInt(packageIdStr, 10);
        if (!isNaN(packageIdNum) && packageIdNum > 0 && packageIdNum < 1000000) {
          packageId = packageIdNum;
          // Fetch package to get the slug (package_id)
          const { data: packageByNum } = await supabaseAdmin
            .from('esim_packages')
            .select('package_id')
            .eq('id', packageIdNum)
            .maybeSingle();

          if (packageByNum?.package_id) {
            packageSlug = packageByNum.package_id; // Use DB slug if found
          }
          // If not found, packageSlug already has packageIdStr as fallback
        }
      }

      console.log('📦 Package resolution:', {
        input: packageIdStr,
        foundInDB: !!packageId,
        packageId: packageId,
        packageSlug: packageSlug
      });
    }
    
    // Check if order already exists
    console.log('🔍 Checking if order already exists with orderId:', orderIdStr);
    const { data: existingOrder, error: findError } = await supabaseAdmin
      .from('esim_orders')
      .select('id, status, metadata')
      .eq('airalo_order_id', orderIdStr)
      .maybeSingle();
    
    if (findError && findError.code !== 'PGRST116') { // PGRST116 = not found, which is OK
      console.error('❌ Error finding order:', findError);
      throw findError;
    }
    
    if (existingOrder) {
      // Order exists - only update if it's still pending
      if (existingOrder.status === 'active' || existingOrder.status === 'expired' || existingOrder.status === 'failed') {
        console.log('⚠️ Order already exists and is not pending, cannot update:', orderIdStr);
        return NextResponse.json(
          { 
            error: 'Order already exists and cannot be modified',
            order: {
              orderId: orderIdStr,
              status: existingOrder.status
            }
          },
          { status: 409 }
        );
      }
      
      // Update existing pending order
      console.log('📦 Updating existing pending order:', orderIdStr);
      
      // Get existing metadata or create new with roamjet_api_key
      const existingMetadata = existingOrder.metadata || {};
      
      // If slug is missing and we have a package_id, try to fetch it
      let finalPackageSlug = packageSlug || existingMetadata.package_slug;
      if (!finalPackageSlug && (packageId || existingOrder.package_id)) {
        const orderPackageId = packageId || existingOrder.package_id;
        const { data: packageByNum } = await supabaseAdmin
          .from('esim_packages')
          .select('package_id')
          .eq('id', orderPackageId)
          .maybeSingle();
        
        if (packageByNum?.package_id) {
          finalPackageSlug = packageByNum.package_id;
          console.log(`✅ Fetched missing package slug for order ${orderIdStr}: ${finalPackageSlug}`);
        }
      }
      
      const updateData = {
        package_id: packageId || undefined,
        customer_email: orderData.customerEmail,
        price_rub: finalAmount,
        currency: orderData.currency || 'RUB',
        user_id: orderData.userId || null,
        status: 'pending', // Always ensure status remains pending
        metadata: {
          ...existingMetadata,
          package_slug: finalPackageSlug, // Store slug for Airalo API (REQUIRED for n8n)
          source: 'airalo' // All packages are from Airalo
        },
        updated_at: new Date().toISOString()
      };
      
      // Only include country fields if they are provided (not null/undefined)
      if (countryCode) {
        updateData.country_code = countryCode;
      }
      if (countryName) {
        updateData.country_name = countryName;
      }
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });
      
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('esim_orders')
        .update(updateData)
        .eq('id', existingOrder.id)
        .select()
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      console.log('✅ Existing pending order updated in Supabase:', orderIdStr);
      
      return NextResponse.json({ 
        success: true, 
        order: {
          orderId: updatedOrder.airalo_order_id || updatedOrder.id.toString(),
          status: updatedOrder.status
        },
        message: 'Pending order updated successfully' 
      });
    } else {
      // Create new pending order
      console.log('📦 Creating new pending order with orderType:', orderType);
      console.log('📦 Order status set to: pending');

      const newOrderData = {
        airalo_order_id: orderIdStr,
        package_id: packageId,
        customer_email: orderData.customerEmail,
        price_rub: finalAmount,
        currency: orderData.currency || 'RUB',
        user_id: orderData.userId || null,
        status: 'pending', // Always pending when created from payment flow
        metadata: {
          package_slug: packageSlug, // Store slug (package_id) for Airalo API (REQUIRED for n8n)
          source: 'airalo' // All packages are from Airalo
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Only include country fields if they are provided (not null/undefined)
      // This prevents schema errors if columns don't exist in the table
      if (countryCode) {
        newOrderData.country_code = countryCode;
      }
      if (countryName) {
        newOrderData.country_name = countryName;
      }
      
      // Remove null package_id if not found
      if (newOrderData.package_id === null) {
        delete newOrderData.package_id;
      }
      
      const { data: newOrder, error: createError } = await supabaseAdmin
        .from('esim_orders')
        .insert(newOrderData)
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating order:', createError);
        throw createError;
      }
      
      console.log('✅ New pending order saved to Supabase:', newOrder.airalo_order_id || newOrder.id);
      console.log('✅ Order saved with status: pending');
      
      return NextResponse.json({ 
        success: true, 
        order: {
          orderId: newOrder.airalo_order_id || newOrder.id.toString(),
          status: newOrder.status
        },
        message: 'Pending order created successfully' 
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating pending order:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    // Check for duplicate key error (unique constraint violation)
    if (error.code === '23505') {
      return NextResponse.json(
        { 
          error: 'Duplicate order ID', 
          details: 'An order with this orderId already exists'
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create pending order', 
        details: error.message,
        errorName: error.name
      },
      { status: 500 }
    );
  }
}
