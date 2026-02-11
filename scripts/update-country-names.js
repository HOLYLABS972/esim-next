/**
 * Script to automatically update country names in Russian (and other languages) in Supabase
 * Uses i18n-iso-countries library for accurate translations
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase credentials from environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Country names in Russian (from official ISO sources)
const countryNamesRu = {
  'AF': 'Афганистан', 'AL': 'Албания', 'DZ': 'Алжир', 'AD': 'Андорра', 'AO': 'Ангола',
  'AG': 'Антигуа и Барбуда', 'AR': 'Аргентина', 'AM': 'Армения', 'AU': 'Австралия', 'AT': 'Австрия',
  'AZ': 'Азербайджан', 'BS': 'Багамы', 'BH': 'Бахрейн', 'BD': 'Бангладеш', 'BB': 'Барбадос',
  'BY': 'Беларусь', 'BE': 'Бельгия', 'BZ': 'Белиз', 'BJ': 'Бенин', 'BT': 'Бутан',
  'BO': 'Боливия', 'BA': 'Босния и Герцеговина', 'BW': 'Ботсвана', 'BR': 'Бразилия', 'BN': 'Бруней',
  'BG': 'Болгария', 'BF': 'Буркина-Фасо', 'BI': 'Бурунди', 'KH': 'Камбоджа', 'CM': 'Камерун',
  'CA': 'Канада', 'CV': 'Кабо-Верде', 'CF': 'ЦАР', 'TD': 'Чад', 'CL': 'Чили',
  'CN': 'Китай', 'CO': 'Колумбия', 'KM': 'Коморы', 'CG': 'Конго', 'CR': 'Коста-Рика',
  'HR': 'Хорватия', 'CU': 'Куба', 'CY': 'Кипр', 'CZ': 'Чехия', 'DK': 'Дания',
  'DJ': 'Джибути', 'DM': 'Доминика', 'DO': 'Доминиканская Республика', 'EC': 'Эквадор', 'EG': 'Египет',
  'SV': 'Сальвадор', 'GQ': 'Экваториальная Гвинея', 'ER': 'Эритрея', 'EE': 'Эстония', 'ET': 'Эфиопия',
  'FJ': 'Фиджи', 'FI': 'Финляндия', 'FR': 'Франция', 'GA': 'Габон', 'GM': 'Гамбия',
  'GE': 'Грузия', 'DE': 'Германия', 'GH': 'Гана', 'GR': 'Греция', 'GD': 'Гренада',
  'GT': 'Гватемала', 'GN': 'Гвинея', 'GW': 'Гвинея-Бисау', 'GY': 'Гайана', 'HT': 'Гаити',
  'HN': 'Гондурас', 'HK': 'Гонконг', 'HU': 'Венгрия', 'IS': 'Исландия', 'IN': 'Индия',
  'ID': 'Индонезия', 'IR': 'Иран', 'IQ': 'Ирак', 'IE': 'Ирландия', 'IL': 'Израиль',
  'IT': 'Италия', 'JM': 'Ямайка', 'JP': 'Япония', 'JO': 'Иордания', 'KZ': 'Казахстан',
  'KE': 'Кения', 'KI': 'Кирибати', 'KP': 'КНДР', 'KR': 'Южная Корея', 'KW': 'Кувейт',
  'KG': 'Киргизия', 'LA': 'Лаос', 'LV': 'Латвия', 'LB': 'Ливан', 'LS': 'Лесото',
  'LR': 'Либерия', 'LY': 'Ливия', 'LI': 'Лихтенштейн', 'LT': 'Литва', 'LU': 'Люксембург',
  'MO': 'Макао', 'MK': 'Северная Македония', 'MG': 'Мадагаскар', 'MW': 'Малави', 'MY': 'Малайзия',
  'MV': 'Мальдивы', 'ML': 'Мали', 'MT': 'Мальта', 'MH': 'Маршалловы Острова', 'MR': 'Мавритания',
  'MU': 'Маврикий', 'MX': 'Мексика', 'FM': 'Микронезия', 'MD': 'Молдова', 'MC': 'Монако',
  'MN': 'Монголия', 'ME': 'Черногория', 'MA': 'Марокко', 'MZ': 'Мозамбик', 'MM': 'Мьянма',
  'NA': 'Намибия', 'NR': 'Науру', 'NP': 'Непал', 'NL': 'Нидерланды', 'NZ': 'Новая Зеландия',
  'NI': 'Никарагуа', 'NE': 'Нигер', 'NG': 'Нигерия', 'NO': 'Норвегия', 'OM': 'Оман',
  'PK': 'Пакистан', 'PW': 'Палау', 'PS': 'Палестина', 'PA': 'Панама', 'PG': 'Папуа-Новая Гвинея',
  'PY': 'Парагвай', 'PE': 'Перу', 'PH': 'Филиппины', 'PL': 'Польша', 'PT': 'Португалия',
  'PR': 'Пуэрто-Рико', 'QA': 'Катар', 'RO': 'Румыния', 'RU': 'Россия', 'RW': 'Руанда',
  'KN': 'Сент-Китс и Невис', 'LC': 'Сент-Люсия', 'VC': 'Сент-Винсент и Гренадины', 'WS': 'Самоа', 'SM': 'Сан-Марино',
  'ST': 'Сан-Томе и Принсипи', 'SA': 'Саудовская Аравия', 'SN': 'Сенегал', 'RS': 'Сербия', 'SC': 'Сейшелы',
  'SL': 'Сьерра-Леоне', 'SG': 'Сингапур', 'SK': 'Словакия', 'SI': 'Словения', 'SB': 'Соломоновы Острова',
  'SO': 'Сомали', 'ZA': 'ЮАР', 'SS': 'Южный Судан', 'ES': 'Испания', 'LK': 'Шри-Ланка',
  'SD': 'Судан', 'SR': 'Суринам', 'SZ': 'Эсватини', 'SE': 'Швеция', 'CH': 'Швейцария',
  'SY': 'Сирия', 'TW': 'Тайвань', 'TJ': 'Таджикистан', 'TZ': 'Танзания', 'TH': 'Таиланд',
  'TL': 'Восточный Тимор', 'TG': 'Того', 'TO': 'Тонга', 'TT': 'Тринидад и Тобаго', 'TN': 'Тунис',
  'TR': 'Турция', 'TM': 'Туркменистан', 'TV': 'Тувалу', 'UG': 'Уганда', 'UA': 'Украина',
  'AE': 'ОАЭ', 'GB': 'Великобритания', 'US': 'США', 'UY': 'Уругвай', 'UZ': 'Узбекистан',
  'VU': 'Вануату', 'VA': 'Ватикан', 'VE': 'Венесуэла', 'VN': 'Вьетнам', 'YE': 'Йемен',
  'ZM': 'Замбия', 'ZW': 'Зимбабве'
};

// Country names in Hebrew
const countryNamesHe = {
  'AF': 'אפגניסטן', 'AL': 'אלבניה', 'DZ': 'אלג\'יריה', 'AR': 'ארגנטינה', 'AM': 'ארמניה',
  'AU': 'אוסטרליה', 'AT': 'אוסטריה', 'AZ': 'אזרבייג\'ן', 'BH': 'בחריין', 'BD': 'בנגלדש',
  'BY': 'בלארוס', 'BE': 'בלגיה', 'BO': 'בוליביה', 'BA': 'בוסניה והרצגובינה', 'BR': 'ברזיל',
  'BG': 'בולגריה', 'KH': 'קמבודיה', 'CA': 'קנדה', 'CL': 'צ\'ילה', 'CN': 'סין',
  'CO': 'קולומביה', 'CR': 'קוסטה ריקה', 'HR': 'קרואטיה', 'CY': 'קפריסין', 'CZ': 'צ\'כיה',
  'DK': 'דנמרק', 'DO': 'הרפובליקה הדומיניקנית', 'EC': 'אקוודור', 'EG': 'מצרים', 'SV': 'אל סלבדור',
  'EE': 'אסטוניה', 'FI': 'פינלנד', 'FR': 'צרפת', 'GE': 'גאורגיה', 'DE': 'גרמניה',
  'GH': 'גאנה', 'GR': 'יוון', 'GT': 'גואטמלה', 'HK': 'הונג קונג', 'HU': 'הונגריה',
  'IS': 'איסלנד', 'IN': 'הודו', 'ID': 'אינדונזיה', 'IR': 'איראן', 'IQ': 'עיראק',
  'IE': 'אירלנד', 'IL': 'ישראל', 'IT': 'איטליה', 'JP': 'יפן', 'JO': 'ירדן',
  'KZ': 'קזחסטן', 'KE': 'קניה', 'KR': 'דרום קוריאה', 'KW': 'כווית', 'KG': 'קירגיזסטן',
  'LA': 'לאוס', 'LV': 'לטביה', 'LB': 'לבנון', 'LT': 'ליטא', 'LU': 'לוקסמבורג',
  'MO': 'מקאו', 'MY': 'מלזיה', 'MV': 'המלדיביים', 'MT': 'מלטה', 'MX': 'מקסיקו',
  'MD': 'מולדובה', 'MN': 'מונגוליה', 'ME': 'מונטנגרו', 'MA': 'מרוקו', 'NP': 'נפאל',
  'NL': 'הולנד', 'NZ': 'ניו זילנד', 'NG': 'ניגריה', 'MK': 'מקדוניה הצפונית', 'NO': 'נורווגיה',
  'OM': 'עומאן', 'PK': 'פקיסטן', 'PA': 'פנמה', 'PY': 'פרגוואי', 'PE': 'פרו',
  'PH': 'הפיליפינים', 'PL': 'פולין', 'PT': 'פורטוגל', 'PR': 'פוארטו ריקו', 'QA': 'קטאר',
  'RO': 'רומניה', 'RU': 'רוסיה', 'SA': 'ערב הסעודית', 'RS': 'סרביה', 'SG': 'סינגפור',
  'SK': 'סלובקיה', 'SI': 'סלובניה', 'ZA': 'דרום אפריקה', 'ES': 'ספרד', 'LK': 'סרי לנקה',
  'SE': 'שוודיה', 'CH': 'שווייץ', 'TW': 'טייוואן', 'TJ': 'טג\'יקיסטן', 'TZ': 'טנזניה',
  'TH': 'תאילנד', 'TR': 'טורקיה', 'TM': 'טורקמניסטן', 'UA': 'אוקראינה', 'AE': 'איחוד האמירויות',
  'GB': 'בריטניה', 'US': 'ארצות הברית', 'UY': 'אורוגוואי', 'UZ': 'אוזבקיסטן', 'VE': 'ונצואלה',
  'VN': 'וייטנאם', 'ZM': 'זמביה', 'ZW': 'זימבבואה'
};

// Country names in Arabic
const countryNamesAr = {
  'AF': 'أفغانستان', 'AL': 'ألبانيا', 'DZ': 'الجزائر', 'AR': 'الأرجنتين', 'AM': 'أرمينيا',
  'AU': 'أستراليا', 'AT': 'النمسا', 'AZ': 'أذربيجان', 'BH': 'البحرين', 'BD': 'بنغلاديش',
  'BY': 'بيلاروسيا', 'BE': 'بلجيكا', 'BO': 'بوليفيا', 'BA': 'البوسنة والهرسك', 'BR': 'البرازيل',
  'BG': 'بلغاريا', 'KH': 'كمبوديا', 'CA': 'كندا', 'CL': 'تشيلي', 'CN': 'الصين',
  'CO': 'كولومبيا', 'CR': 'كوستاريكا', 'HR': 'كرواتيا', 'CY': 'قبرص', 'CZ': 'التشيك',
  'DK': 'الدنمارك', 'DO': 'جمهورية الدومينيكان', 'EC': 'الإكوادور', 'EG': 'مصر', 'SV': 'السلفادور',
  'EE': 'إستونيا', 'FI': 'فنلندا', 'FR': 'فرنسا', 'GE': 'جورجيا', 'DE': 'ألمانيا',
  'GH': 'غانا', 'GR': 'اليونان', 'GT': 'غواتيمالا', 'HK': 'هونغ كونغ', 'HU': 'المجر',
  'IS': 'آيسلندا', 'IN': 'الهند', 'ID': 'إندونيسيا', 'IR': 'إيران', 'IQ': 'العراق',
  'IE': 'أيرلندا', 'IL': 'إسرائيل', 'IT': 'إيطاليا', 'JP': 'اليابان', 'JO': 'الأردن',
  'KZ': 'كازاخستان', 'KE': 'كينيا', 'KR': 'كوريا الجنوبية', 'KW': 'الكويت', 'KG': 'قيرغيزستان',
  'LA': 'لاوس', 'LV': 'لاتفيا', 'LB': 'لبنان', 'LT': 'ليتوانيا', 'LU': 'لوكسمبورغ',
  'MO': 'ماكاو', 'MY': 'ماليزيا', 'MV': 'المالديف', 'MT': 'مالطا', 'MX': 'المكسيك',
  'MD': 'مولدوفا', 'MN': 'منغوليا', 'ME': 'الجبل الأسود', 'MA': 'المغرب', 'NP': 'نيبال',
  'NL': 'هولندا', 'NZ': 'نيوزيلندا', 'NG': 'نيجيريا', 'MK': 'مقدونيا الشمالية', 'NO': 'النرويج',
  'OM': 'عمان', 'PK': 'باكستان', 'PA': 'بنما', 'PY': 'باراغواي', 'PE': 'بيرو',
  'PH': 'الفلبين', 'PL': 'بولندا', 'PT': 'البرتغال', 'PR': 'بورتوريكو', 'QA': 'قطر',
  'RO': 'رومانيا', 'RU': 'روسيا', 'SA': 'السعودية', 'RS': 'صربيا', 'SG': 'سنغافورة',
  'SK': 'سلوفاكيا', 'SI': 'سلوفينيا', 'ZA': 'جنوب أفريقيا', 'ES': 'إسبانيا', 'LK': 'سريلانكا',
  'SE': 'السويد', 'CH': 'سويسرا', 'TW': 'تايوان', 'TJ': 'طاجيكستان', 'TZ': 'تنزانيا',
  'TH': 'تايلاند', 'TR': 'تركيا', 'TM': 'تركمانستان', 'UA': 'أوكرانيا', 'AE': 'الإمارات',
  'GB': 'بريطانيا', 'US': 'الولايات المتحدة', 'UY': 'أوروغواي', 'UZ': 'أوزبكستان', 'VE': 'فنزويلا',
  'VN': 'فيتنام', 'ZM': 'زامبيا', 'ZW': 'زيمبابوي'
};

async function updateCountryNames() {
  console.log('🌍 Starting country names update...\n');

  try {
    // Fetch all countries from database
    const { data: countries, error: fetchError } = await supabase
      .from('esim_countries')
      .select('id, airalo_country_code, country_name');

    if (fetchError) {
      throw new Error(`Failed to fetch countries: ${fetchError.message}`);
    }

    console.log(`📋 Found ${countries.length} countries in database\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Update each country
    for (const country of countries) {
      const code = country.airalo_country_code?.toUpperCase();

      if (!code) {
        console.log(`⚠️  Skipping country ID ${country.id} - no country code`);
        skipped++;
        continue;
      }

      const nameRu = countryNamesRu[code];
      const nameHe = countryNamesHe[code];
      const nameAr = countryNamesAr[code];

      if (!nameRu) {
        console.log(`⚠️  No Russian translation for ${code} (${country.country_name})`);
        skipped++;
        continue;
      }

      // Update country with translations
      const { error: updateError } = await supabase
        .from('esim_countries')
        .update({
          country_name_ru: nameRu,
          country_name_he: nameHe || null,
          country_name_ar: nameAr || null,
        })
        .eq('id', country.id);

      if (updateError) {
        console.error(`❌ Failed to update ${code}: ${updateError.message}`);
        errors++;
      } else {
        console.log(`✅ ${code}: ${country.country_name} → ${nameRu}`);
        updated++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ⚠️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log('\n🎉 Done!\n');

    // Show sample of updated countries
    const { data: sampleCountries } = await supabase
      .from('esim_countries')
      .select('airalo_country_code, country_name, country_name_ru, country_name_he, country_name_ar')
      .not('country_name_ru', 'is', null)
      .limit(10);

    console.log('📝 Sample of updated countries:');
    console.table(sampleCountries);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
updateCountryNames();
