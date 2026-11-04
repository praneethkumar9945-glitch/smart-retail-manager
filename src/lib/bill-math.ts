import { round2 } from "@/lib/money";

export type PosProduct = {
  id: string;
  name: string;
  price: number;
  gst_rate: number | null;
  stock: number;
  discount_percent: number | null;
  discount_amount: number | null;
  offer_active: boolean;
  offer_note: string;
  sku: string | null;
  category: string;
};

export type CartLine = { product: PosProduct; quantity: number };

export type LineMath = {
  listTotal: number;
  discount: number;
  effectiveUnit: number;
  gstRate: number;
  gst: number;
  lineTotal: number;
};

/** Mirrors the create_bill SQL exactly so the POS preview matches the saved bill. */
export function computeLine(
  line: { product: PosProduct; quantity: number },
  defaultGstRate: number,
): LineMath {
  const qty = line.quantity;
  const listTotal = round2(line.product.price * qty);
  let effectiveUnit = line.product.price;
  let discount = 0;

  if (line.product.offer_active) {
    if (line.product.discount_percent != null) {
      const unitDisc = round2((effectiveUnit * line.product.discount_percent) / 100);
      discount = round2(unitDisc * qty);
      effectiveUnit = round2(effectiveUnit - unitDisc);
    } else if (line.product.discount_amount != null) {
      const unitDisc = Math.min(line.product.discount_amount, effectiveUnit);
      discount = round2(unitDisc * qty);
      effectiveUnit = round2(effectiveUnit - unitDisc);
    }
  }

  const gstRate = line.product.gst_rate ?? defaultGstRate;
  const base = round2(effectiveUnit * qty);
  const gst = round2((base * gstRate) / 100);
  return { listTotal, discount, effectiveUnit, gstRate, gst, lineTotal: round2(base + gst) };
}

export function computeTotals(lines: CartLine[], defaultGstRate: number) {
  let subtotal = 0;
  let discountTotal = 0;
  let gstTotal = 0;
  for (const line of lines) {
    const m = computeLine(line, defaultGstRate);
    subtotal += m.listTotal;
    discountTotal += m.discount;
    gstTotal += m.gst;
  }
  subtotal = round2(subtotal);
  discountTotal = round2(discountTotal);
  gstTotal = round2(gstTotal);
  return {
    subtotal,
    discountTotal,
    gstTotal,
    total: round2(subtotal - discountTotal + gstTotal),
  };
}
