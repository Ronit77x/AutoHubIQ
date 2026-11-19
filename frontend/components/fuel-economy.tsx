import { formatFuelEconomy, type FuelEconomyReference } from "../lib/fuel-economy";

export default function FuelEconomy({ reference, electric = false }: {
  reference: FuelEconomyReference | null;
  electric?: boolean;
}) {
  return (
    <div className="text-sm text-gray-600">
      <p className="text-xs font-medium text-gray-500">
        {electric ? "Range per charge" : "Mileage"}
      </p>
      <p className="mt-1 font-semibold text-gray-900">{formatFuelEconomy(reference)}</p>
    </div>
  );
}
