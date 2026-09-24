import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // -----------------------------
    // 1. Read request body
    // -----------------------------
    const body = await req.json();

    const {
      productId,
      email,
      socialLink,
      note,
      whatsapp,
      chosenOption,
      deliveryMethod,
    } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "Product is required." },
        { status: 400 }
      );
    }

    // -----------------------------
    // 2. Get logged-in session
    // -----------------------------
    const session = await getSession();

    // -----------------------------
    // 3. Find product
    // -----------------------------
    const product = await prisma.digitalProduct.findUnique({
      where: { id: productId },
    });

    if (!product || !product.active) {
      return NextResponse.json(
        { error: "Product not available." },
        { status: 404 }
      );
    }

    // -----------------------------
    // 4. Check stock
    // -----------------------------
    if (product.stock !== null && product.stock <= 0) {
      return NextResponse.json(
        { error: "This product is out of stock." },
        { status: 409 }
      );
    }

    // -----------------------------
    // 5. Boosting validation
    // -----------------------------
    if (
      product.productType === "BOOSTING" &&
      product.smmServiceId &&
      !socialLink
    ) {
      return NextResponse.json(
        { error: "Please provide the link to boost." },
        { status: 400 }
      );
    }

    // -----------------------------
    // 6. WhatsApp validation
    // -----------------------------
    if (product.requireWhatsapp && !whatsapp) {
      return NextResponse.json(
        { error: "A WhatsApp number is required for this order." },
        { status: 400 }
      );
    }

    // -----------------------------
    // 7. Determine price
    // -----------------------------
    let amount = Number(product.price);

    if (product.optionsJson) {
      try {
        const opts = JSON.parse(product.optionsJson) as {
          name: string;
          price: number;
        }[];

        const picked = opts.find(
          (option) => option.name === chosenOption
        );

        if (picked) {
          amount = Number(picked.price);
        }
      } catch (err) {
        console.error("Invalid optionsJson:", err);
      }
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid product price." },
        { status: 400 }
      );
    }

    // -----------------------------
    // 8. Determine buyer email
    // -----------------------------
    const buyerEmail =
      email ||
      (session as any)?.email ||
      (session ? `${session.userId}@user.rancel-datahub.com` : null);

    if (!buyerEmail) {
      return NextResponse.json(
        {
          error:
            "Email is required to receive your digital product.",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // 9. Create payment reference
    // -----------------------------
    const reference = `RDH-DIGI-${uuid()}`;

    // -----------------------------
    // 10. Create pending purchase
    // -----------------------------
    await prisma.digitalPurchase.create({
      data: {
        productId: product.id,
        userId: session?.userId ?? null,
        guestEmail: email || null,
        amount,
        paystackReference: reference,
        paymentStatus: "PENDING",
        whatsapp: whatsapp || null,
        chosenOption: chosenOption || null,
        deliveryMethod: deliveryMethod || null,
        socialLink: socialLink || null,
        note: note || null,
      },
    });

    // -----------------------------
    // 11. Initialize Paystack
    // -----------------------------
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      console.error(
        "NEXT_PUBLIC_APP_URL is missing from environment variables."
      );

      return NextResponse.json(
        {
          reference,
          error:
            "Payment configuration is incomplete. Please try again later.",
        },
        { status: 500 }
      );
    }

    const tx = await initializeTransaction({
      email: buyerEmail,
      amountGhs: amount,
      reference,
      callbackUrl: `${appUrl}/downloads?ref=${reference}`,
      metadata: {
        orderType: "digital",
        reference,
        productId: product.id,
      },
    });

    if (!tx?.authorization_url) {
      console.error("Paystack returned no authorization URL:", tx);

      return NextResponse.json(
        {
          reference,
          error: "Paystack did not return a payment URL.",
        },
        { status: 502 }
      );
    }

    
    
    return NextResponse.json({
      reference,
      authorizationUrl: tx.authorization_url,
    });
  } catch (err: any) {
    console.error("DIGITAL PRODUCT BUY ERROR:", err);

    return NextResponse.json(
      {
        error:
          err?.message ||
          "Something went wrong while starting the payment.",
      },
      { status: 500 }
    );
  }
}
