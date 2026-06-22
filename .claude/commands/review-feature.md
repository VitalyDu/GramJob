# Feature Review Checklist

Use before submitting any feature for review or marking as complete.

## Business Logic

- [ ] All business rules from `docs/business-logic.md` are respected
- [ ] All user roles considered: candidate, employer (may be same user)
- [ ] Plan restrictions enforced: Free / Pro / Max gates checked server-side
- [ ] Subscription limits validated in service layer (not just controller)
- [ ] Contact visibility rules respected (candidate sees employer contacts only after approval)
- [ ] Moderation required where applicable (vacancy, resume, company)
- [ ] Telegram notifications triggered for all relevant events

## API

- [ ] Endpoint follows conventions from `docs/api-specification.md`
- [ ] Auth required where needed (no accidental public endpoints)
- [ ] Ownership verified before mutations
- [ ] Error responses follow standard format with `code` and `details`
- [ ] Pagination implemented for list endpoints
- [ ] Rate limiting in place for write endpoints

## Frontend

- [ ] Server Component used where possible (no unnecessary `'use client'`)
- [ ] All strings via `t()` — no hardcoded Russian or English text
- [ ] Loading state handled (skeleton or spinner)
- [ ] Error state handled (user-friendly message)
- [ ] Empty state handled (no blank screen)
- [ ] Mobile/Telegram Mini App layout tested
- [ ] Dark theme (Telegram) tested

## Database

- [ ] N+1 queries avoided (relations populated in single query)
- [ ] New indexes documented in `docs/database-schema.md`
- [ ] Soft delete used (status=archived) not hard delete
- [ ] No raw SQL with user input (injection prevention)

## Testing

- [ ] Happy path test exists
- [ ] Limit/quota error tested
- [ ] Unauthorized access tested (403 expected)
- [ ] Edge case: entity not found (404 expected)

## Documentation

- [ ] New endpoint added to `docs/api-specification.md`
- [ ] Schema changes in `docs/database-schema.md`
- [ ] Business rule changes in `docs/business-logic.md`
