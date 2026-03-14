import CouponClient from "@/components/coupons/coupon-client";

export default async function StoreCouponsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  return <CouponClient storeId={storeId} />;
}
