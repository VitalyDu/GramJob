# New Feature Workflow

Use this when starting work on any new GramJob feature.

## Steps

1. **Read business rules** — open `docs/business-logic.md` and find all rules related to this feature. Note any unclear or missing rules.

2. **Check the data model** — open `docs/database-schema.md` to see if new fields/models are needed.

3. **Identify affected APIs** — check `docs/api-specification.md` for existing endpoints. Do we need new ones?

4. **Consult the right agent:**
   - Business logic unclear → `@product-manager`
   - Architecture question → `@system-architect`
   - Frontend design → `@frontend-architect`
   - Backend/Strapi → `@backend-architect`
   - DB schema change → `@database-architect`
   - Telegram-related → `@telegram-miniapp-expert`

5. **Plan before coding** — invoke `superpowers:writing-plans` to create an implementation plan.

6. **Implement with TDD** — invoke `superpowers:test-driven-development` during implementation.

7. **Verify** — invoke `superpowers:verification-before-completion` before marking as done.

## Checklist

Before calling a feature complete:
- [ ] Business rules from docs are respected
- [ ] All user roles considered (candidate, employer, both)
- [ ] Plan restrictions enforced (Free/Pro/Max)
- [ ] Loading, error, and empty states handled
- [ ] i18n: all strings use `t()` keys
- [ ] Moderation flow considered if needed
- [ ] Telegram notifications triggered if needed
- [ ] Tests written (at least happy path + limit reached)
