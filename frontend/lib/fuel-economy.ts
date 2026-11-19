export interface FuelEconomyReference {
  value_low: number;
  value_high: number;
  unit: "kmpl" | "km/kg" | "km/charge";
  basis: "advertised_reference" | "owner_reported_reference";
  source_url: string;
  secondary_source_url: string | null;
  reference_trim: string;
  notes: string;
  checked_on: string;
}

export function formatFuelEconomy(reference: FuelEconomyReference | null | undefined) {
  if (!reference) return "Not available";
  const low = Number(reference.value_low);
  const high = Number(reference.value_high);
  const value = low === high ? String(low) : `${low}–${high}`;
  return `${value} ${reference.unit === "km/charge" ? "km / full charge" : reference.unit}`;
}
