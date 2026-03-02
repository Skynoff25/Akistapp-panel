import CouponClient from "@/components/coupons/coupon-client";

export default function StoreCouponsPage({ params }: { params: { storeId: string } }) {
  return <CouponClient storeId={params.storeId} />;
}
