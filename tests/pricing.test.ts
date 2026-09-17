import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBuyXGetYPrice,
  calculateProductBundlePrice,
  calculateQuantityBreakPrice,
} from "../lib/bundle/pricing";

test("quantity break tiers", () => {
  assert.deepEqual(calculateQuantityBreakPrice(10, 1, 0), {
    regular: 10,
    price: 10,
    savings: 0,
    savingsPercent: 0,
  });
  assert.deepEqual(calculateQuantityBreakPrice(10, 2, 10), {
    regular: 20,
    price: 18,
    savings: 2,
    savingsPercent: 10,
  });
  assert.deepEqual(calculateQuantityBreakPrice(10, 3, 15), {
    regular: 30,
    price: 25.5,
    savings: 4.5,
    savingsPercent: 15,
  });
});

test("buy X get Y offers", () => {
  assert.deepEqual(calculateBuyXGetYPrice(10, 1, 1, 100), {
    regular: 20,
    price: 10,
    savings: 10,
    savingsPercent: 50,
  });
  assert.deepEqual(calculateBuyXGetYPrice(10, 2, 1, 50), {
    regular: 30,
    price: 25,
    savings: 5,
    savingsPercent: 17,
  });
  assert.deepEqual(calculateBuyXGetYPrice(10, 2, 3, 100), {
    regular: 50,
    price: 20,
    savings: 30,
    savingsPercent: 60,
  });
});

test("product bundle percentage discount", () => {
  assert.deepEqual(calculateProductBundlePrice([10, 20, 30], 15), {
    regular: 60,
    price: 51,
    savings: 9,
    savingsPercent: 15,
  });
});

test("pricing clamps invalid values", () => {
  assert.deepEqual(calculateQuantityBreakPrice(10, 1, -5), {
    regular: 10,
    price: 10,
    savings: 0,
    savingsPercent: 0,
  });
  assert.deepEqual(calculateQuantityBreakPrice(10, 1, 100), {
    regular: 10,
    price: 0,
    savings: 10,
    savingsPercent: 100,
  });
  assert.deepEqual(calculateProductBundlePrice([], 25), {
    regular: 0,
    price: 0,
    savings: 0,
    savingsPercent: 0,
  });
  assert.deepEqual(calculateProductBundlePrice([-5, 10], 0), {
    regular: 10,
    price: 10,
    savings: 0,
    savingsPercent: 0,
  });
});

import {
  toMinor,
  fromMinor,
  calculateTierPrice,
  fixedDiscountMinor,
} from "../lib/bundle/pricing";
test("currency decimals and rounding", () => {
  assert.equal(calculateQuantityBreakPrice(19.99, 1, 20).price, 15.99);
  assert.equal(toMinor(100, "JPY"), 100);
  assert.equal(toMinor(1.234, "KWD"), 1234);
  assert.equal(fromMinor(1234, "KWD"), 1.234);
  assert.equal(fixedDiscountMinor(100, 500), 0);
  assert.equal(toMinor(10.075, "USD"), 1008);
  assert.equal(toMinor(1.005, "USD"), 101);
  assert.equal(toMinor(1e-7, "USD"), 0);
  assert.throws(() => toMinor(1e21, "USD"), RangeError);
});
test("zero and negative quantities never create phantom units", () => {
  assert.equal(calculateQuantityBreakPrice(10, 0, 0).price, 0);
  assert.equal(calculateQuantityBreakPrice(10, -1, 0).price, 0);
  assert.equal(calculateQuantityBreakPrice(10, 2.9, 0).price, 20);
});
test("tier price chooses largest qualifying tier regardless of order", () => {
  assert.equal(
    calculateTierPrice(10, 5, [
      { minimum: 5, percentOff: 20 },
      { minimum: 2, percentOff: 10 },
    ]).price,
    40,
  );
});
