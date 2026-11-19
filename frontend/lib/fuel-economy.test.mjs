import assert from "node:assert/strict";
import test from "node:test";
import { formatFuelEconomy } from "./fuel-economy.ts";

test("fuel economy distinguishes reference ranges, unavailable data and EV range", () => {
  assert.equal(formatFuelEconomy(null), "Not available");
  assert.equal(formatFuelEconomy({ value_low: 19, value_high: 19, unit: "kmpl" }), "19 kmpl");
  assert.equal(formatFuelEconomy({ value_low: 21.21, value_high: 22.38, unit: "kmpl" }), "21.21–22.38 kmpl");
  assert.equal(formatFuelEconomy({ value_low: 230, value_high: 230, unit: "km/charge" }), "230 km / full charge");
  assert.equal(formatFuelEconomy({ value_low: 26, value_high: 26, unit: "km/kg" }), "26 km/kg");
});
