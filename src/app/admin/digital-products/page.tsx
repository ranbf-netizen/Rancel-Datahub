
"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, Pencil } from "lucide-react";

type Product = {
  id: string;
  title: string;
  category?: string;
  price: number;
  active: boolean;
  productType: string;
  stock: number | null;
  platform?: string | null;
};

const PLATFORMS = [
  "Instagram",
  "TikTok",
  "Facebook",
  "YouTube",
  "Telegram",
  "X",
];

const EMPTY = {
  title: "",
  description: "",
  instructions: "",
  category: "",
  price: "",
  stock: "",
  coverUrl: "",
  productType: "DIGITAL",
  featured: "",
  instantDelivery: "",

  // digital
  deliveryType: "DOWNLOAD",
  fileUrl: "",
  revealContent: "",
  gmailLabel: "",
  gmailAddress: "",
  gmailRevealSeconds: 60,

  // boosting
  platform: "Instagram",
  quantity: "",
  deliveryEstimate: "",
  requirements: "",
  smmServiceId: "",
  smmQuantity: "",

  // Batch A
  deliveryMethods: "DIGITAL",
  requireWhatsapp: "",
  optionsJson: "",
};

export default function AdminDigitalProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load a product's values into the form for editing.
  function startEdit(p: any) {
    setEditingId(p.id);
    setForm({
      ...EMPTY,
      title: p.title ?? "",
      description: p.description ?? "",
      instructions: p.instructions ?? "",
      category: p.category ?? "",
      price: p.price != null ? String(p.price) : "",
      stock: p.stock != null ? String(p.stock) : "",
      coverUrl: p.coverUrl ?? "",
      productType: p.productType ?? "DIGITAL",
      deliveryType: p.deliveryType ?? "DOWNLOAD",
      fileUrl: p.fileUrl ?? "",
      revealContent: p.revealContent ?? "",
      platform: p.platform ?? "Instagram",
      quantity: p.quantity ?? "",
      deliveryEstimate: p.deliveryEstimate ?? "",
      requirements: p.requirements ?? "",
      smmServiceId: p.smmServiceId != null ? String(p.smmServiceId) : "",
      smmQuantity: p.smmQuantity != null ? String(p.smmQuantity) : "",
      deliveryMethods: p.deliveryMethods ?? "DIGITAL",
      requireWhatsapp: p.requireWhatsapp ? "1" : "",
      optionsJson: p.optionsJson ?? "",
      featured: p.featured ? "1" : "",
      instantDelivery: p.instantDelivery ? "1" : "",
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...EMPTY });
    setError("");
  }
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [smm, setSmm] = useState<{
    markupPct: number;
    usdToGhs: number;
  } | null>(null);
  const [smmMsg, setSmmMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/smm-settings")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setSmm({
            markupPct: d.markupPct,
            usdToGhs: d.usdToGhs,
          });
        }
      })
      .catch(() => {});
  }, []);

  async function saveSmm() {
    if (!smm) return;

    setSmmMsg("");

    const res = await fetch("/api/admin/smm-settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(smm),
    });

    if (res.ok) {
      setSmmMsg("Saved.");
    } else {
      setSmmMsg("Could not save.");
    }
  }

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({
      ...f,
      [k]: v,
    }));
  }

  function load() {
    fetch("/api/admin/digital-products")
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : []));
  }

  useEffect(load, []);

  async function handleImage(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Image upload failed.");
      } else {
        set("coverUrl", data.url);
      }
    } catch {
      setError("Image upload failed.");
    }

    setUploading(false);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setAdding(true);

    const res = await fetch("/api/admin/digital-products", {
      method: editingId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
    });

    const data = await res.json();

    setAdding(false);

    if (!res.ok) {
      setError(data.error || (editingId ? "Could not save." : "Could not add."));
      return;
    }

    setEditingId(null);
    setForm({ ...EMPTY });
    load();
  }

  async function patch(
    id: string,
    body: Record<string, unknown>
  ) {
    await fetch("/api/admin/digital-products", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        ...body,
      }),
    });

    load();
  }

  async function remove(id: string) {
    if (
      !confirm(
        "Delete this product? Products that have been bought will be hidden instead of erased, to keep your sales records."
      )
    ) {
      return;
    }

    const res = await fetch("/api/admin/digital-products", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Could not delete.");
      return;
    }

    if (data.softDeleted) {
      alert(
        "This product had purchases, so it was hidden from the shop instead of deleted (to keep your sales records)."
      );
    }

    load();
  }

  const isBoosting = form.productType === "BOOSTING";

  return (
    <div>
      <h1 className="text-2xl font-bold">Shop Products</h1>

      <p className="mt-1 text-sm text-slate">
        Add digital products and social media boosting services.
        Leave stock blank for unlimited.
      </p>

      {/* Boosting pricing settings */}
      {smm && (
        <div className="card mt-4 max-w-xl">
          <p className="text-sm font-semibold">
            Boosting pricing
          </p>

          <p className="mt-0.5 text-xs text-slate">
            Applied to all services pulled from the SMM panel.
            Price = panel USD rate × rate × (1 + markup%).
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="label">Markup %</label>

              <input
                className="field"
                type="number"
                value={smm.markupPct}
                onChange={(e) =>
                  setSmm({
                    ...smm,
                    markupPct: Number(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <label className="label">USD → GHS rate</label>

              <input
                className="field"
                type="number"
                value={smm.usdToGhs}
                onChange={(e) =>
                  setSmm({
                    ...smm,
                    usdToGhs: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <button
            type="button"
            onClick={saveSmm}
            className="btn-secondary mt-3 !py-1.5 !text-sm"
          >
            Save pricing
          </button>

          {smmMsg && (
            <span className="ml-2 text-xs text-primary">
              {smmMsg}
            </span>
          )}
        </div>
      )}

      <form
        onSubmit={add}
        className="card mt-6 max-w-xl space-y-3"
      >
        <div>
          <label className="label">Product type</label>

          <select
            className="field"
            value={form.productType}
            onChange={(e) =>
              set("productType", e.target.value)
            }
          >
            <option value="DIGITAL">Digital Product</option>
            <option value="BOOSTING">
              Social Media Boosting
            </option>
          </select>
        </div>

        <input
          className="field"
          placeholder="Title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />

        <textarea
          className="field"
          rows={2}
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            set("description", e.target.value)
          }
        />

        <textarea
          className="field"
          rows={2}
          placeholder="Instructions (shown on product page before buying)"
          value={form.instructions}
          onChange={(e) =>
            set("instructions", e.target.value)
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            className="field"
            placeholder="Category (optional)"
            value={form.category}
            onChange={(e) =>
              set("category", e.target.value)
            }
          />

          <input
            className="field"
            type="number"
            step="0.01"
            placeholder="Price (GH₵)"
            value={form.price}
            onChange={(e) =>
              set("price", e.target.value)
            }
            required
          />
        </div>

        <input
          className="field"
          type="number"
          placeholder="Stock (leave blank = unlimited)"
          value={form.stock}
          onChange={(e) => set("stock", e.target.value)}
        />

        {isBoosting ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <select
                className="field"
                value={form.platform}
                onChange={(e) =>
                  set("platform", e.target.value)
                }
              >
                {PLATFORMS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>

              <input
                className="field"
                placeholder="Quantity (e.g. 1000 followers)"
                value={form.quantity}
                onChange={(e) =>
                  set("quantity", e.target.value)
                }
              />
            </div>

            <input
              className="field"
              placeholder="Delivery estimate (e.g. 24-48 hours)"
              value={form.deliveryEstimate}
              onChange={(e) =>
                set("deliveryEstimate", e.target.value)
              }
            />

            <textarea
              className="field"
              rows={2}
              placeholder="Requirements (e.g. account must be public)"
              value={form.requirements}
              onChange={(e) =>
                set("requirements", e.target.value)
              }
            />

            <div className="rounded-lg bg-mist p-3">
              <p className="text-xs font-medium text-ink">
                Auto-fulfilment (optional)
              </p>

              <p className="mt-0.5 text-xs text-slate">
                Fill these to place orders automatically via
                the SMM panel. Leave blank to fulfil manually.
              </p>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <input
                  className="field"
                  type="number"
                  placeholder="SMM service ID"
                  value={form.smmServiceId}
                  onChange={(e) =>
                    set("smmServiceId", e.target.value)
                  }
                />

                <input
                  className="field"
                  type="number"
                  placeholder="Quantity to order"
                  value={form.smmQuantity}
                  onChange={(e) =>
                    set("smmQuantity", e.target.value)
                  }
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <select
              className="field"
              value={form.deliveryType}
              onChange={(e) =>
                set("deliveryType", e.target.value)
              }
            >
              <option value="DOWNLOAD">
                Download Now (a file)
              </option>

              <option value="LINK">
                Open Link (e.g. Coursera, Drive)
              </option>

              <option value="REVEAL">
                Reveal Now (text/code you type)
              </option>

              <option value="MANUAL">
                Manual delivery (you fulfil by hand)
              </option>

              <option value="GMAIL_LATEST">
                Reveal Latest Gmail Email (timed, live)
              </option>
            </select>

            {form.deliveryType === "REVEAL" ? (
              <textarea
                className="field"
                rows={3}
                placeholder="Text shown to the buyer after payment"
                value={form.revealContent}
                onChange={(e) =>
                  set("revealContent", e.target.value)
                }
                required
              />
            ) : form.deliveryType === "GMAIL_LATEST" ? (
              <div className="space-y-3 rounded-lg bg-mist p-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    Gmail auto-delivery settings
                  </p>

                  <p className="mt-1 text-xs text-slate">
                    After payment, the customer will be shown
                    this Gmail address and asked to request
                    their sign-in code. The system will then
                    check for a newly received code.
                  </p>
                </div>

                <div>
                  <label className="label">
                    Customer Gmail address
                  </label>

                  <input
                    className="field"
                    type="email"
                    placeholder="example@gmail.com"
                    value={form.gmailAddress}
                    onChange={(e) =>
                      set("gmailAddress", e.target.value)
                    }
                    required
                  />

                  <p className="mt-1 text-[11px] text-slate">
                    This is the Gmail address the customer
                    should use when requesting the sign-in
                    code.
                  </p>
                </div>

                <div>
                  <label className="label">
                    Gmail label
                  </label>

                  <input
                    className="field"
                    placeholder="Gmail label (e.g. to-share)"
                    value={form.gmailLabel}
                    onChange={(e) =>
                      set("gmailLabel", e.target.value)
                    }
                  />

                  <p className="mt-1 text-[11px] text-slate">
                    Leave blank to check the normal Gmail
                    inbox.
                  </p>
                </div>

                <div>
                  <label className="label">
                    Seconds visible
                  </label>

                  <input
                    className="field"
                    type="number"
                    min={5}
                    placeholder="60"
                    value={form.gmailRevealSeconds}
                    onChange={(e) =>
                      set(
                        "gmailRevealSeconds",
                        e.target.value
                      )
                    }
                  />

                  <p className="mt-1 text-[11px] text-slate">
                    How long the detected code remains visible
                    to the customer.
                  </p>
                </div>
              </div>
            ) : form.deliveryType === "MANUAL" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-900">
                  Manual fulfilment
                </p>

                <p className="mt-1 text-xs text-amber-800">
                  Payment will be completed first. You will
                  fulfil the order manually after receiving it.
                </p>
              </div>
            ) : (
              <input
                className="field"
                placeholder={
                  form.deliveryType === "LINK"
                    ? "Access link (https://…)"
                    : "File download link (https://…)"
                }
                value={form.fileUrl}
                onChange={(e) =>
                  set("fileUrl", e.target.value)
                }
                required
              />
            )}
          </>
        )}

        <div>
          <label className="label">
            Product image (optional)
          </label>

          <div className="flex items-center gap-3">
            <label className="btn-secondary inline-flex cursor-pointer items-center gap-2 !py-1.5 !text-sm">
              {uploading ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : null}

              {uploading
                ? "Uploading…"
                : "Upload image"}

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImage}
                disabled={uploading}
              />
            </label>

            {form.coverUrl && (
              <img
                src={form.coverUrl}
                alt="cover"
                className="h-12 w-12 rounded object-cover"
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.featured === "1"}
              onChange={(e) =>
                set(
                  "featured",
                  e.target.checked ? "1" : ""
                )
              }
            />

            Featured (show in Top picks)
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.instantDelivery === "1"}
              disabled={form.deliveryType === "MANUAL"}
              onChange={(e) =>
                set(
                  "instantDelivery",
                  e.target.checked ? "1" : ""
                )
              }
            />

            Instant delivery
          </label>
        </div>

        {/* Delivery methods */}
        <div className="rounded-lg bg-mist p-3">
          <p className="text-xs font-medium text-ink">
            Delivery methods (customer choice)
          </p>

          <div className="mt-2 flex flex-wrap gap-4">
            {["DIGITAL", "ACTIVATION"].map((m) => {
              const list = form.deliveryMethods
                .split(",")
                .filter(Boolean);

              const on = list.includes(m);

              return (
                <label
                  key={m}
                  className="inline-flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const next = new Set(list);

                      if (on) {
                        next.delete(m);
                      } else {
                        next.add(m);
                      }

                      if (next.size === 0) {
                        next.add("DIGITAL");
                      }

                      set(
                        "deliveryMethods",
                        Array.from(next).join(",")
                      );
                    }}
                  />

                  {m === "ACTIVATION"
                    ? "Activation (you fulfil manually)"
                    : "Digital delivery"}
                </label>
              );
            })}
          </div>
        </div>

        {/* Require WhatsApp */}
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.requireWhatsapp === "1"}
            onChange={(e) =>
              set(
                "requireWhatsapp",
                e.target.checked ? "1" : ""
              )
            }
          />

          Require WhatsApp number at checkout
        </label>

        {/* Options / packages */}
        <div className="rounded-lg bg-mist p-3">
          <p className="text-xs font-medium text-ink">
            Options / packages (optional)
          </p>

          <p className="mt-0.5 text-xs text-slate">
            Add packages with their own prices. The base price
            shows on the card; the customer picks a package at
            checkout.
          </p>

          <OptionsEditor
            value={form.optionsJson}
            onChange={(v) => set("optionsJson", v)}
          />
        </div>

        {error && (
          <p className="text-sm text-ghRed">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary inline-flex items-center gap-2"
          disabled={adding}
        >
          {adding && (
            <Loader2
              size={16}
              className="animate-spin"
            />
          )}

          {adding ? (editingId ? "Saving…" : "Adding…") : (editingId ? "Save changes" : "Add Product")}
        </button>
        {editingId && (
          <button type="button" onClick={cancelEdit} className="btn-secondary ml-2 !py-2 !text-sm">
            Cancel edit
          </button>
        )}
      </form>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
              <th className="py-2">Title</th>
              <th>Type</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => (
              <tr
                key={p.id}
                className="border-b border-ink/5"
              >
                <td className="py-2">
                  {p.title}

                  {p.platform ? (
                    <span className="text-slate">
                      {" "}
                      · {p.platform}
                    </span>
                  ) : (
                    ""
                  )}
                </td>

                <td className="text-slate">
                  {p.productType === "BOOSTING"
                    ? "Boosting"
                    : "Digital"}
                </td>

                <td>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={p.price}
                    className="field !w-24"
                    onBlur={(e) =>
                      patch(p.id, {
                        price: Number(e.target.value),
                      })
                    }
                  />
                </td>

                <td>
                  <input
                    type="number"
                    defaultValue={p.stock ?? ""}
                    placeholder="∞"
                    className={`field !w-20 ${
                      p.stock !== null && p.stock <= 5
                        ? "!border-ghRed"
                        : ""
                    }`}
                    onBlur={(e) =>
                      patch(p.id, {
                        stock: e.target.value,
                      })
                    }
                  />

                  {p.stock !== null &&
                    p.stock <= 5 && (
                      <span className="ml-1 text-[10px] font-semibold text-ghRed">
                        {p.stock <= 0 ? "OUT" : "LOW"}
                      </span>
                    )}
                </td>

                <td>
                  <input
                    type="checkbox"
                    checked={p.active}
                    onChange={() =>
                      patch(p.id, {
                        active: !p.active,
                      })
                    }
                  />
                </td>

                <td>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="inline-flex items-center gap-1 rounded-md border border-ink/15 px-2 py-1 text-xs hover:bg-mist"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-ghRed/30 px-2 py-1 text-xs text-ghRed hover:bg-ghRed/5"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {products.length === 0 && (
        <p className="mt-6 text-sm text-slate">
          No products yet — add one above.
        </p>
      )}
    </div>
  );
}

/**
 * Product options/packages editor.
 *
 * Stored as:
 * [
 *   { "name": "1 Month", "price": 30 },
 *   { "name": "3 Months", "price": 75 },
 *   { "name": "1 Year", "price": 200 }
 * ]
 */
function OptionsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  type Option = {
    name: string;
    price: string;
  };

  const [options, setOptions] = useState<Option[]>([]);

  useEffect(() => {
    try {
      const parsed = value ? JSON.parse(value) : [];

      if (Array.isArray(parsed)) {
        setOptions(
          parsed.map((o: any) => ({
            name: String(o?.name ?? ""),
            price: String(o?.price ?? ""),
          }))
        );
      } else {
        setOptions([]);
      }
    } catch {
      setOptions([]);
    }
  }, [value]);

  function saveOptions(next: Option[]) {
    setOptions(next);

    const clean = next.filter(
      (option) =>
        option.name.trim() !== "" ||
        option.price.trim() !== ""
    );

    if (clean.length === 0) {
      onChange("");
      return;
    }

    onChange(
      JSON.stringify(
        clean.map((option) => ({
          name: option.name,
          price: Number(option.price) || 0,
        }))
      )
    );
  }

  function addPackage() {
    const next = [
      ...options,
      {
        name: "",
        price: "",
      },
    ];

    setOptions(next);
    onChange(JSON.stringify(next));
  }

  function updateName(index: number, name: string) {
    const next = [...options];

    next[index] = {
      ...next[index],
      name,
    };

    saveOptions(next);
  }

  function updatePrice(index: number, price: string) {
    const next = [...options];

    next[index] = {
      ...next[index],
      price,
    };

    saveOptions(next);
  }

  function removePackage(index: number) {
    const next = options.filter(
      (_, i) => i !== index
    );

    saveOptions(next);
  }

  return (
    <div className="mt-2 space-y-2">
      {options.map((option, index) => (
        <div
          key={index}
          className="flex items-center gap-2"
        >
          <input
            className="field flex-1"
            placeholder="Package name (e.g. 1 Month)"
            value={option.name}
            onChange={(e) =>
              updateName(index, e.target.value)
            }
          />

          <input
            className="field !w-28"
            type="number"
            min="0"
            step="0.01"
            placeholder="Price"
            value={option.price}
            onChange={(e) =>
              updatePrice(index, e.target.value)
            }
          />

          <button
            type="button"
            onClick={() => removePackage(index)}
            className="rounded-md border border-ghRed/30 px-2 py-2 text-xs text-ghRed hover:bg-ghRed/5"
            title="Remove package"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addPackage}
        className="text-xs font-medium text-primary hover:underline"
      >
        + Add package
      </button>
    </div>
  );
}
