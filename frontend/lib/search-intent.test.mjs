import assert from "node:assert/strict";
import test from "node:test";
import { parseSearchIntent } from "./search-intent.ts";

test("everyday sizes and alternative body names map to catalogue categories", () => {
  for (const phrase of ["small car", "little city car", "compact car", "hatchback"]) {
    assert.deepEqual(parseSearchIntent(phrase).bodyTypes, ["Hatchback"]);
  }
  assert.deepEqual(parseSearchIntent("big car").bodyTypes, ["SUV", "MUV"]);
  assert.deepEqual(parseSearchIntent("SUV or sedan").bodyTypes, ["SUV", "Sedan"]);
  for (const [phrase, category] of [["saloon", "Sedan"], ["people carrier", "MUV"], ["open-top car", "Convertible"], ["pick-up truck", "Pickup"], ["two-door car", "Coupe"]]) {
    assert.deepEqual(parseSearchIntent(phrase).bodyTypes, [category]);
  }
});

test("combined everyday requirements retain budget, transmission and seating", () => {
  const intent = parseSearchIntent("big automatic car for seven people under 15 lakh");
  assert.equal(intent.maxPrice, 1500000);
  assert.equal(intent.minSeats, 7);
  assert.equal(intent.transmissionGroup, "automatic");
  assert.deepEqual(intent.bodyTypes, ["SUV", "MUV"]);
  assert.equal(parseSearchIntent("7-seater").minSeats, 7);
});

test("fuel and gearbox aliases work without overriding ambiguous alternatives", () => {
  for (const phrase of ["no clutch", "without a clutch", "clutchless", "no gear shifting"]) {
    assert.equal(parseSearchIntent(phrase).transmissionGroup, "automatic");
  }
  assert.equal(parseSearchIntent("stick shift").transmissionGroup, "manual");
  assert.equal(parseSearchIntent("battery car").fuel, "Electric");
  assert.equal(parseSearchIntent("EV").fuel, "Electric");
  assert.equal(parseSearchIntent("gasoline").fuel, "Petrol");
  assert.equal(parseSearchIntent("petrol or diesel").fuel, null);
  assert.equal(parseSearchIntent("automatic or manual").transmissionGroup, null);
});

test("negated features are never added as positive filters", () => {
  assert.equal(parseSearchIntent("not an SUV").bodyTypes, null);
  assert.equal(parseSearchIntent("no small car").bodyTypes, null);
  assert.equal(parseSearchIntent("avoid diesel").fuel, null);
  assert.equal(parseSearchIntent("don't want automatic").transmissionGroup, null);
});

test("subjective preferences enrich ranking without invented hard constraints", () => {
  const intent = parseSearchIntent("affordable family car with good mileage for daily commute and road trips");
  assert.equal(intent.bodyTypes, null);
  assert.equal(intent.maxPrice, null);
  assert.equal(intent.minSeats, null);
  assert.match(intent.semanticQuery, /fuel economy/);
  assert.match(intent.semanticQuery, /family car/);
  assert.match(intent.semanticQuery, /city commuting/);
  assert.match(intent.semanticQuery, /highway travel/);
  assert.equal(parseSearchIntent("small budget for a car").bodyTypes, null);
});

test("mileage economy and odometer requests have distinct meanings", () => {
  for (const query of ["high mileage cars", "best mileage", "good mileage", "fuel efficient car"]) {
    assert.equal(parseSearchIntent(query).fuelEconomyFirst, true);
    assert.equal(parseSearchIntent(query).distanceOrder, null);
  }
  assert.equal(parseSearchIntent("low mileage car").distanceOrder, "asc");
  assert.equal(parseSearchIntent("less driven car").distanceOrder, "asc");
  assert.equal(parseSearchIntent("high kilometres car").distanceOrder, "desc");
  assert.equal(parseSearchIntent("high distance driven").fuelEconomyFirst, false);
  assert.equal(parseSearchIntent("not high mileage").fuelEconomyFirst, false);
  const numeric = parseSearchIntent("small car with at least 20 kmpl under 8 lakh");
  assert.equal(numeric.minFuelEconomy, 20);
  assert.equal(numeric.maxPrice, 800000);
  assert.equal(numeric.fuelEconomyFirst, true);
});
