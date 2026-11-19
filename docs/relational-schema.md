# Relational schema and data dictionary

Audited 15 November 2026 against PostgreSQL 18.6 / pgvector 0.8.7. All 14 base tables, columns, constraints, indexes, views, functions, and triggers match a fresh application of the repository SQL scripts. No record values are included.

Sources: [catalog snapshot](evidence/schema-catalog.json), [database verification](evidence/database-validation.json), [DDL](../database/schema/). Regenerate from the repository root with `node docs/tools/audit-schema.mjs` then `node docs/tools/render-schema.mjs`.

## Notation and enforcement

PK = primary key; FK = foreign key; UK = unique-constraint membership. Every FK is NOT NULL on the child. A parent may have zero children. dealer_profiles.user_id, listing_embeddings.listing_id, and listing_image_data.image_id permit at most one corresponding child. Composite unique keys are listed separately; their members are not individually unique.

Default — means no explicit default. Identity columns are generated ALWAYS. PostgreSQL CHECK expressions permit NULL unless NOT NULL is also specified. FK deletion uses NO ACTION unless CASCADE is explicitly listed. Security update 19 November 2026: schema 20 now enforces end-user roles and ownership using RLS, column grants and guarded functions in addition to the API checks. The dated dictionary below is the earlier metadata snapshot; its 14-table audit predates the mileage-reference addition. Security policies do not add entities or change PK/FK relationships.

## Relational schemas

- **app.cities**(city_id [PK], city_name [UK], state_name [UK], is_active, created_at)
- **app.dealer_profiles**(dealer_id [PK], user_id [FK,UK], city_id [FK], dealership_name, business_phone, business_email, street_address, description, verification_status, created_at, updated_at)
- **app.listing_embeddings**(listing_id [FK,PK], embedding, source_text, model_name, generated_at)
- **app.listing_enquiries**(enquiry_id [PK], listing_id [FK], user_id [FK], message, phone, request_type, created_at, offer_amount, contacted_at, updated_at)
- **app.listing_image_data**(image_id [FK,PK], content, content_type)
- **app.listing_images**(image_id [PK], listing_id [FK], image_url, display_order, is_primary, created_at)
- **app.listing_price_estimates**(estimate_id [PK], listing_id [FK], estimated_price, lower_price, upper_price, methodology, source_summary, source_url, assessed_at)
- **app.manufacturers**(manufacturer_id [PK], manufacturer_name [UK], country_of_origin, created_at)
- **app.request_limits**(key_hash [PK], window_start, request_count)
- **app.users**(user_id [PK], full_name, email [UK], phone, password_hash, user_role, account_status, created_at, updated_at)
- **app.vehicle_listings**(listing_id [PK], vehicle_id [FK], asking_price, description, listing_status, source_type, source_url, source_verified_at, published_at, created_at, updated_at)
- **app.vehicle_models**(model_id [PK], manufacturer_id [FK,UK], model_name [UK], body_type, description, created_at)
- **app.vehicle_variants**(variant_id [PK], model_id [FK,UK], variant_name [UK], fuel_type, transmission, engine_displacement_cc, battery_capacity_kwh, seating_capacity, created_at)
- **app.vehicles**(vehicle_id [PK], dealer_id [FK], variant_id [FK], manufacturing_year, registration_year, kms_driven, colour, ownership_count, condition, registration_number, created_at, updated_at)

## Column definitions, constraints, and indexes

### app.cities

