export type PriceResult = {
  regular: number;
  price: number;
  savings: number;
  savingsPercent: number;
};

const nonNegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;
const quantity = (value: number) => Math.max(1, Math.floor(nonNegative(value)));
const discount = (value: number) => Math.min(100, nonNegative(value));
const result = (regular: number, price: number): PriceResult => {
  const safeRegular = nonNegative(regular);
  const safePrice = Math.min(safeRegular, nonNegative(price));
  const savings = safeRegular - safePrice;
  return {
    regular: safeRegular,
    price: safePrice,
    savings,
    savingsPercent: safeRegular ? Math.round((savings / safeRegular) * 100) : 0,
  };
};

export function calculateQuantityBreakPrice(
  unitPrice: number,
  requestedQuantity: number,
  percentOff: number,
): PriceResult {
  const regular = nonNegative(unitPrice) * quantity(requestedQuantity);
  return result(regular, regular * (1 - discount(percentOff) / 100));
}

export function calculateBuyXGetYPrice(
  unitPrice: number,
  buy: number,
  get: number,
  getPercentOff: number,
): PriceResult {
  const safeUnit = nonNegative(unitPrice);
  const buyQuantity = quantity(buy);
  const getQuantity = Math.floor(nonNegative(get));
  const regular = safeUnit * (buyQuantity + getQuantity);
  const price =
    safeUnit * buyQuantity +
    safeUnit * getQuantity * (1 - discount(getPercentOff) / 100);
  return result(regular, price);
}

export function calculateProductBundlePrice(
  productPrices: number[],
  percentOff: number,
): PriceResult {
  const regular = productPrices.reduce(
    (sum, price) => sum + nonNegative(price),
    0,
  );
  return result(regular, regular * (1 - discount(percentOff) / 100));
}
