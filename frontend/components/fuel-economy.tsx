import { formatFuelEconomy, type FuelEconomyReference } from "../lib/fuel-economy";

export default function FuelEconomy({ reference, electric = false, detailed = false }: {
  reference: FuelEconomyReference | null;
  electric?: boolean;
  detailed?: boolean;
}) {
  return (
    <div className="text-sm text-gray-600">
      <p className="text-xs font-medium text-gray-500">
        {electric ? "Range per charge (reference)" : "Mileage / fuel economy (reference)"}
      </p>
      <p className="mt-1 font-semibold text-gray-900">{formatFuelEconomy(reference)}</p>
      {reference ? (
        <>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            {reference.basis === "owner_reported_reference" ? "Owner-reported model figure" : "Advertised model figure"}; actual results vary.
          </p>
          <a className="mt-1 inline-block text-xs font-medium text-accent-700 underline" href={reference.source_url} target="_blank" rel="noopener noreferrer">View mileage source</a>
          {detailed && (
            <div className="mt-3 space-y-1 text-xs leading-relaxed text-gray-500">
              <p>Reference: {reference.reference_trim}</p>
              <p>{reference.notes}</p>
              <p>Not measured on this vehicle. Traffic, maintenance, load and driving style affect results.</p>
              <p>Sources checked: {String(reference.checked_on).slice(0, 10)}</p>
              {reference.secondary_source_url && <a className="inline-block text-accent-700 underline" href={reference.secondary_source_url} target="_blank" rel="noopener noreferrer">Additional source</a>}
            </div>
          )}
        </>
      ) : <p className="mt-1 text-xs text-gray-500">No researched reference for this model year and powertrain yet.</p>}
    </div>
  );
}
