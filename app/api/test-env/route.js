// Test API route to check environment variables
export async function GET() {
  return Response.json({
    NEXT_PUBLIC_ROAMJET_API_KEY: process.env.NEXT_PUBLIC_ROAMJET_API_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_DISCOUNT_PERCENTAGE: process.env.NEXT_PUBLIC_DISCOUNT_PERCENTAGE,
    NEXT_PUBLIC_MINIMUM_PRICE: process.env.NEXT_PUBLIC_MINIMUM_PRICE,
  });
}