| Column | PostgreSQL type | Nullable | Default / generation | Key membership |
| --- | --- | --- | --- | --- |
| `city_id` | `smallint` | No | GENERATED ALWAYS AS IDENTITY | PK |
| `city_name` | `character varying(100)` | No | — | UK |
| `state_name` | `character varying(100)` | No | — | UK |
| `is_active` | `boolean` | No | true | — |
| `created_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |

**Exact constraints**

- `cities_city_id_not_null`: `NOT NULL city_id`
- `cities_city_name_not_null`: `NOT NULL city_name`
- `cities_created_at_not_null`: `NOT NULL created_at`
- `cities_is_active_not_null`: `NOT NULL is_active`
- `cities_state_name_not_null`: `NOT NULL state_name`
- `pk_cities`: `PRIMARY KEY (city_id)`
- `uq_cities_name_state`: `UNIQUE (city_name, state_name)`

**Indexes**

- `pk_cities`: `CREATE UNIQUE INDEX pk_cities ON app.cities USING btree (city_id)`
- `uq_cities_name_state`: `CREATE UNIQUE INDEX uq_cities_name_state ON app.cities USING btree (city_name, state_name)`

### app.dealer_profiles

| Column | PostgreSQL type | Nullable | Default / generation | Key membership |
| --- | --- | --- | --- | --- |
| `dealer_id` | `bigint` | No | GENERATED ALWAYS AS IDENTITY | PK |
| `user_id` | `bigint` | No | — | FK, UK |
| `city_id` | `smallint` | No | — | FK |
| `dealership_name` | `character varying(150)` | No | — | — |
| `business_phone` | `character varying(20)` | Yes | — | — |
| `business_email` | `character varying(255)` | Yes | — | — |
| `street_address` | `text` | No | — | — |
| `description` | `text` | Yes | — | — |
| `verification_status` | `character varying(20)` | No | 'pending'::character varying | — |
| `created_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |
| `updated_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |

**Exact constraints**

- `chk_dealer_verification_status`: `CHECK (verification_status::text = ANY (ARRAY['pending'::character varying, 'verified'::character varying, 'rejected'::character varying]::text[]))`
- `dealer_profiles_city_id_not_null`: `NOT NULL city_id`
- `dealer_profiles_created_at_not_null`: `NOT NULL created_at`
- `dealer_profiles_dealer_id_not_null`: `NOT NULL dealer_id`
- `dealer_profiles_dealership_name_not_null`: `NOT NULL dealership_name`
- `dealer_profiles_street_address_not_null`: `NOT NULL street_address`
- `dealer_profiles_updated_at_not_null`: `NOT NULL updated_at`
- `dealer_profiles_user_id_not_null`: `NOT NULL user_id`
- `dealer_profiles_verification_status_not_null`: `NOT NULL verification_status`
- `fk_dealer_profiles_city`: `FOREIGN KEY (city_id) REFERENCES app.cities(city_id)`
- `fk_dealer_profiles_user`: `FOREIGN KEY (user_id) REFERENCES app.users(user_id)`
- `pk_dealer_profiles`: `PRIMARY KEY (dealer_id)`
- `uq_dealer_profiles_user`: `UNIQUE (user_id)`

**Indexes**

- `idx_dealer_profiles_city`: `CREATE INDEX idx_dealer_profiles_city ON app.dealer_profiles USING btree (city_id)`
- `pk_dealer_profiles`: `CREATE UNIQUE INDEX pk_dealer_profiles ON app.dealer_profiles USING btree (dealer_id)`
- `uq_dealer_profiles_user`: `CREATE UNIQUE INDEX uq_dealer_profiles_user ON app.dealer_profiles USING btree (user_id)`

### app.listing_embeddings

| Column | PostgreSQL type | Nullable | Default / generation | Key membership |
| --- | --- | --- | --- | --- |
| `listing_id` | `bigint` | No | — | FK, PK |
| `embedding` | `vector(384)` | No | — | — |
| `source_text` | `text` | No | — | — |
| `model_name` | `text` | No | — | — |
| `generated_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |

**Exact constraints**

- `listing_embeddings_embedding_not_null`: `NOT NULL embedding`
- `listing_embeddings_generated_at_not_null`: `NOT NULL generated_at`
- `listing_embeddings_listing_id_fkey`: `FOREIGN KEY (listing_id) REFERENCES app.vehicle_listings(listing_id) ON DELETE CASCADE`
- `listing_embeddings_listing_id_not_null`: `NOT NULL listing_id`
- `listing_embeddings_model_name_not_null`: `NOT NULL model_name`
- `listing_embeddings_pkey`: `PRIMARY KEY (listing_id)`
- `listing_embeddings_source_text_not_null`: `NOT NULL source_text`

**Indexes**

- `idx_listing_embeddings_cosine`: `CREATE INDEX idx_listing_embeddings_cosine ON app.listing_embeddings USING hnsw (embedding vector_cosine_ops)`
- `listing_embeddings_pkey`: `CREATE UNIQUE INDEX listing_embeddings_pkey ON app.listing_embeddings USING btree (listing_id)`

