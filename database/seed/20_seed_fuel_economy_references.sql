BEGIN;

-- Reviewed 19 November 2026. Values come from matching used-car listing
-- specifications. Ranges preserve conflicting trim/generation figures rather
-- than pretending our generic catalogue identifies the exact engine/trim.
WITH refs (manufacturer, model, variant, model_year, low, high, unit, basis, source_url, secondary_url, trim, notes) AS (
  VALUES
  ('Maruti Suzuki', 'Swift', 'Petrol Manual', 2021, 21.21, 22.38, 'kmpl', 'advertised_reference',
   'https://www.spinny.com/buy-used-cars/lucknow/maruti-suzuki/swift/vxi-2021/32019104/',
   'https://www.cartrade.com/second-hand/chennai/maruti-suzuki-swift/2q6tetp2/?dc=0',
   '2021 VXi petrol manual, 1.2 litre', 'Used listings show 21.21 and 22.38 kmpl for different 2021 specifications. Exact engine generation is not recorded in this demo catalogue.'),
  ('Maruti Suzuki', 'Baleno', 'Petrol Manual', 2021, 21.01, 21.01, 'kmpl', 'advertised_reference',
   'https://www.carwale.com/used/bangalore/maruti-suzuki-baleno/jft05002/', NULL,
   '2021 Alpha 1.2 VVT petrol manual', 'ARAI figure displayed on a comparable used listing; model reference, not a test of this car.'),
  ('Hyundai', 'Creta', 'Diesel Automatic', 2022, 19, 19, 'kmpl', 'advertised_reference',
   'https://www.carwale.com/used/kolkata/hyundai-creta/k5yqsc9v/', NULL,
   '2022 SX 1.5 diesel automatic', 'ARAI figure displayed on a comparable used listing; model reference, not a test of this car.'),
  ('Kia', 'Seltos', 'Petrol Manual', 2022, 16.5, 16.5, 'kmpl', 'advertised_reference',
   'https://www.spinny.com/buy-used-cars/gurgaon/kia/seltos/htx-15-sohna-road-2022/33917530/', NULL,
   '2022 HTX 1.5 petrol manual', 'ARAI figure displayed on a comparable used listing; engine/trim is representative of the generic catalogue variant.'),
  ('Honda', 'City', 'Petrol CVT', 2021, 18.4, 18.4, 'kmpl', 'advertised_reference',
   'https://www.spinny.com/buy-used-cars/bangalore/honda/city/zx-cvt-petrol-2021/32966523/', NULL,
   '2021 fifth-generation ZX 1.5 petrol CVT', 'ARAI figure displayed on a comparable used listing; generation/trim is representative, not recorded for the demo car.'),
  ('BMW', '3 Series', 'Petrol Automatic', 2020, 16.13, 16.13, 'kmpl', 'advertised_reference',
   'https://www.carwale.com/used/delhi/bmw-3-series/a3xid215/',
   'https://www.bmw-bavariamotors.in/sites/default/files/2021-02/3%20Series%20Specsheet%20Petrol.pdf',
   '2020 330i 2.0 petrol automatic', 'Used-listing ARAI figure cross-checked against the July 2020 BMW specification sheet. 330i is a representative trim.'),
  ('Toyota', 'Innova Crysta', 'Diesel Manual', 2019, 15.1, 15.1, 'kmpl', 'advertised_reference',
   'https://www.cartrade.com/second-hand/delhi/toyota-innova-crysta/5s7hz0xf/?dc=0', NULL,
   '2019 2.4 VX 7 STR diesel manual', 'ARAI figure displayed on a comparable used listing; 2.4 litre is a representative engine.'),
  ('Tata Motors', 'Nexon', 'Diesel AMT', 2020, 22, 23.97, 'kmpl', 'advertised_reference',
   'https://www.spinny.com/buy-used-cars/chandigarh/tata/nexon/xza-plus-o-diesel-sector-28-2020/26150131/',
   'https://www.carwale.com/used/hyderabad/tata-nexon/8qb7x6k3/',
   '2020 1.5 diesel AMT, XZA Plus (O) / XMA', 'Used listings span the 2020 generation change: 22 and 23.97 kmpl. Exact trim/emission specification is not recorded.'),
  ('Renault', 'Kwid', 'Petrol Manual', 2020, 23, 25, 'kmpl', 'advertised_reference',
   'https://www.spinny.com/buy-used-cars/bangalore/renault/kwid/10-rxt-opt-btm-layout-2020/32920164/',
   'https://www.spinny.com/buy-used-cars/gurgaon/renault/kwid/rxl-2020/33805785/',
   '2020 petrol manual, 1.0 RXT / RXL', 'Used listings show 23 kmpl for 1.0 RXT and 25 kmpl for RXL. Engine capacity is not recorded in the generic catalogue; range covers these references.'),
  ('Volkswagen', 'Virtus', 'Petrol Automatic', 2023, 18.12, 18.45, 'kmpl', 'advertised_reference',
   'https://www.cardekho.com/used-car-details/used-Volkswagen-virtus-topline-at-bsvi-cars-Surat_953995b5-dee2-41dd-9e87-587ad58aa993.htm',
   'https://www.carwale.com/used/ghaziabad/volkswagen-virtus/g6eri8c2/',
   '2023 Topline 1.0 TSI torque-converter automatic', 'Reference covers pre/post update 1.0 TSI automatic specifications; the exact build-month specification is not recorded.'),
  ('Mahindra', 'XUV700', 'Diesel Manual', 2022, 14.5, 17, 'kmpl', 'advertised_reference',
   'https://www.jaancar.com/vehicle/44750df1-1ff4-48de-9a4e-721491ef06d3/',
   'https://www.spinny.com/cars/mahindra/xuv700/specs-and-features/',
   '2022 2.2 diesel manual, representative 7-seat version', 'Sources disagree: comparable used listing quotes 14.5 kmpl; Spinny quotes up to 17 kmpl for diesel. Range preserves this uncertainty; not a certified figure for this car.'),
  ('MG Motor', 'Comet EV', 'Electric Single-speed', 2023, 230, 230, 'km/charge', 'advertised_reference',
   'https://www.carwale.com/used/pune/mg-comet-ev/dvend6vw/', NULL,
   '2023 Play, 17.3 kWh', 'Advertised range up to 230 km per full charge on a comparable used listing. Battery health and driving conditions affect actual range; kmpl does not apply to an EV.')
)
INSERT INTO app.fuel_economy_references
  (variant_id, model_year, value_low, value_high, unit, basis, source_url, secondary_source_url, reference_trim, notes, checked_on)
SELECT vv.variant_id, r.model_year, r.low, r.high, r.unit, r.basis, r.source_url, r.secondary_url, r.trim, r.notes, DATE '2026-11-19'
FROM refs r
JOIN app.manufacturers m ON m.manufacturer_name = r.manufacturer
JOIN app.vehicle_models vm ON vm.manufacturer_id = m.manufacturer_id AND vm.model_name = r.model
JOIN app.vehicle_variants vv ON vv.model_id = vm.model_id AND vv.variant_name = r.variant
ON CONFLICT (variant_id, model_year) DO UPDATE SET
  value_low = EXCLUDED.value_low, value_high = EXCLUDED.value_high,
  unit = EXCLUDED.unit, basis = EXCLUDED.basis, source_url = EXCLUDED.source_url,
  secondary_source_url = EXCLUDED.secondary_source_url,
  reference_trim = EXCLUDED.reference_trim, notes = EXCLUDED.notes, checked_on = EXCLUDED.checked_on;

COMMIT;
