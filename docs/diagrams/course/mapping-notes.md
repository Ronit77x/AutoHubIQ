The following sheets use the course notation: rectangles for entity sets, diamonds for relationships, ovals for attributes and underlined primary keys. Participation is written as (min,max) at each entity, with a double line for total child participation. Six modules collectively cover all fourteen entities and thirteen implemented foreign-key relationships. Repeated entities connect the modules and retain the same identifier.

### Mapping rules
Map each entity to a relation and retain its underlined primary key. For 1:N, copy the parent key into the N-side as a NOT NULL foreign key. For 1:1, use a UNIQUE foreign key on the mandatory child side. Preserve the shared PK/FK identifiers of embeddings and uploaded image payloads.

No M:N relationship, multivalued attribute or partial key is invented. Non-key foreign keys are omitted from ER ovals and restored in the relational mapping. request_limits is independent. CHECK constraints, composite uniqueness and API rules are documented separately.

### Relationship to relation mapping
| Relationship | Cardinality | Relational mapping |
| --- | --- | --- |
| City locates dealership | 1:N | dealer_profiles.city_id -> cities.city_id |
| User owns dealer profile | 1:1 | dealer_profiles.user_id UNIQUE FK -> users.user_id |
| Manufacturer makes model | 1:N | vehicle_models.manufacturer_id -> manufacturers.manufacturer_id |
| Model offers variant | 1:N | vehicle_variants.model_id -> vehicle_models.model_id |
| Dealer owns vehicle | 1:N | vehicles.dealer_id -> dealer_profiles.dealer_id |
| Variant describes vehicle | 1:N | vehicles.variant_id -> vehicle_variants.variant_id |
| Vehicle has listing | 1:N | vehicle_listings.vehicle_id -> vehicles.vehicle_id |
| Listing has image | 1:N | listing_images.listing_id -> vehicle_listings.listing_id |
| Image stores uploaded content | 1:1 | listing_image_data.image_id PK/FK -> listing_images.image_id |
| Listing has dated estimate | 1:N | listing_price_estimates.listing_id -> vehicle_listings.listing_id |
| Listing has embedding | 1:1 | listing_embeddings.listing_id PK/FK -> vehicle_listings.listing_id |
| Listing receives interaction | 1:N | listing_enquiries.listing_id -> vehicle_listings.listing_id |
| User submits interaction | 1:N | listing_enquiries.user_id -> users.user_id |

{{COMPLETE}}