### app.listing_enquiries

| Column | PostgreSQL type | Nullable | Default / generation | Key membership |
| --- | --- | --- | --- | --- |
| `enquiry_id` | `bigint` | No | GENERATED ALWAYS AS IDENTITY | PK |
| `listing_id` | `bigint` | No | — | FK |
| `user_id` | `bigint` | No | — | FK |
| `message` | `text` | No | — | — |
| `phone` | `character varying(20)` | Yes | — | — |
| `request_type` | `text` | No | — | — |
| `created_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |
| `offer_amount` | `numeric(12,2)` | Yes | — | — |
| `contacted_at` | `timestamp with time zone` | Yes | — | — |
| `updated_at` | `timestamp with time zone` | Yes | — | — |

**Exact constraints**

- `listing_enquiries_created_at_not_null`: `NOT NULL created_at`
- `listing_enquiries_enquiry_id_not_null`: `NOT NULL enquiry_id`
- `listing_enquiries_listing_id_fkey`: `FOREIGN KEY (listing_id) REFERENCES app.vehicle_listings(listing_id) ON DELETE CASCADE`
- `listing_enquiries_listing_id_not_null`: `NOT NULL listing_id`
- `listing_enquiries_message_check`: `CHECK (length(message) >= 10 AND length(message) <= 2000)`
- `listing_enquiries_message_not_null`: `NOT NULL message`
- `listing_enquiries_offer_amount_check`: `CHECK (request_type = 'offer'::text AND offer_amount IS NOT NULL AND offer_amount > 0::numeric OR request_type <> 'offer'::text AND offer_amount IS NULL)`
- `listing_enquiries_pkey`: `PRIMARY KEY (enquiry_id)`
- `listing_enquiries_request_type_check`: `CHECK (request_type = ANY (ARRAY['enquiry'::text, 'test_drive'::text, 'offer'::text]))`
- `listing_enquiries_request_type_not_null`: `NOT NULL request_type`
- `listing_enquiries_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES app.users(user_id)`
- `listing_enquiries_user_id_not_null`: `NOT NULL user_id`

**Indexes**

- `idx_enquiries_listing_created`: `CREATE INDEX idx_enquiries_listing_created ON app.listing_enquiries USING btree (listing_id, created_at DESC)`
- `idx_enquiries_user_created`: `CREATE INDEX idx_enquiries_user_created ON app.listing_enquiries USING btree (user_id, created_at DESC)`
- `listing_enquiries_pkey`: `CREATE UNIQUE INDEX listing_enquiries_pkey ON app.listing_enquiries USING btree (enquiry_id)`

### app.listing_image_data

| Column | PostgreSQL type | Nullable | Default / generation | Key membership |
| --- | --- | --- | --- | --- |
| `image_id` | `bigint` | No | — | FK, PK |
| `content` | `bytea` | No | — | — |
| `content_type` | `text` | No | 'image/jpeg'::text | — |

**Exact constraints**

- `listing_image_data_content_check`: `CHECK (octet_length(content) <= 2097152)`
- `listing_image_data_content_not_null`: `NOT NULL content`
- `listing_image_data_content_type_check`: `CHECK (content_type = 'image/jpeg'::text)`
- `listing_image_data_content_type_not_null`: `NOT NULL content_type`
- `listing_image_data_image_id_fkey`: `FOREIGN KEY (image_id) REFERENCES app.listing_images(image_id) ON DELETE CASCADE`
- `listing_image_data_image_id_not_null`: `NOT NULL image_id`
- `listing_image_data_pkey`: `PRIMARY KEY (image_id)`

**Indexes**

- `listing_image_data_pkey`: `CREATE UNIQUE INDEX listing_image_data_pkey ON app.listing_image_data USING btree (image_id)`

### app.listing_images

| Column | PostgreSQL type | Nullable | Default / generation | Key membership |
| --- | --- | --- | --- | --- |
| `image_id` | `bigint` | No | GENERATED ALWAYS AS IDENTITY | PK |
| `listing_id` | `bigint` | No | — | FK |
| `image_url` | `text` | No | — | — |
| `display_order` | `smallint` | No | 1 | — |
| `is_primary` | `boolean` | No | false | — |
| `created_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |

