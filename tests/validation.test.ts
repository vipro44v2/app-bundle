import assert from "node:assert/strict";
import test from "node:test";
import { parseBundleInput, ValidationError } from "../lib/bundle/validation";

const valid = {
  name: "Summer bundle",
  bundleType: "Fixed bundle",
  productIds: ["gid://shopify/Product/123"],
  discount: 15,
  status: "Active",
};

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
