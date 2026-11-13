BEGIN;
ALTER TABLE app.listing_enquiries ADD COLUMN IF NOT EXISTS offer_amount NUMERIC(12,2);
ALTER TABLE app.listing_enquiries DROP CONSTRAINT IF EXISTS listing_enquiries_request_type_check;
ALTER TABLE app.listing_enquiries ADD CONSTRAINT listing_enquiries_request_type_check
  CHECK (request_type IN ('enquiry', 'test_drive', 'offer'));
ALTER TABLE app.listing_enquiries DROP CONSTRAINT IF EXISTS listing_enquiries_offer_amount_check;
ALTER TABLE app.listing_enquiries ADD CONSTRAINT listing_enquiries_offer_amount_check
  CHECK ((request_type = 'offer' AND offer_amount IS NOT NULL AND offer_amount > 0)
      OR (request_type <> 'offer' AND offer_amount IS NULL));
COMMIT;
