import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { placeOrder } from "@/lib/supplier";

export const dynamic = "force-dynamic";

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

// Agent sells a bundle to their own customer (paid outside the platform - cash,
// momo transfer directly to the agent). Deducts the agent's DISCOUNTED reseller
// cost from their wallet immediately, then fulfills via the supplier API.
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { bundleId, beneficiaryNumber, customerPrice } = await req.json();
  if (!bundleId || !beneficiaryNumber || !customerPrice) {
    return NextResponse.json({ error: "Bundle, recipient number, and price charged are required." }, { status: 400 });
  }
  if (!isValidGhanaNumber(beneficiaryNumber)) {
    return NextResponse.json({ error: "Enter a valid 10-digit Ghana number." }, { status: 400 });
  }

  const profile = await prisma.agentProfile.findUnique({ where: { userId: session.userId } });
  if (!profile || profile.status !== "APPROVED") {
    return NextResponse.json({ error: "You need an approved agent account first." }, { status: 403 });
  }

  const bundle = await prisma.dataBundle.findUnique({ where: { id: bundleId } });
  if (!bundle || !bundle.active) {
    return NextResponse.json({ error: "That bundle is not available." }, { status: 404 });
  }

  const resellerCost = Math.round(bundle.sellingPrice * (1 - profile.discountPercent / 100) * 100) / 100;
  if (profile.walletBalance < resellerCost) {
    return NextResponse.json(
      { error: `Insufficient wallet balance. This bundle costs GH₵ ${resellerCost.toFixed(2)} at your reseller rate.` },
      { status: 402 }
    );
  }

  const customerPriceNum = Number(customerPrice);
  const profit = Math.round((customerPriceNum - resellerCost) * 100) / 100;

  // Deduct up front and create the sale record as PROCESSING before calling the
  // supplier, so wallet accounting stays consistent even if fulfillment fails.
  const sale = await prisma.$transaction(async (tx: any) => {
    await tx.agentProfile.update({
      where: { id: profile.id },
      data: { walletBalance: { decrement: resellerCost } },
    });
    await tx.agentTransaction.create({
      data: { agentId: profile.id, type: "SALE", amount: -resellerCost, description: `${bundle.dataSizeGb}GB ${bundle.network.toUpperCase()} sale` },
    });
    return tx.agentSale.create({
      data: {
        agentId: profile.id,
        bundleId: bundle.id,
        beneficiaryNumber,
        resellerCost,
        customerPrice: customerPriceNum,
        profit,
        status: "PROCESSING",
      },
    });
  });

  try {
    const result = await placeOrder({
      network: bundle.network as any,
      beneficiary: beneficiaryNumber,
      packageId: Number(bundle.supplierPackageId),
    });
    const updated = await prisma.agentSale.update({
      where: { id: sale.id },
      data: { status: "DELIVERED", supplierOrderId: String(result.orderId) },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    // Fulfillment failed after wallet was already debited - refund the wallet
    // automatically since the agent didn't actually receive the bundle.
    await prisma.$transaction([
      prisma.agentProfile.update({ where: { id: profile.id }, data: { walletBalance: { increment: resellerCost } } }),
      prisma.agentSale.update({ where: { id: sale.id }, data: { status: "FAILED", failureReason: err.message } }),
      prisma.agentTransaction.create({
        data: { agentId: profile.id, type: "SALE", amount: resellerCost, description: "Refund - fulfillment failed" },
      }),
    ]);
    return NextResponse.json({ error: `Fulfillment failed, wallet refunded: ${err.message}` }, { status: 502 });
  }
}
