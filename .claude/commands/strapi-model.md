# Add Strapi Content Type

Use when adding a new model or significant fields to an existing model.

## Steps

1. **Design the schema** — write out all fields, types, relations before touching code. Reference `docs/database-schema.md` for conventions.

2. **Create or update schema.json:**
   ```
   backend/src/api/<name>/content-types/<name>/schema.json
   ```

   Always set `"draftAndPublish": false` — GramJob manages status manually.

3. **Add indexes** — document them in `docs/database-schema.md`. For PostgreSQL GIN indexes on JSON fields, add raw migration.

4. **Create lifecycle hooks** if needed:
   ```
   backend/src/api/<name>/content-types/<name>/lifecycles.ts
   ```

5. **Create/update routes, controllers, services** for any custom behavior.

6. **Update permissions** in Strapi Admin → Users & Permissions → Roles.

7. **Update documentation:**
   - `docs/database-schema.md` — add/update model section
   - `docs/api-specification.md` — add/update endpoints
   - `CLAUDE.md` Key models table if it's a top-level model

8. **Test** — write integration test covering create/read/update lifecycle.

## Naming conventions

- Schema: camelCase singular (`vacancy`, `vacancyAnalytics`)
- Collection: camelCase plural in DB (`vacancies`, `vacancy_analytics`)
- Relations: use descriptive names matching the relationship intent
- JSON fields: use for arrays of primitives (skills, languages); use relations for structured data

## Required fields on every model

Every content type should have explicit `createdAt` (auto by Strapi).
Add `status` enum if the entity has a lifecycle.