**Exact constraints**

- `chk_image_display_order`: `CHECK (display_order > 0)`
- `fk_listing_images_listing`: `FOREIGN KEY (listing_id) REFERENCES app.vehicle_listings(listing_id) ON DELETE CASCADE`
- `listing_images_created_at_not_null`: `NOT NULL created_at`
- `listing_images_display_order_not_null`: `NOT NULL display_order`
- `listing_images_image_id_not_null`: `NOT NULL image_id`
- `listing_images_image_url_not_null`: `NOT NULL image_url`
- `listing_images_is_primary_not_null`: `NOT NULL is_primary`
- `listing_images_listing_id_not_null`: `NOT NULL listing_id`
- `pk_listing_images`: `PRIMARY KEY (image_id)`

**Indexes**

- `idx_listing_images_listing`: `CREATE INDEX idx_listing_images_listing ON app.listing_images USING btree (listing_id)`
- `pk_listing_images`: `CREATE UNIQUE INDEX pk_listing_images ON app.listing_images USING btree (image_id)`

### app.listing_price_estimates

| Column | PostgreSQL type | Nullable | Default / generation | Key membership |
| --- | --- | --- | --- | --- |
| `estimate_id` | `bigint` | No | GENERATED ALWAYS AS IDENTITY | PK |
| `listing_id` | `bigint` | No | — | FK |
| `estimated_price` | `numeric(12,2)` | No | — | — |
| `lower_price` | `numeric(12,2)` | Yes | — | — |
| `upper_price` | `numeric(12,2)` | Yes | — | — |
| `methodology` | `text` | No | — | — |
| `source_summary` | `text` | Yes | — | — |
| `source_url` | `text` | Yes | — | — |
| `assessed_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |

**Exact constraints**

- `chk_estimated_price_positive`: `CHECK (estimated_price > 0::numeric)`
- `chk_price_range`: `CHECK ((lower_price IS NULL OR lower_price > 0::numeric) AND (upper_price IS NULL OR upper_price > 0::numeric) AND (lower_price IS NULL OR upper_price IS NULL OR lower_price <= upper_price))`
- `listing_price_estimates_assessed_at_not_null`: `NOT NULL assessed_at`
- `listing_price_estimates_estimate_id_not_null`: `NOT NULL estimate_id`
- `listing_price_estimates_estimated_price_not_null`: `NOT NULL estimated_price`
- `listing_price_estimates_listing_id_fkey`: `FOREIGN KEY (listing_id) REFERENCES app.vehicle_listings(listing_id) ON DELETE CASCADE`
- `listing_price_estimates_listing_id_not_null`: `NOT NULL listing_id`
- `listing_price_estimates_methodology_not_null`: `NOT NULL methodology`
- `listing_price_estimates_pkey`: `PRIMARY KEY (estimate_id)`

**Indexes**

- `idx_price_estimates_listing`: `CREATE INDEX idx_price_estimates_listing ON app.listing_price_estimates USING btree (listing_id, assessed_at DESC)`
- `listing_price_estimates_pkey`: `CREATE UNIQUE INDEX listing_price_estimates_pkey ON app.listing_price_estimates USING btree (estimate_id)`

### app.manufacturers

| Column | PostgreSQL type | Nullable | Default / generation | Key membership |
| --- | --- | --- | --- | --- |
| `manufacturer_id` | `smallint` | No | GENERATED ALWAYS AS IDENTITY | PK |
| `manufacturer_name` | `character varying(100)` | No | — | UK |
| `country_of_origin` | `character varying(100)` | Yes | — | — |
| `created_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |

**Exact constraints**

- `manufacturers_created_at_not_null`: `NOT NULL created_at`
- `manufacturers_manufacturer_id_not_null`: `NOT NULL manufacturer_id`
- `manufacturers_manufacturer_name_not_null`: `NOT NULL manufacturer_name`
- `pk_manufacturers`: `PRIMARY KEY (manufacturer_id)`
- `uq_manufacturer_name`: `UNIQUE (manufacturer_name)`

