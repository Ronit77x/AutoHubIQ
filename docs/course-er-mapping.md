# AutoHubIQ Course ER Diagrams and Relational Mapping

Revised 16 November 2026 to follow the notation shown in the supplied course example. The application schema and data are unchanged. Database evidence remains dated 15 November 2026.

[Printable diagram PDF](../output/pdf/AutoHubIQ_ER_and_Relational_Mapping.pdf) contains six Chen ER sheets paired with six relational mapping sheets. All fourteen entities and thirteen implemented foreign-key relationships are covered. Use the SVG links below to zoom or print individual modules.

## Diagram sheets

| Module | Chen ER diagram | ER to relational mapping |
| --- | --- | --- |
| Accounts and dealership ownership | [ER diagram](diagrams/course/chen-01-accounts.svg) | [Mapping](diagrams/course/mapping-01-accounts.svg) |
| Vehicle catalogue | [ER diagram](diagrams/course/chen-02-catalogue.svg) | [Mapping](diagrams/course/mapping-02-catalogue.svg) |
| Physical inventory and listings | [ER diagram](diagrams/course/chen-03-inventory.svg) | [Mapping](diagrams/course/mapping-03-inventory.svg) |
| Listing images and uploaded content | [ER diagram](diagrams/course/chen-04-images.svg) | [Mapping](diagrams/course/mapping-04-images.svg) |
| Price estimates and semantic embeddings | [ER diagram](diagrams/course/chen-05-estimates.svg) | [Mapping](diagrams/course/mapping-05-estimates.svg) |
| Buyer enquiries test drives and offers | [ER diagram](diagrams/course/chen-06-interactions.svg) | [Mapping](diagrams/course/mapping-06-interactions.svg) |

## Notation and mapping

The following sheets use the course notation: rectangles for entity sets, diamonds for relationships, ovals for attributes and underlined primary keys. Participation is written as (min,max) at each entity, with a double line for total child participation. Six modules collectively cover all fourteen entities and thirteen implemented foreign-key relationships. Repeated entities connect the modules and retain the same identifier.

### Mapping rules
- Each regular entity becomes a relation containing its simple stored attributes. Underlined ER keys become primary keys.
- A 1:N relationship places the parent primary key as a foreign key in the N-side relation. The foreign key is NOT NULL because implemented child participation is (1,1).
- A 1:1 relationship uses a UNIQUE foreign key on the mandatory child side. dealer_profiles.user_id follows this rule.
- listing_embeddings.listing_id and listing_image_data.image_id serve as both primary and foreign keys. Their shared identifiers preserve the one-to-one dependency; no invented partial key or discriminator is introduced.
- No M:N relationship or multivalued attribute is asserted for the current schema, so no additional junction relation is invented. Non-key foreign-key attributes are omitted from the ER ovals because relationships carry that information; every actual column appears in the mapping sheets.
- request_limits is an independent operational relation. Application roles, offer-edit rules, CHECK constraints and composite UNIQUE constraints remain documented separately.

### Relationship to relation mapping
| Relationship | Cardinality | Relational mapping |
| --- | --- | --- |
| City locates dealership | 1:N | dealer_profiles.city_id references cities.city_id |
| User owns dealer profile | 1:1 | dealer_profiles.user_id is UNIQUE and references users.user_id |
| Manufacturer makes model | 1:N | vehicle_models.manufacturer_id references manufacturers.manufacturer_id |
| Model offers variant | 1:N | vehicle_variants.model_id references vehicle_models.model_id |
| Dealer owns vehicle | 1:N | vehicles.dealer_id references dealer_profiles.dealer_id |
| Variant describes vehicle | 1:N | vehicles.variant_id references vehicle_variants.variant_id |
| Vehicle has listing | 1:N | vehicle_listings.vehicle_id references vehicles.vehicle_id |
| Listing has image | 1:N | listing_images.listing_id references vehicle_listings.listing_id |
| Image stores uploaded content | 1:1 | listing_image_data.image_id is PK and FK to listing_images.image_id |
| Listing has dated estimate | 1:N | listing_price_estimates.listing_id references vehicle_listings.listing_id |
| Listing has embedding | 1:1 | listing_embeddings.listing_id is PK and FK to vehicle_listings.listing_id |
| Listing receives interaction | 1:N | listing_enquiries.listing_id references vehicle_listings.listing_id |
| User submits interaction | 1:N | listing_enquiries.user_id references users.user_id |



## Consistency with the implementation

- A vehicle may have several historical listings; at most one is active, enforced by a partial unique index rather than by changing the ER relationship to 1:1.
- A user may own zero or one dealer profile. The stored user_id is UNIQUE and NOT NULL in dealer_profiles.
- Each listing has at most one embedding, and each image at most one uploaded payload. Their PKs are also FKs. Optional parent participation does not make the child foreign key nullable.
- listing_enquiries includes offers as well as enquiries and test drives. An offer is not a separate auction or payment entity.
- The diagram does not add weak entities, multivalued attributes, derived attributes or role-specialization hierarchies merely to resemble the reference. Those structures are not asserted by this schema.
- Foreign keys are implementation attributes introduced by the mapping. In the Chen model, non-key foreign keys are represented by relationship diamonds. Shared primary identifiers remain underlined.
- Composite unique constraints are listed in the [complete data dictionary](relational-schema.md); they are not misrepresented as additional primary keys.

These Chen and compartment diagrams replace the superseded crow-foot and physical box diagrams and are the course submission diagrams.
