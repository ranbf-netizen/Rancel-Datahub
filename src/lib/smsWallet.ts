import { prisma } from "@/lib/db";

// Credits a failed/expired SMS order's amount back to the buyer's wallet.
// `refunded` on SmsOrder guards this against running twice for the same
// order, even under concurrent requests (e.g. two status polls landing at
// the same instant right as a rental times out).
//
// Deliberately does NOT touch `status` - the caller sets that themselves
// (order/route.ts sets "FAILED: ..." when a rental fails outright,
// status/route.ts sets "EXPIRED" when the wait window runs out with no
// code) so this function only ever has one job: the money.
export async function refundOrder(orderId: string, userId: string, amount: number, reason: string): Promise<boolean> {
  return prisma.$transaction(async (db) => {
    const claimed = await db.smsOrder.updateMany({
      where: { id: orderId, refunded: false },
      data: { refunded: true },
    });
    if (claimed.count !== 1) return false;

    await db.user.update({ where: { id: userId }, data: { smsWalletBalance: { increment: amount } } });
    await db.smsWalletTransaction.create({
      data: { userId, type: "REFUND", amount, relatedOrderId: orderId, description: reason },
    });
    return true;
  });
}
