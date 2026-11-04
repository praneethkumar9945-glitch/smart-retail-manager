import { formatMoney, formatDate } from "@/lib/money";

export type BillDoc = {
  bill_number: string;
  cashier_name: string;
  customer_name: string;
  customer_phone: string;
  subtotal: number;
  discount_total: number;
  gst_total: number;
  total: number;
  payment_method: string;
  notes: string;
  created_at: string;
};

export type BillItemDoc = {
  product_name: string;
  unit_price: number;
  quantity: number;
  discount: number;
  gst_rate: number;
  line_total: number;
};

export type BillSettings = {
  store_name: string;
  store_address: string;
  store_phone: string;
  gst_number: string;
  bill_theme: string;
  accent_color: string;
  bill_footer_note: string;
};

export const DEFAULT_BILL_SETTINGS: BillSettings = {
  store_name: "My Store",
  store_address: "",
  store_phone: "",
  gst_number: "",
  bill_theme: "classic",
  accent_color: "#0f766e",
  bill_footer_note: "Thank you for shopping with us!",
};

type Props = {
  bill: BillDoc;
  items: BillItemDoc[];
  settings: BillSettings;
};

export function BillDocument({ bill, items, settings }: Props) {
  const accent = settings.accent_color || DEFAULT_BILL_SETTINGS.accent_color;
  const theme = settings.bill_theme || "classic";
  const isModern = theme === "modern";
  const isCompact = theme === "compact";

  return (
    <div
      className={
        "mx-auto w-full max-w-sm bg-white text-[13px] leading-snug text-neutral-900 " +
        (isCompact ? "text-[11.5px]" : "")
      }
      style={{
        border: isModern ? "none" : "1.5px solid #d4d4d4",
        borderRadius: isModern ? 0 : 8,
      }}
    >
      {/* Header */}
      <div
        style={isModern ? { background: accent, color: "#fff" } : { borderBottom: "1.5px solid #d4d4d4" }}
        className={"px-5 py-4" + (isCompact ? " py-3" : "")}
      >
        <p
          className={"font-display font-bold" + (isCompact ? " text-base" : " text-lg")}
          style={isModern ? undefined : { color: accent }}
        >
          {settings.store_name || "My Store"}
        </p>
        {settings.store_address ? (
          <p className={"whitespace-pre-line " + (isModern ? "text-white/90" : "text-neutral-600")}>
            {settings.store_address}
          </p>
        ) : null}
        <p className={isModern ? "text-white/90" : "text-neutral-600"}>
          {[settings.store_phone, settings.gst_number ? `GSTIN: ${settings.gst_number}` : ""]
            .filter(Boolean)
            .join("  ·  ")}
        </p>
      </div>

      {/* Meta */}
      <div className={"grid grid-cols-2 gap-1 px-5 py-3" + (isCompact ? " px-4 py-2" : "")}>
        <div>
          <p className="text-neutral-500">Bill No.</p>
          <p className="font-semibold">{bill.bill_number}</p>
        </div>
        <div className="text-right">
          <p className="text-neutral-500">Date</p>
          <p className="font-semibold">{formatDate(bill.created_at)}</p>
        </div>
        {bill.customer_name ? (
          <div>
            <p className="text-neutral-500">Customer</p>
            <p className="font-semibold">
              {bill.customer_name}
              {bill.customer_phone ? ` · ${bill.customer_phone}` : ""}
            </p>
          </div>
        ) : null}
        <div className="text-right">
          <p className="text-neutral-500">Billed by</p>
          <p className="font-semibold">{bill.cashier_name || "—"}</p>
        </div>
      </div>

      {/* Items */}
      <table className="w-full border-collapse">
        <thead>
          <tr
            style={{
              background: isModern ? `${accent}14` : "#f5f5f4",
            }}
          >
            <th className={"px-5 py-1.5 text-left font-semibold" + (isCompact ? " px-4" : "")}>
              Item
            </th>
            <th className="py-1.5 text-right font-semibold">Qty</th>
            <th className="py-1.5 text-right font-semibold">Rate</th>
            {!isCompact ? <th className="py-1.5 text-right font-semibold">GST%</th> : null}
            <th className={"py-1.5 pr-5 text-right font-semibold" + (isCompact ? " pr-4" : "")}>
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-t border-neutral-200">
              <td className={"px-5 py-1.5" + (isCompact ? " px-4" : "")}>
                {it.product_name}
                {it.discount > 0 ? (
                  <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">
                    offer
                  </span>
                ) : null}
              </td>
              <td className="py-1.5 text-right">{it.quantity}</td>
              <td className="py-1.5 text-right">{formatMoney(it.unit_price)}</td>
              {!isCompact ? <td className="py-1.5 text-right">{it.gst_rate}%</td> : null}
              <td className={"py-1.5 pr-5 text-right" + (isCompact ? " pr-4" : "")}>
                {formatMoney(it.line_total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className={"border-t border-neutral-300 px-5 py-3" + (isCompact ? " px-4 py-2" : "")}>
        <Row label="Subtotal" value={formatMoney(bill.subtotal)} />
        {bill.discount_total > 0 ? (
          <Row label="Offer discount" value={`− ${formatMoney(bill.discount_total)}`} highlight />
        ) : null}
        <Row label="GST" value={formatMoney(bill.gst_total)} />
        <div className="mt-1.5 flex items-center justify-between border-t border-neutral-300 pt-2">
          <span className="font-display font-bold" style={{ color: isModern ? accent : undefined }}>
            Total ({bill.payment_method.toUpperCase()})
          </span>
          <span className="font-display text-base font-bold">{formatMoney(bill.total)}</span>
        </div>
      </div>

      {bill.notes ? (
        <div className={"px-5 pb-2 text-neutral-600" + (isCompact ? " px-4" : "")}>
          <p className="text-neutral-500">Notes</p>
          <p>{bill.notes}</p>
        </div>
      ) : null}

      <div
        className="px-5 py-3 text-center"
        style={{
          borderTop: "1px dashed #d4d4d4",
          background: isModern ? `${accent}0d` : undefined,
        }}
      >
        <p className="text-neutral-600">{settings.bill_footer_note}</p>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={highlight ? "font-medium text-amber-700" : "text-neutral-600"}>{label}</span>
      <span className={highlight ? "font-medium text-amber-700" : "font-medium"}>{value}</span>
    </div>
  );
}