**Indexes**

- `pk_manufacturers`: `CREATE UNIQUE INDEX pk_manufacturers ON app.manufacturers USING btree (manufacturer_id)`
- `uq_manufacturer_name`: `CREATE UNIQUE INDEX uq_manufacturer_name ON app.manufacturers USING btree (manufacturer_name)`

### app.request_limits

| Column | PostgreSQL type | Nullable | Default / generation | Key membership |
| --- | --- | --- | --- | --- |
| `key_hash` | `text` | No | — | PK |
| `window_start` | `timestamp with time zone` | No | — | — |
| `request_count` | `integer` | No | — | — |

**Exact constraints**

- `request_limits_key_hash_not_null`: `NOT NULL key_hash`
- `request_limits_pkey`: `PRIMARY KEY (key_hash)`
- `request_limits_request_count_not_null`: `NOT NULL request_count`
- `request_limits_window_start_not_null`: `NOT NULL window_start`

**Indexes**

- `request_limits_pkey`: `CREATE UNIQUE INDEX request_limits_pkey ON app.request_limits USING btree (key_hash)`

### app.users

| Column | PostgreSQL type | Nullable | Default / generation | Key membership |
| --- | --- | --- | --- | --- |
| `user_id` | `bigint` | No | GENERATED ALWAYS AS IDENTITY | PK |
| `full_name` | `character varying(120)` | No | — | — |
| `email` | `character varying(255)` | No | — | UK |
| `phone` | `character varying(20)` | Yes | — | — |
| `password_hash` | `text` | No | — | — |
| `user_role` | `character varying(20)` | No | 'customer'::character varying | — |
| `account_status` | `character varying(20)` | No | 'active'::character varying | — |
| `created_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |
| `updated_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |

**Exact constraints**

- `chk_users_role`: `CHECK (user_role::text = ANY (ARRAY['customer'::character varying, 'dealer'::character varying, 'admin'::character varying]::text[]))`
- `chk_users_status`: `CHECK (account_status::text = ANY (ARRAY['active'::character varying, 'suspended'::character varying, 'pending'::character varying]::text[]))`
- `pk_users`: `PRIMARY KEY (user_id)`
- `uq_users_email`: `UNIQUE (email)`
- `users_account_status_not_null`: `NOT NULL account_status`
- `users_created_at_not_null`: `NOT NULL created_at`
- `users_email_not_null`: `NOT NULL email`
- `users_full_name_not_null`: `NOT NULL full_name`
- `users_password_hash_not_null`: `NOT NULL password_hash`
- `users_updated_at_not_null`: `NOT NULL updated_at`
- `users_user_id_not_null`: `NOT NULL user_id`
- `users_user_role_not_null`: `NOT NULL user_role`

**Indexes**

- `pk_users`: `CREATE UNIQUE INDEX pk_users ON app.users USING btree (user_id)`
- `uq_users_email`: `CREATE UNIQUE INDEX uq_users_email ON app.users USING btree (email)`
- `uq_users_email_lower`: `CREATE UNIQUE INDEX uq_users_email_lower ON app.users USING btree (lower((email)::text))`

### app.vehicle_listings

| Column | PostgreSQL type | Nullable | Default / generation | Key membership |
| --- | --- | --- | --- | --- |
| `listing_id` | `bigint` | No | GENERATED ALWAYS AS IDENTITY | PK |
| `vehicle_id` | `bigint` | No | — | FK |
| `asking_price` | `numeric(12,2)` | No | — | — |
| `description` | `text` | No | — | — |
| `listing_status` | `character varying(20)` | No | 'draft'::character varying | — |
| `source_type` | `character varying(20)` | No | 'demo'::character varying | — |
| `source_url` | `text` | Yes | — | — |
| `source_verified_at` | `timestamp with time zone` | Yes | — | — |
| `published_at` | `timestamp with time zone` | Yes | — | — |
| `created_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |
| `updated_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |

**Exact constraints**

