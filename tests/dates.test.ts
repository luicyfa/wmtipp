import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dateKey, formatDateTime, startOfLocalDay } from "../lib/dates.ts";

describe("Berlin date helpers", () => {
  it("zeigt Kickoff-Zeiten immer in Berliner Zeit an", () => {
    const formatted = formatDateTime("2026-06-13T21:00:00+02:00");
    assert.match(formatted, /21:00/);
  });

  it("berechnet Tages-Keys nach Berliner Datum", () => {
    assert.equal(dateKey("2026-06-15T01:00:00+02:00"), "2026-06-15");
  });

  it("liefert Berliner Tagesanfang als UTC-Zeitpunkt", () => {
    assert.equal(startOfLocalDay(new Date("2026-06-15T12:00:00.000Z")).toISOString(), "2026-06-14T22:00:00.000Z");
  });
});
