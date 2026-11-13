// Treat explicit vehicle requirements as filters; use embeddings for softer preferences.
export function parseSearchIntent(query: string) {
  const text = query.toLowerCase();
  const budget = text.match(/\b(?:under|below|within|up to|max(?:imum)?(?: budget)?)\s*(?:rs\.?|₹)?\s*([\d,.]+)\s*(crores?|cr\b|lakhs?|lacs?|l\b|k\b)?/);
  const amount = budget ? Number(budget[1].replaceAll(",", "")) : null;
  const unit = budget?.[2] ?? "";
  const maxPrice = amount ? amount * (/^(crore|cr)/.test(unit) ? 10000000 : /^(lakh|lac|l)/.test(unit) ? 100000 : unit === "k" ? 1000 : 1) : null;
  const fuels = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "LPG"].filter(fuel => new RegExp(`\\b${fuel}\\b`, "i").test(text));
  const automatic = /\b(automatic|auto|amt|cvt|dct)\b/.test(text);
  const manual = /\bmanual\b/.test(text);
  return {
    maxPrice,
    fuel: fuels.length === 1 ? fuels[0] : null,
    transmissionGroup: automatic && !manual ? "automatic" : manual && !automatic ? "manual" : null,
    bodyType: /\bsuv\b/.test(text) ? "SUV" : /\bsedan\b/.test(text) ? "Sedan" : /\bhatchback\b/.test(text) ? "Hatchback" : null,
  };
}