- `chk_listing_price`: `CHECK (asking_price > 0::numeric)`
- `chk_listing_source`: `CHECK (source_type::text = ANY (ARRAY['demo'::character varying, 'dealer'::character varying, 'external_reference'::character varying]::text[]))`
- `chk_listing_status`: `CHECK (listing_status::text = ANY (ARRAY['draft'::character varying, 'active'::character varying, 'reserved'::character varying, 'sold'::character varying, 'withdrawn'::character varying]::text[]))`
- `fk_vehicle_listings_vehicle`: `FOREIGN KEY (vehicle_id) REFERENCES app.vehicles(vehicle_id)`
- `pk_vehicle_listings`: `PRIMARY KEY (listing_id)`
- `vehicle_listings_asking_price_not_null`: `NOT NULL asking_price`
- `vehicle_listings_created_at_not_null`: `NOT NULL created_at`
- `vehicle_listings_description_not_null`: `NOT NULL description`
- `vehicle_listings_listing_id_not_null`: `NOT NULL listing_id`
- `vehicle_listings_listing_status_not_null`: `NOT NULL listing_status`
- `vehicle_listings_source_type_not_null`: `NOT NULL source_type`
- `vehicle_listings_updated_at_not_null`: `NOT NULL updated_at`
- `vehicle_listings_vehicle_id_not_null`: `NOT NULL vehicle_id`

**Indexes**

- `idx_listings_price`: `CREATE INDEX idx_listings_price ON app.vehicle_listings USING btree (asking_price)`
- `idx_listings_status`: `CREATE INDEX idx_listings_status ON app.vehicle_listings USING btree (listing_status)`
- `pk_vehicle_listings`: `CREATE UNIQUE INDEX pk_vehicle_listings ON app.vehicle_listings USING btree (listing_id)`
- `uq_active_listing_per_vehicle`: `CREATE UNIQUE INDEX uq_active_listing_per_vehicle ON app.vehicle_listings USING btree (vehicle_id) WHERE ((listing_status)::text = 'active'::text)`

### app.vehicle_models

| Column | PostgreSQL type | Nullable | Default / generation | Key membership |
| --- | --- | --- | --- | --- |
| `model_id` | `bigint` | No | GENERATED ALWAYS AS IDENTITY | PK |
| `manufacturer_id` | `smallint` | No | — | FK, UK |
| `model_name` | `character varying(120)` | No | — | UK |
| `body_type` | `character varying(30)` | No | — | — |
| `description` | `text` | Yes | — | — |
| `created_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |

**Exact constraints**

- `chk_vehicle_body_type`: `CHECK (body_type::text = ANY (ARRAY['Hatchback'::character varying, 'Sedan'::character varying, 'SUV'::character varying, 'MUV'::character varying, 'Coupe'::character varying, 'Convertible'::character varying, 'Pickup'::character varying, 'Other'::character varying]::text[]))`
- `fk_vehicle_models_manufacturer`: `FOREIGN KEY (manufacturer_id) REFERENCES app.manufacturers(manufacturer_id)`
- `pk_vehicle_models`: `PRIMARY KEY (model_id)`
- `uq_manufacturer_model`: `UNIQUE (manufacturer_id, model_name)`
- `vehicle_models_body_type_not_null`: `NOT NULL body_type`
- `vehicle_models_created_at_not_null`: `NOT NULL created_at`
- `vehicle_models_manufacturer_id_not_null`: `NOT NULL manufacturer_id`
- `vehicle_models_model_id_not_null`: `NOT NULL model_id`
- `vehicle_models_model_name_not_null`: `NOT NULL model_name`

**Indexes**

- `idx_vehicle_models_manufacturer`: `CREATE INDEX idx_vehicle_models_manufacturer ON app.vehicle_models USING btree (manufacturer_id)`
- `pk_vehicle_models`: `CREATE UNIQUE INDEX pk_vehicle_models ON app.vehicle_models USING btree (model_id)`
- `uq_manufacturer_model`: `CREATE UNIQUE INDEX uq_manufacturer_model ON app.vehicle_models USING btree (manufacturer_id, model_name)`

### app.vehicle_variants

| Column | PostgreSQL type | Nullable | Default / generation | Key membership |
| --- | --- | --- | --- | --- |
| `variant_id` | `bigint` | No | GENERATED ALWAYS AS IDENTITY | PK |
| `model_id` | `bigint` | No | — | FK, UK |
| `variant_name` | `character varying(120)` | No | — | UK |
| `fuel_type` | `character varying(20)` | No | — | — |
| `transmission` | `character varying(20)` | No | — | — |
| `engine_displacement_cc` | `integer` | Yes | — | — |
| `battery_capacity_kwh` | `numeric(6,2)` | Yes | — | — |
| `seating_capacity` | `smallint` | No | 5 | — |
| `created_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |

