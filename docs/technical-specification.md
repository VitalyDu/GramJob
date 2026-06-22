Gram Job — Technical Specification

1. Technology Stack

Frontend

- Next.js 15
- React 19
- TypeScript
- MobX
- TailwindCSS 4
- Telegram UI
- Shadcn/UI
- React Hook Form
- Zod
- i18next

Backend

- Strapi 5

Database

- PostgreSQL

Storage

- S3 Compatible Storage

Authentication

- Telegram Login
- Email + Password

⸻

2. Architecture

Frontend:

Next.js Application

Backend:

Strapi Headless CMS

Database:

PostgreSQL

Communication:

REST API

⸻

3. User Model

User {
id
email
telegramId
firstName
lastName
avatar
language
subscriptionPlan
subscriptionExpiresAt
vacancyCredits
applyCredits
createdAt
}

⸻

4. Company Model

Company {
id
ownerId
name
slug
logo
cover
description
website
telegram
linkedin
country
city
companySize
status
createdAt
}

⸻

5. Vacancy Model

Vacancy {
id
companyId
title
industryId
specializationId
employmentType
workFormat
seniority
country
city
salaryFrom
salaryTo
salaryCurrency
description
responsibilities
requirements
conditions
skills[]
languages[]
experienceYears
sourceType
sourceName
sourceUrl
highlighted
urgent
topPlacement
views
uniqueViews
applicationsCount
status
expiresAt
createdAt
}

⸻

6. Resume Model

Resume {
id
userId
title
firstName
lastName
avatar
country
city
desiredSalary
currency
workFormat
employmentType
experienceYears
about
skills[]
languages[]
contacts
views
invitations
status
createdAt
}

⸻

7. Application Model

Application {
id
vacancyId
resumeId
userId
status
coverLetter
createdAt
}

⸻

8. Subscription Plans

SubscriptionPlan {
id
code
vacanciesPerMonth
activeVacanciesLimit
vacancyBoostsPerDay
applicationsPerDay
resumesLimit
resumeDatabaseAccess
}

⸻

9. Vacancy Packages

VacancyPackage {
id
name
vacancyCredits
boostCredits
starsPrice
}

⸻

10. Apply Packages

ApplyPackage {
id
name
applyCredits
starsPrice
}

⸻

11. Vacancy Source

VacancySource {
id
provider
externalId
originalUrl
parsedAt
updatedAt
}

⸻

12. Analytics

Vacancy Analytics

VacancyAnalytics {
vacancyId
date
views
uniqueViews
applications
ctr
}

⸻

Resume Analytics

ResumeAnalytics {
resumeId
date
views
uniqueViews
invitations
}

⸻

13. Notifications

Notification {
id
userId
type
title
body
isRead
createdAt
}

⸻

14. Telegram Bot Events

Candidate:

- ResumeViewed
- ApplicationApproved
- ApplicationRejected
- InterviewInvitation
- OfferReceived

Employer:

- NewApplication
- VacancyViewed
- SubscriptionExpired
- LimitsReached

⸻

15. Filters

Vacancy Filters

- Industry
- Specialization
- Country
- City
- Salary From
- Salary To
- Currency
- Employment Type
- Work Format
- Experience
- Skills
- Languages
- Urgent
- Top
- Pro
- Max
- VIP
- Internal
- External

⸻

Resume Filters

- Position
- Industry
- Specialization
- Salary
- Country
- City
- Experience
- Skills
- Languages
- Employment Type
- Work Format

⸻

16. Moderation

Все сущности проходят обязательную модерацию.

Под модерацию попадают:

- вакансии;
- резюме;
- компании.

⸻

17. Search

Поддержка:

- полнотекстового поиска;
- поиска по навыкам;
- поиска по компаниям;
- поиска по категориям.

⸻

18. Internationalization

Все тексты системы должны поддерживать:

- RU
- EN

Через i18next.

⸻

19. Security

- JWT Authentication
- Telegram Signature Validation
- Rate Limiting
- CSRF Protection
- RBAC
- Audit Logs

⸻

20. Performance Requirements

- TTFB < 500 ms
- Lighthouse > 90
- SEO Ready
- SSR + ISR

⸻

21. Claude Code Project Structure

/docs
business-logic.md
technical-specification.md
database-schema.md
api-specification.md
subscription-system.md
moderation-system.md
telegram-bot-specification.md

/.claude/agents
product-manager.md
system-architect.md
frontend-architect.md
backend-architect.md
database-architect.md
telegram-miniapp-expert.md
strapi-expert.md
qa-engineer.md
security-engineer.md
devops-engineer.md
