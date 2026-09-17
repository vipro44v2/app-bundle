import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
  quantitiesFor,
  totals,
  mergeItems,
} = require("../extensions/bundle-flow-widget/assets/bundleflow-widget.js");
test("buy 2 get 1 same product adds three units", () =>
  assert.deepEqual(
    quantitiesFor("Buy X get Y", { buyQuantity: 2, getQuantity: 1 }, 1),
    [3],
  ));
test("buy X get Y preserves zero gifts and separate product counts", () => {
  assert.deepEqual(
    quantitiesFor("Buy X get Y", { buyQuantity: 2, getQuantity: 0 }, 2),
    [2, 0],
  );
  assert.deepEqual(
    quantitiesFor("Buy X get Y", { buyQuantity: 2, getQuantity: 1 }, 2),
    [2, 1],
  );
});
test("gift pricing uses the gift product price", () =>
  assert.deepEqual(
    totals(
      "Buy X get Y",
      { buyQuantity: 2, getQuantity: 1, getDiscount: 50 },
      [{ price: 1000 }, { price: 2000 }],
      [2, 1],
      0,
    ),
    { regular: 4000, price: 3000 },
  ));
test("same variant merges only within the same bundle offer", () => {
  assert.deepEqual(
    mergeItems([
      { id: 1, quantity: 2, properties: { _BundleFlow: "a" } },
      { id: 1, quantity: 1, properties: { _BundleFlow: "a" } },
      { id: 1, quantity: 1, properties: { _BundleFlow: "b" } },
      { id: 2, quantity: 0, properties: {} },
    ]),
    [
      { id: 1, quantity: 3, properties: { _BundleFlow: "a" } },
      { id: 1, quantity: 1, properties: { _BundleFlow: "b" } },
    ],
  );
});
test("widget totals use integer minor values and bounded discounts", () => {
  assert.deepEqual(totals("Fixed bundle", null, [{ price: 1999 }], [1], 20), {
    regular: 1999,
    price: 1599,
  });
  assert.equal(
    totals("Fixed bundle", null, [{ price: 1999 }], [1], 110).price,
    0,
  );
});

test("free volume offers match the admin preview", () => {
  assert.equal(
    totals(
      "Volume discount",
      { getPriceMethod: "free", getDiscount: 0 },
      [{ price: 1999 }],
      [2],
      0,
    ).price,
    0,
  );
});

test("unselected unavailable products do not break flexible bundle totals", () => {
  assert.deepEqual(
    totals("Mix & match", null, [undefined, { price: 1999 }], [0, 2], 20),
    { regular: 3998, price: 3198 },
  );
});
