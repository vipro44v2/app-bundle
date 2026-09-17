import assert from "node:assert/strict";
import test from "node:test";
import { publicationStatus } from "../lib/bundle/publication";
import { defaultSettings } from "../lib/bundle/defaults";
import { isScheduledActive } from "../lib/bundle/validation";

test("publication status respects draft and both GMT+7 schedule boundaries", () => {
  const settings = {
    ...defaultSettings(),
    startDate: "2026-09-17",
    startTime: "09:00",
    hasEndDate: true,
    endDate: "2026-09-17",
    endTime: "18:00",
  };
  const bundle = {
    status: "Active" as const,
    configuration: { bars: [], settings },
  };
  for (const [utc, status] of [
    ["2026-09-17T01:59:59Z", "Scheduled"],
    ["2026-09-17T02:00:00Z", "Active"],
    ["2026-09-17T11:00:00Z", "Active"],
    ["2026-09-17T11:00:01Z", "Ended"],
  ]) {
    const now = Date.parse(utc);
    assert.equal(publicationStatus(bundle, now), status);
    assert.equal(isScheduledActive(settings, now), status === "Active");
    assert.equal(
      publicationStatus({ ...bundle, status: "Draft" }, now),
      "Draft",
    );
  }
});
