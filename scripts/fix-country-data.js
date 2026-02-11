/**
 * Script to fix country data for existing eSIM orders
 * This will update orders that have incorrect country information
 */

import connectDB from '../src/database/config.js';
import { Order, Esim } from '../src/database/models.js';

// Country mapping from coverage text
const countryNameMap = {
  'United Arab Emirates': 'AE',
  'Netherlands': 'NL',
  'United States': 'US',
  'United Kingdom': 'GB',
  'Germany': 'DE',
  'France': 'FR',
  'Spain': 'ES',
  'Italy': 'IT',
  'Canada': 'CA',
  'Australia': 'AU',
  'Japan': 'JP',
  'South Korea': 'KR',
  'Singapore': 'SG',
  'Hong Kong': 'HK',
  'Taiwan': 'TW',
  'Thailand': 'TH',
  'Malaysia': 'MY',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'Vietnam': 'VN',
  'India': 'IN',
  'China': 'CN',
  'Brazil': 'BR',
  'Mexico': 'MX',
  'Turkey': 'TR',
  'Russia': 'RU',
  'Ukraine': 'UA',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Hungary': 'HU',
  'Romania': 'RO',
  'Bulgaria': 'BG',
  'Greece': 'GR',
  'Portugal': 'PT',
  'Belgium': 'BE',
  'Austria': 'AT',
  'Switzerland': 'CH',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Ireland': 'IE',
  'Israel': 'IL',
  'South Africa': 'ZA',
  'Egypt': 'EG',
  'Morocco': 'MA',
  'Saudi Arabia': 'SA',
  'Kuwait': 'KW',
  'Qatar': 'QA',
  'Bahrain': 'BH',
  'Oman': 'OM',
  'Jordan': 'JO',
  'Lebanon': 'LB'
};

async function fixCountryData() {
  try {
    await connectDB();
    console.log('🔄 Starting country data fix...');

    // Find orders with simDetails that have coverage information
    const orders = await Order.find({
      'simDetails.manual_installation': { $exists: true }
    });

    console.log(`📊 Found ${orders.length} orders with simDetails`);

    let updatedCount = 0;

    for (const order of orders) {
      try {
        const simDetails = order.simDetails;
        const coverageText = simDetails.manual_installation || simDetails.qrcode_installation || '';
        const coverageMatch = coverageText.match(/<b>Coverage:\s*<\/b>\s*([^<]+)/i);
        
        if (coverageMatch) {
          const countryNameFromCoverage = coverageMatch[1].trim();
          const countryCode = countryNameMap[countryNameFromCoverage];
          
          if (countryCode) {
            console.log(`🌍 Order ${order.orderId}: Found coverage "${countryNameFromCoverage}" -> ${countryCode}`);
            
            // Update the order
            await Order.findByIdAndUpdate(order._id, {
              countryCode: countryCode,
              countryName: countryNameFromCoverage
            });

            // Find and update corresponding eSIM
            const esim = await Esim.findOne({ 
              $or: [
                { 'orderResult.orderId': order.orderId },
                { orderId: order.orderId }
              ]
            });

            if (esim) {
              await Esim.findByIdAndUpdate(esim._id, {
                countryCode: countryCode,
                countryName: countryNameFromCoverage
              });
              console.log(`✅ Updated eSIM ${esim._id} with correct country data`);
            }

            updatedCount++;
          } else {
            console.log(`⚠️ Order ${order.orderId}: Unknown country "${countryNameFromCoverage}"`);
          }
        } else {
          // Debug: show what coverage text we found
          console.log(`🔍 Order ${order.orderId}: No coverage match found in:`, coverageText.substring(0, 200) + '...');
        }
      } catch (error) {
        console.error(`❌ Error processing order ${order.orderId}:`, error.message);
      }
    }

    console.log(`✅ Fixed country data for ${updatedCount} orders`);
  } catch (error) {
    console.error('❌ Error fixing country data:', error);
  }
}

// Run the fix
fixCountryData().then(() => {
  console.log('🎉 Country data fix completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
