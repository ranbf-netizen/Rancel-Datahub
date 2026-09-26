import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function admin() {
  const s = getSession();
  return s && s.role === "ADMIN" ? s : null;
}

const DELIVERY_TYPES = [
  "DOWNLOAD",
  "LINK",
  "REVEAL",
  "GMAIL_LATEST",
  "MANUAL",
];

function cleanOptionsJson(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return null;

    const options = parsed
      .map((option: any) => ({
        name: String(option?.name ?? "").trim(),
        price: Number(option?.price ?? 0),
      }))
      .filter(
        (option) =>
          option.name !== "" &&
          Number.isFinite(option.price) &&
          option.price >= 0
      );

    return options.length > 0 ? JSON.stringify(options) : null;
  } catch {
    return null;
  }
}

export async function GET() {
  if (!admin()) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const products = await prisma.digitalProduct.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  if (!admin()) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  try {
    const body = await req.json();

    const {
      title,
      description,
      instructions, accessNote,
      category,
      price,
      fileUrl,
      coverUrl,
      deliveryType,
      revealContent,
      gmailLabel,
gmailAddress,
gmailRevealSeconds,
      productType,
      stock,
      platform,
      quantity,
      deliveryEstimate,
      requirements,
      featured,
      instantDelivery,
      smmServiceId,
      smmQuantity,
      optionsJson,
      deliveryMethods,
      requireWhatsapp,
    } = body;

    if (!title || price === undefined || price === null || price === "") {
      return NextResponse.json(
        { error: "Title and price are required." },
        { status: 400 }
      );
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return NextResponse.json(
        { error: "Price must be a valid positive number." },
        { status: 400 }
      );
    }

    const pType = productType === "BOOSTING" ? "BOOSTING" : "DIGITAL";

    // Validate options/packages.
    const cleanedOptions = cleanOptionsJson(optionsJson);

    // Validate delivery methods.
    const validDeliveryMethods = ["DIGITAL", "ACTIVATION"];

    const methods =
      typeof deliveryMethods === "string"
        ? deliveryMethods
            .split(",")
            .map((m: string) => m.trim())
            .filter((m: string) => validDeliveryMethods.includes(m))
        : [];

    const finalDeliveryMethods =
      methods.length > 0 ? Array.from(new Set(methods)).join(",") : "DIGITAL";

    // Validation depends on product type.
    if (pType === "BOOSTING") {
      if (!platform) {
        return NextResponse.json(
          { error: "Platform is required for a boosting product." },
          { status: 400 }
        );
      }
    } else {
      const type = DELIVERY_TYPES.includes(deliveryType)
        ? deliveryType
        : "DOWNLOAD";

      if (type === "REVEAL" && !revealContent) {
        return NextResponse.json(
          {
            error:
              "Reveal content is required for a 'Reveal' product.",
          },
          { status: 400 }
        );
      }

      if (
        type !== "REVEAL" &&
        type !== "GMAIL_LATEST" &&
        type !== "MANUAL" &&
        !fileUrl
      ) {
        return NextResponse.json(
          {
            error:
              "A file/link URL is required for Download and Link products.",
          },
          { status: 400 }
        );
      }
    }

    const stockVal =
      stock === "" || stock === undefined || stock === null
        ? null
        : Number(stock);

    if (stockVal !== null && (!Number.isFinite(stockVal) || stockVal < 0)) {
      return NextResponse.json(
        { error: "Stock must be a valid number." },
        { status: 400 }
      );
    }

    const product = await prisma.digitalProduct.create({
      data: {
        title: String(title).trim(),

        description: description || null,
        instructions: instructions || null,
      accessNote: accessNote || null,
        category: category || null,

        price: numericPrice,

        productType: pType,

        stock: stockVal,

        coverUrl: coverUrl || null,

        // Product options/packages.
        // Example:
        // [
        //   { "name": "1 Month", "price": 30 },
        //   { "name": "3 Months", "price": 75 },
        //   { "name": "1 Year", "price": 200 }
        // ]
        optionsJson: cleanedOptions,

        deliveryMethods: finalDeliveryMethods,

        requireWhatsapp: !!requireWhatsapp,

        featured: !!featured,

        // Manual products should not accidentally be marked
        // as instant delivery.
        instantDelivery:
          deliveryType === "MANUAL" ? false : !!instantDelivery,

        // Digital-only fields
        fileUrl: pType === "DIGITAL" ? fileUrl || "" : "",

        deliveryType:
          pType === "DIGITAL"
            ? DELIVERY_TYPES.includes(deliveryType)
              ? deliveryType
              : "DOWNLOAD"
            : "DOWNLOAD",

        revealContent:
          pType === "DIGITAL" && deliveryType === "REVEAL"
            ? revealContent
            : null,

        gmailLabel:
  pType === "DIGITAL" && deliveryType === "GMAIL_LATEST"
    ? gmailLabel || null
    : null,

gmailAddress:
  pType === "DIGITAL" && deliveryType === "GMAIL_LATEST"
    ? gmailAddress?.trim() || null
    : null,

gmailRevealSeconds:
          pType === "DIGITAL" &&
          deliveryType === "GMAIL_LATEST" &&
          gmailRevealSeconds
            ? Number(gmailRevealSeconds)
            : 60,

        // Boosting-only fields
        platform: pType === "BOOSTING" ? platform : null,

        quantity:
          pType === "BOOSTING" ? quantity || null : null,

        deliveryEstimate:
          pType === "BOOSTING"
            ? deliveryEstimate || null
            : null,

        requirements:
          pType === "BOOSTING"
            ? requirements || null
            : null,

        smmServiceId:
          pType === "BOOSTING" && smmServiceId
            ? Number(smmServiceId)
            : null,

        smmQuantity:
          pType === "BOOSTING" && smmQuantity
            ? Number(smmQuantity)
            : null,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Create digital product error:", error);

    return NextResponse.json(
      { error: "Could not create product." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!admin()) {
    return NextResponse.json(
      { error: "Admin only." },
      { status: 403 }
    );
  }

  try {
    const { id, ...fields } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required." },
        { status: 400 }
      );
    }

    const data: any = {};

    const stringFields = [
      "title",
      "description",
      "instructions",
      "accessNote",
      "category",
      "fileUrl",
      "coverUrl",
      "deliveryType",
      "platform",
      "quantity",
      "deliveryEstimate",
      "requirements",
"revealContent",
"gmailLabel",
"gmailAddress",
"deliveryMethods",
    ];

    stringFields.forEach((key) => {
      if (fields[key] !== undefined) {
        data[key] = fields[key];
      }
    });

    // Product options/packages.
    if (fields.optionsJson !== undefined) {
      data.optionsJson = cleanOptionsJson(fields.optionsJson);
    }

    if (fields.requireWhatsapp !== undefined) {
      data.requireWhatsapp = !!fields.requireWhatsapp;
    }

    if (fields.gmailRevealSeconds !== undefined) {
      data.gmailRevealSeconds =
        fields.gmailRevealSeconds === "" ||
        fields.gmailRevealSeconds === null
          ? 60
          : Number(fields.gmailRevealSeconds);
    }

    if (fields.price !== undefined) {
      const price = Number(fields.price);

      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json(
          { error: "Invalid price." },
          { status: 400 }
        );
      }

      data.price = price;
    }

    if (fields.active !== undefined) {
      data.active = !!fields.active;
    }

    if (fields.featured !== undefined) {
      data.featured = !!fields.featured;
    }

    if (fields.instantDelivery !== undefined) {
      data.instantDelivery = !!fields.instantDelivery;
    }

    // Manual delivery should never be marked as instant.
    if (fields.deliveryType === "MANUAL") {
      data.instantDelivery = false;
    }

    if (fields.stock !== undefined) {
      data.stock =
        fields.stock === "" || fields.stock === null
          ? null
          : Number(fields.stock);
    }

    if (fields.smmServiceId !== undefined) {
      data.smmServiceId =
        fields.smmServiceId === "" ||
        fields.smmServiceId === null
          ? null
          : Number(fields.smmServiceId);
    }

    if (fields.smmQuantity !== undefined) {
      data.smmQuantity =
        fields.smmQuantity === "" ||
        fields.smmQuantity === null
          ? null
          : Number(fields.smmQuantity);
    }

    const product = await prisma.digitalProduct.update({
      where: { id },
      data,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Update digital product error:", error);

    return NextResponse.json(
      { error: "Could not update product." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!admin()) {
    return NextResponse.json(
      { error: "Admin only." },
      { status: 403 }
    );
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required." },
        { status: 400 }
      );
    }

    // Products with purchases can't be hard-deleted because
    // it would break purchase history.
    const purchaseCount = await prisma.digitalPurchase.count({
      where: { productId: id },
    });

    if (purchaseCount > 0) {
      await prisma.digitalProduct.update({
        where: { id },
        data: { active: false },
      });

      return NextResponse.json({
        ok: true,
        softDeleted: true,
      });
    }

    await prisma.digitalProduct.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      softDeleted: false,
    });
  } catch (error) {
    console.error("Delete digital product error:", error);

    return NextResponse.json(
      { error: "Could not delete product." },
      { status: 500 }
    );
  }
}