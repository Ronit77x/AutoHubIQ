// Treat explicit vehicle requirements as filters; use embeddings for softer preferences.
const BODY_ALIASES: [string, RegExp][] = [
  ["Hatchback", /\b(hatchbacks?|hatch|(?:small|little|tiny|compact)\s+(?:(?:city|automatic|manual|electric|petrol|diesel|family)\s+)*cars?|city cars?)\b/],
  ["SUV", /\b(suvs?|sports? utility vehicles?|crossovers?|jeeps?)\b/],
  ["Sedan", /\b(sedans?|saloons?|three box cars?)\b/],
  ["MUV", /\b(muvs?|mpvs?|minivans?|people (?:carriers?|movers?))\b/],
  ["Coupe", /\b(coupes?|two door cars?|2 door cars?)\b/],
  ["Convertible", /\b(convertibles?|cabriolets?|open top cars?|drop tops?)\b/],
  ["Pickup", /\b(pickups?|pick up trucks?)\b/],
];

export function parseSearchIntent(query: string) {
  const normalized = query.toLowerCase().replace(/[\u2010-\u2015-]/g, " ").replace(/\s+/g, " ");
  // Negated features must not become positive filters. Preserve the original
  // query for ranking; do not guess an opposite requirement.
  const text = normalized.replace(/\b(?:not|no|without|avoid|don't want|do not want)\s+(?:(?:an?|any)\s+)?[\w]+(?:\s+cars?)?/g,
    phrase => /\b(clutch|gears?)\b/.test(phrase) ? phrase : "");
  const budget = text.match(/\b(?:under|below|within|up to|max(?:imum)?(?: budget)?)\s*(?:rs\.?|₹)?\s*([\d,.]+)\s*(crores?|cr\b|lakhs?|lacs?|l\b|k\b)?/);
  const amount = budget ? Number(budget[1].replaceAll(",", "")) : null;
  const unit = budget?.[2] ?? "";
  const maxPrice = amount ? amount * (/^(crore|cr)/.test(unit) ? 10000000 : /^(lakh|lac|l)/.test(unit) ? 100000 : unit === "k" ? 1000 : 1) : null;
  const fuels = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "LPG"].filter(fuel => new RegExp(`\\b${fuel}\\b`, "i").test(text));
  if (/\b(ev|battery (?:powered )?cars?|fully electric|all electric)\b/.test(text) && !fuels.includes("Electric")) fuels.push("Electric");
  if (/\b(gasoline|gasolene)\b/.test(text) && !fuels.includes("Petrol")) fuels.push("Petrol");
  const automatic = /\b(automatic|auto|amt|cvt|dct|no clutch|without (?:a )?clutch|clutchless|no gears|no gear shifting)\b/.test(text);
  const manual = /\b(manual|stick shift|stickshift)\b/.test(text);
  const bodies = BODY_ALIASES.filter(([, pattern]) => pattern.test(text)).map(([body]) => body);
  if (/\b(big|large|spacious|roomy)\s+(?:(?:automatic|manual|electric|petrol|diesel|family)\s+)*cars?\b/.test(text)) bodies.push("SUV", "MUV");
  const bodyTypes = [...new Set(bodies)];
  const seats = text.match(/\b([2-9]|two|three|four|five|six|seven|eight|nine)\s*(?:seat(?:er|s)?|people|persons?|passengers?)\b/);
  const numberWords: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
  const minSeats = seats ? numberWords[seats[1]] ?? Number(seats[1]) : null;
  const preferences: string[] = [];
  const minEconomyMatch = text.match(/\b(?:at least|above|over|minimum|min)\s*(\d+(?:\.\d+)?)\s*(?:kmpl|km\/l|km per litre)\b/);
  const minFuelEconomy = minEconomyMatch ? Number(minEconomyMatch[1]) : null;
  const fuelEconomyFirst = /\b(high(?:er|est)? mileage|best mileage|good mileage|fuel efficient|fuel efficiency|economical|less fuel|low fuel consumption)\b/.test(text) || minFuelEconomy !== null;
  const distanceOrder = /\b(high (?:kilometres|kilometers|kms)|high distance driven|heavily driven)\b/.test(text) ? "desc"
    : /\b(low mileage|low (?:kilometres|kilometers|kms)|less driven|low distance driven)\b/.test(text) ? "asc" : null;
  if (fuelEconomyFirst) preferences.push("fuel efficient economical car with good fuel economy");
  if (/\b(cheap|affordable|budget friendly|low price)\b/.test(text)) preferences.push("affordable inexpensive budget car");
  if (/\b(family|kids|children)\b/.test(text)) preferences.push("comfortable practical family car");
  if (/\b(city driving|city traffic|easy to park|daily commute|office commute)\b/.test(text)) preferences.push("easy to drive and park for daily city commuting");
  if (/\b(long drives?|road trips?|highway)\b/.test(text)) preferences.push("comfortable car for highway travel and long journeys");
  return {
    maxPrice,
    fuel: fuels.length === 1 ? fuels[0] : null,
    transmissionGroup: automatic && !manual ? "automatic" : manual && !automatic ? "manual" : null,
    bodyType: bodyTypes.length === 1 ? bodyTypes[0] : null,
    bodyTypes: bodyTypes.length ? bodyTypes : null,
    minSeats,
    fuelEconomyFirst,
    minFuelEconomy,
    distanceOrder,
    semanticQuery: [query, bodyTypes.join(" or "), ...preferences].filter(Boolean).join(". "),
  };
}
