import assert from "node:assert/strict";
import test from "node:test";
import {
  parseBundleInput,
  validateBundleId,
  ValidationError,
} from "../lib/bundle/validation";

const valid = {
  name: "Summer bundle",
  bundleType: "Fixed bundle",
  productIds: ["gid://shopify/Product/123"],
  discount: 15,
  status: "Active",
};

test("bundle route IDs decode exactly once and reject malformed encodings", () => {
  const id = "gid://shopify/Metaobject/123";
  assert.equal(validateBundleId(encodeURIComponent(id)), id);
  assert.equal(validateBundleId(id), id);
  for (const invalid of [
    "%zz",
    "123",
    encodeURIComponent(encodeURIComponent(id)),
  ])
    assert.throws(() => validateBundleId(invalid), ValidationError);
});

test("accepts a valid bundle", () => {
  assert.equal(parseBundleInput(valid).name, "Summer bundle");
});

test("rejects invalid client-controlled values", () => {
  assert.throws(
    () =>
      parseBundleInput({
        ...valid,
        discount: 101,
        productIds: ["123"],
        status: "Deleted",
      }),
    ValidationError,
  );
});

test("rejects an inverted active date range", () => {
  assert.throws(
    () =>
      parseBundleInput({
        ...valid,
        configuration: {
          bars: [],
          settings: {
            hasEndDate: true,
            startDate: "2026-08-20",
            startTime: "10:00",
            endDate: "2026-08-19",
            endTime: "10:00",
          },
        },
      }),
    ValidationError,
  );
});

test("rejects malformed nested input without TypeError", () => {
  for (const patch of [
    { name: 123 },
    { configuration: { bars: {} } },
    { configuration: { bars: [null] } },
    { configuration: null },
    { productIds: ["gid://shopify/Product/123", "gid://shopify/Product/123"] },
    { discount: NaN },
    { name: "x".repeat(101) },
  ])
    assert.throws(
      () => parseBundleInput({ ...valid, ...patch }),
      ValidationError,
    );
});
test("rejects invalid dates, missing end dates, and unsupported price methods", () => {
  for (const settings of [
    { startDate: "2026-02-30" },
    { hasEndDate: true, endDate: "" },
    { startTime: "99:00" },
  ])
    assert.throws(
      () =>
        parseBundleInput({ ...valid, configuration: { bars: [], settings } }),
      ValidationError,
    );
});

test("build-your-own requires explicit bounded selection rules", () => {
  for (const settings of [
    {},
    { minimumItems: 2 },
    { minimumItems: 5, maximumItems: 2 },
  ]) {
    assert.throws(
      () =>
        parseBundleInput({
          ...valid,
          bundleType: "Build your own",
          configuration: { bars: [], settings },
        }),
      ValidationError,
    );
  }
});