**Exact constraints**

- `chk_battery_capacity`: `CHECK (battery_capacity_kwh IS NULL OR battery_capacity_kwh > 0::numeric)`
- `chk_engine_displacement`: `CHECK (engine_displacement_cc IS NULL OR engine_displacement_cc > 0)`
- `chk_seating_capacity`: `CHECK (seating_capacity >= 1 AND seating_capacity <= 20)`
- `chk_variant_fuel_type`: `CHECK (fuel_type::text = ANY (ARRAY['Petrol'::character varying, 'Diesel'::character varying, 'CNG'::character varying, 'LPG'::character varying, 'Electric'::character varying, 'Hybrid'::character varying]::text[]))`
- `chk_variant_transmission`: `CHECK (transmission::text = ANY (ARRAY['Manual'::character varying, 'Automatic'::character varying, 'AMT'::character varying, 'CVT'::character varying, 'DCT'::character varying, 'Single-speed'::character varying]::text[]))`
- `fk_vehicle_variants_model`: `FOREIGN KEY (model_id) REFERENCES app.vehicle_models(model_id)`
- `pk_vehicle_variants`: `PRIMARY KEY (variant_id)`
- `uq_model_variant`: `UNIQUE (model_id, variant_name)`
- `vehicle_variants_created_at_not_null`: `NOT NULL created_at`
- `vehicle_variants_fuel_type_not_null`: `NOT NULL fuel_type`
- `vehicle_variants_model_id_not_null`: `NOT NULL model_id`
- `vehicle_variants_seating_capacity_not_null`: `NOT NULL seating_capacity`
- `vehicle_variants_transmission_not_null`: `NOT NULL transmission`
- `vehicle_variants_variant_id_not_null`: `NOT NULL variant_id`
- `vehicle_variants_variant_name_not_null`: `NOT NULL variant_name`

**Indexes**

- `idx_vehicle_variants_fuel`: `CREATE INDEX idx_vehicle_variants_fuel ON app.vehicle_variants USING btree (fuel_type)`
- `idx_vehicle_variants_model`: `CREATE INDEX idx_vehicle_variants_model ON app.vehicle_variants USING btree (model_id)`
- `idx_vehicle_variants_transmission`: `CREATE INDEX idx_vehicle_variants_transmission ON app.vehicle_variants USING btree (transmission)`
- `pk_vehicle_variants`: `CREATE UNIQUE INDEX pk_vehicle_variants ON app.vehicle_variants USING btree (variant_id)`
- `uq_model_variant`: `CREATE UNIQUE INDEX uq_model_variant ON app.vehicle_variants USING btree (model_id, variant_name)`

### app.vehicles

