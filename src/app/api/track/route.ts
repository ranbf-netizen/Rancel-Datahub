import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyTransaction } from "@/lib/paystack";
import { fulfillDataOrder, fulfillPinOrder } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

// Public order tracking - no login required.
//
// Looking up by exact REFERENCE reveals full details, including a PIN code if paid -
// this is safe because the reference is an unguessable random string only the buyer
// has (shown at checkout / sent via callback), so knowing it proves you're the buyer.
//
// Looking up by PHONE returns status only (never PIN codes or serials) since phone
// numbers are much easier for someone else to know or guess - showing a PIN there
// would let a stranger who knows your number see/steal it.
export async function POST(req: NextRequest) {
  const { reference, phone } = await req.json();

  if (reference) {
    return lookupByReference(reference.trim());
  }
  if (phone) {
    return lookupByPhone(phone.trim());
  }
  return NextResponse.json({ error: "Enter an order reference or phone number." }, { status: 400 });
}

async function lookupByReference(reference: string) {
  let dataOrder = await prisma.dataOrder.findUnique({
    where: { paystackReference: reference },
    include: { bundle: true },
  });
  let pinOrder = dataOrder
    ? null
    : await prisma.pinOrder.findUnique({ where: { paystackReference: reference }, include: { pin: true } });

  if (!dataOrder && !pinOrder) {
    return NextResponse.json({ error: "No order found with that reference." }, { status: 404 });
  }

  // If it's still pending, actively check with Paystack right now rather than
  // making the person wait on the webhook - same safety net used elsewhere.
  const order = dataOrder || pinOrder!;
  if (order.paymentStatus === "PENDING") {
    try {
      const tx = await verifyTransaction(reference);
      if (tx.status === "success") {
        if (dataOrder) await fulfillDataOrder(reference);
        else await fulfillPinOrder(reference);
        // Re-fetch with the now-updated status.
        if (dataOrder) {
          dataOrder = await prisma.dataOrder.findUnique({ where: { paystackReference: reference }, include: { bundle: true } });
        } else {
          pinOrder = await prisma.pinOrder.findUnique({ where: { paystackReference: reference }, include: { pin: true } });
        }
      } else if (tx.status !== "success") {
        if (dataOrder) await prisma.dataOrder.update({ where: { paystackReference: reference }, data: { paymentStatus: "FAILED" } });
        else await prisma.pinOrder.update({ where: { paystackReference: reference }, data: { paymentStatus: "FAILED" } });
      }
    } catch {
      // Paystack unreachable - just show current (still pending) status, no crash.
    }
  }

  if (dataOrder) {
    return NextResponse.json({
      type: "data",
      reference: dataOrder.paystackReference,
      network: dataOrder.bundle.network,
      dataSizeGb: dataOrder.bundle.dataSizeGb,
      beneficiaryNumber: dataOrder.beneficiaryNumber,
      amount: dataOrder.amount,
      paymentStatus: dataOrder.paymentStatus,
      fulfillmentStatus: dataOrder.fulfillmentStatus,
      createdAt: dataOrder.createdAt,
    });
  }

  return NextResponse.json({
    type: "pin",
    reference: pinOrder!.paystackReference,
    examType: pinOrder!.examType,
    year: pinOrder!.year,
    amount: pinOrder!.amount,
    paymentStatus: pinOrder!.paymentStatus,
    createdAt: pinOrder!.createdAt,
    // Only reveal the actual PIN via exact-reference lookup, and only once paid.
    pin: pinOrder!.paymentStatus === "PAID" && pinOrder!.pin
      ? { serialNumber: pinOrder!.pin.serialNumber, pinCode: pinOrder!.pin.pinCode }
      : null,
  });
}

async function lookupByPhone(phone: string) {
  const [dataOrders, pinOrders] = await Promise.all([
    prisma.dataOrder.findMany({
      where: { OR: [{ beneficiaryNumber: phone }, { user: { phone } }] },
      include: { bundle: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.pinOrder.findMany({
      where: { OR: [{ guestPhone: phone }, { user: { phone } }] },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (dataOrders.length === 0 && pinOrders.length === 0) {
    return NextResponse.json({ error: "No orders found for that phone number." }, { status: 404 });
  }

  return NextResponse.json({
    results: [
      ...dataOrders.map((o: (typeof dataOrders)[number]) => ({
        type: "data" as const,
        reference: o.paystackReference,
        network: o.bundle.network,
        dataSizeGb: o.bundle.dataSizeGb,
        amount: o.amount,
        paymentStatus: o.paymentStatus,
        fulfillmentStatus: o.fulfillmentStatus,
        createdAt: o.createdAt,
      })),
      ...pinOrders.map((o: (typeof pinOrders)[number]) => ({
        type: "pin" as const,
        reference: o.paystackReference,
        examType: o.examType,
        year: o.year,
        amount: o.amount,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
        // Never reveal PIN codes via phone lookup - see note above.
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  });
}
