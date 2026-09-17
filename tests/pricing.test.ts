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
  assert.deepEqual(calculateQuantityBreakPrice(10, 0, -5), {
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
