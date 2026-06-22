# Check Subscription Limits

Use when implementing any feature that consumes user limits (publish vacancy, apply, boost, etc.).

## Limit types

| Action | Limit field | Reset |
|--------|------------|-------|
| Publish vacancy | `vacanciesPerMonth` (plan) or `vacancyCredits` (package) | Monthly |
| Active vacancies | `activeVacanciesLimit` | Real-time count |
| Apply to vacancy | `applicationsPerDay` (plan) or `applyCredits` (package) | Daily 00:00 UTC |
| Boost vacancy | `vacancyBoostsPerDay` | Daily 00:00 UTC |
| Create resume | `resumesLimit` | Real-time count |
| Access resume DB | `resumeDatabaseAccess` | Boolean by plan |

## Implementation pattern

```typescript
// In Strapi service
async function checkAndConsumeVacancyCredit(userId: number): Promise<void> {
  const user = await strapi.documents('plugin::users-permissions.user').findOne({
    documentId: userId
  })
  
  // 1. Try package credits first
  if (user.vacancyCredits > 0) {
    await strapi.documents('plugin::users-permissions.user').update({
      documentId: userId,
      data: { vacancyCredits: user.vacancyCredits - 1 }
    })
    return
  }
  
  // 2. Check plan monthly limit
  const plan = await getPlanLimits(user.subscriptionPlan)
  const usedThisMonth = await countVacanciesPublishedThisMonth(userId)
  
  if (usedThisMonth >= plan.vacanciesPerMonth) {
    throw new ApplicationError('LIMIT_REACHED', {
      type: 'vacancies_per_month',
      limit: plan.vacanciesPerMonth,
      used: usedThisMonth,
      upgradeUrl: '/subscription'
    })
  }
}
```

## Error response format

```json
{
  "error": {
    "code": "LIMIT_REACHED",
    "message": "...",
    "details": {
      "type": "vacancies_per_month | applications_per_day | ...",
      "limit": 3,
      "used": 3,
      "resetAt": "2025-02-01T00:00:00Z"  // for monthly
    }
  }
}
```

## Frontend handling

- Show limit counter in UI before action (e.g., "2/3 вакансий использовано")
- On `LIMIT_REACHED` error: show modal with upsell to higher plan or package
- Show `resetAt` date if relevant
