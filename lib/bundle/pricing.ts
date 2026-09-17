export type PriceResult = {
  regular: number;
  price: number;
  savings: number;
  savingsPercent: number;
};
const formats = new Map<string, Intl.NumberFormat>();
export function currencyFormatter(currency = "USD") {
  if (!formats.has(currency))
    formats.set(
      currency,
      new Intl.NumberFormat("en", { style: "currency", currency }),
    );
  return formats.get(currency)!;
}
export const currencyDigits = (currency = "USD") =>
  currencyFormatter(currency).resolvedOptions().maximumFractionDigits ?? 2;
export function toMinor(value: number, currency = "USD") {
  if (!Number.isFinite(value) || value <= 0) return 0;
  // Shift the decimal representation before rounding. Multiplication by 100
  // can turn 10.075 into 1007.4999999999999 and lose a cent.
  const [coefficient, exponent = "0"] = String(value).split("e");
  const scaled = Math.round(
    Number(`${coefficient}e${Number(exponent) + currencyDigits(currency)}`),
  );
  if (!Number.isSafeInteger(scaled))
    throw new RangeError("Amount exceeds safe money range");
  return scaled;
}
export const fromMinor = (value: number, currency = "USD") =>
  value / 10 ** currencyDigits(currency);
const quantity = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
export const percentageMinor = (amount: number, rate: number) =>
  Math.round(
    amount *
      (1 - Math.max(0, Math.min(100, Number.isFinite(rate) ? rate : 0)) / 100),
  );
export const fixedDiscountMinor = (amount: number, discount: number) =>
  Math.max(
    0,
    amount - Math.max(0, Math.round(Number.isFinite(discount) ? discount : 0)),
  );
function result(regular: number, price: number, currency: string): PriceResult {
  if (!Number.isSafeInteger(regular) || !Number.isSafeInteger(price))
    throw new RangeError("Amount exceeds safe money range");
  const final = Math.max(0, Math.min(regular, price));
  return {
    regular: fromMinor(regular, currency),
    price: fromMinor(final, currency),
    savings: fromMinor(regular - final, currency),
    savingsPercent: regular
      ? Math.round(((regular - final) / regular) * 100)
      : 0,
  };
}
export function calculateQuantityBreakPrice(
  unitPrice: number,
  count: number,
  percentOff: number,
  currency = "USD",
) {
  const regular = toMinor(unitPrice, currency) * quantity(count);
  return result(regular, percentageMinor(regular, percentOff), currency);
}
export function calculateBuyXGetYPrice(
  unitPrice: number,
  buy: number,
  get: number,
  percentOff: number,
  currency = "USD",
  giftUnitPrice = unitPrice,
) {
  const paid = toMinor(unitPrice, currency) * quantity(buy);
  const gift = toMinor(giftUnitPrice, currency) * quantity(get);
  return result(
    paid + gift,
    paid + percentageMinor(gift, percentOff),
    currency,
  );
}
export function calculateProductBundlePrice(
  prices: number[],
  percentOff: number,
  currency = "USD",
) {
  const regular = prices.reduce(
    (sum, price) => sum + toMinor(price, currency),
    0,
  );
  return result(regular, percentageMinor(regular, percentOff), currency);
}
export function calculateTierPrice(
  unit: number,
  count: number,
  tiers: { minimum: number; percentOff: number }[],
  currency = "USD",
) {
  const tier = [...tiers]
    .filter(
      (t) =>
        Number.isInteger(t.minimum) &&
        t.minimum > 0 &&
        t.minimum <= quantity(count),
    )
    .sort((a, b) => b.minimum - a.minimum)[0];
  return calculateQuantityBreakPrice(
    unit,
    count,
    tier?.percentOff ?? 0,
    currency,
  );
}