| Column | PostgreSQL type | Nullable | Default / generation | Key membership |
| --- | --- | --- | --- | --- |
| `vehicle_id` | `bigint` | No | GENERATED ALWAYS AS IDENTITY | PK |
| `dealer_id` | `bigint` | No | — | FK |
| `variant_id` | `bigint` | No | — | FK |
| `manufacturing_year` | `smallint` | No | — | — |
| `registration_year` | `smallint` | Yes | — | — |
| `kms_driven` | `integer` | No | — | — |
| `colour` | `character varying(40)` | Yes | — | — |
| `ownership_count` | `smallint` | No | 1 | — |
| `condition` | `character varying(20)` | No | 'good'::character varying | — |
| `registration_number` | `character varying(20)` | Yes | — | — |
| `created_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |
| `updated_at` | `timestamp with time zone` | No | CURRENT_TIMESTAMP | — |

**Exact constraints**

- `chk_kms_driven`: `CHECK (kms_driven >= 0)`
- `chk_manufacturing_year`: `CHECK (manufacturing_year >= 1990 AND manufacturing_year <= 2030)`
- `chk_ownership_count`: `CHECK (ownership_count >= 1 AND ownership_count <= 10)`
- `chk_registration_year`: `CHECK (registration_year IS NULL OR registration_year >= 1990 AND registration_year <= 2030)`
- `chk_vehicle_condition`: `CHECK (condition::text = ANY (ARRAY['excellent'::character varying, 'good'::character varying, 'fair'::character varying, 'needs_repair'::character varying]::text[]))`
- `fk_vehicles_dealer`: `FOREIGN KEY (dealer_id) REFERENCES app.dealer_profiles(dealer_id)`
- `fk_vehicles_variant`: `FOREIGN KEY (variant_id) REFERENCES app.vehicle_variants(variant_id)`
- `pk_vehicles`: `PRIMARY KEY (vehicle_id)`
- `vehicles_condition_not_null`: `NOT NULL condition`
- `vehicles_created_at_not_null`: `NOT NULL created_at`
- `vehicles_dealer_id_not_null`: `NOT NULL dealer_id`
- `vehicles_kms_driven_not_null`: `NOT NULL kms_driven`
- `vehicles_manufacturing_year_not_null`: `NOT NULL manufacturing_year`
- `vehicles_ownership_count_not_null`: `NOT NULL ownership_count`
- `vehicles_updated_at_not_null`: `NOT NULL updated_at`
- `vehicles_variant_id_not_null`: `NOT NULL variant_id`
- `vehicles_vehicle_id_not_null`: `NOT NULL vehicle_id`

**Indexes**

- `idx_vehicles_dealer`: `CREATE INDEX idx_vehicles_dealer ON app.vehicles USING btree (dealer_id)`
- `idx_vehicles_kms`: `CREATE INDEX idx_vehicles_kms ON app.vehicles USING btree (kms_driven)`
- `idx_vehicles_variant`: `CREATE INDEX idx_vehicles_variant ON app.vehicles USING btree (variant_id)`
- `idx_vehicles_year`: `CREATE INDEX idx_vehicles_year ON app.vehicles USING btree (manufacturing_year)`
- `pk_vehicles`: `CREATE UNIQUE INDEX pk_vehicles ON app.vehicles USING btree (vehicle_id)`

## Derived objects

- View `app.active_listing_details`; full definition in the catalog snapshot and schema 14.
- View `app.dealer_inventory_summary`; full definition in the catalog snapshot and schema 14.
- Function `app.search_active_listings(p_city_id smallint, p_max_price numeric, p_fuel_type text, p_transmission text)`.
- Function `app.set_updated_at()`.
- `trg_dealer_profiles_set_updated_at` on `app.dealer_profiles`: `EXECUTE FUNCTION app.set_updated_at()` before each update.
- `trg_vehicle_listings_set_updated_at` on `app.vehicle_listings`: `EXECUTE FUNCTION app.set_updated_at()` before each update.
- `trg_vehicles_set_updated_at` on `app.vehicles`: `EXECUTE FUNCTION app.set_updated_at()` before each update.

## Additional validation and workflow rules

- Only verified dealer accounts may publish. FKs do not independently check user role or verification state.
- Vehicle-year CHECKs are fixed at 1990–2030. The create-listing API additionally rejects future years and registration before manufacture.
- Description length 20–5000 and a maximum of six photos are API rules. Stored image payloads have a database 2 MB CHECK; the API also validates and normalizes uploads.
- A buyer may edit an owned offer only while the listing is active, the dealer is verified, and contacted_at is NULL. The API uses transaction row locks through a guarded database function. Schema 20 also enforces offer ownership and editable state with RLS and an update trigger.
- Offer positivity and conditional NULL rules are database-enforced. The API additionally validates decimal input before PostgreSQL numeric conversion.
- listing_enquiries.updated_at is set by the offer API, not the generic timestamp trigger. users.updated_at has a default but no update trigger.
- Mark contacted is entered by the dealer, not detection of an external call/email. Sold listing status does not record a sale transaction or confirmed sale price.
- Registration numbers are not unique; primary-image selection has no unique partial index. Do not claim these constraints in the report.
- Positive estimate bounds and lower <= upper are enforced. No CHECK requires the central estimate to lie within those bounds.
