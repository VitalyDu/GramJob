# Sprint 4 Frontend — Resumes & Applications Design

**Date:** 2026-06-26  
**Sprint goal:** Кандидат откликается на вакансию, работодатель управляет откликами, контакты скрыты до одобрения.

---

## Решения по дизайну

- **Employer view** — список с дропдауном статуса (не kanban)
- **Apply flow** — модальное окно поверх страницы вакансии
- **База резюме для не-Max** — upsell-загородка на странице (не редирект)
- **Структура сторов** — два отдельных: ResumeStore + ApplicationStore (Вариант A)

---

## Секция 1: Типы и утилиты

### `frontend/src/types/api.ts` — добавить

```typescript
// Resume
export type ResumeStatusEnum = 'draft' | 'moderation' | 'published' | 'rejected' | 'archived'
export type ResumeCurrencyEnum = 'USD' | 'EUR' | 'RUB' | 'GBP'
export type ResumeWorkFormatEnum = 'office' | 'remote' | 'hybrid' | 'any'
export type ResumeEmploymentTypeEnum =
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'internship'
  | 'freelance'

export interface WorkExperience {
  id?: number
  company: string
  position: string
  startDate: string
  endDate?: string | null
  current: boolean
  description?: string | null
}

export interface Education {
  id?: number
  institution: string
  degree: string
  field: string
  startDate: string
  endDate?: string | null
  current: boolean
}

export interface ResumeContacts {
  phone?: string
  email?: string
  telegram?: string
  linkedin?: string
}

export interface ResumeUserRef {
  id: number
  firstName: string
  lastName: string
}

export interface Resume {
  id: number
  documentId: string
  title: string
  firstName: string
  lastName: string
  avatar?: StrapiMedia | null
  country: string
  city?: string | null
  desiredSalary?: number | null
  currency?: ResumeCurrencyEnum | null
  workFormat: ResumeWorkFormatEnum
  employmentType: ResumeEmploymentTypeEnum
  experienceYears?: number | null
  about?: string | null
  skills?: string[] | null
  languages?: Array<{ lang: string; level: string }> | null
  contacts?: ResumeContacts | null // null если нет доступа
  workExperience?: WorkExperience[]
  education?: Education[]
  views: number
  invitations?: number
  status: ResumeStatusEnum
  user?: ResumeUserRef | null
  createdAt: string
}

export interface ResumeListParams {
  search?: string
  country?: string
  city?: string
  workFormat?: ResumeWorkFormatEnum
  employmentType?: ResumeEmploymentTypeEnum
  experienceYears?: number
  page?: number
  pageSize?: number
}

export interface ResumeCreateInput {
  title: string
  firstName: string
  lastName: string
  country: string
  city?: string
  desiredSalary?: number
  currency?: ResumeCurrencyEnum
  workFormat: ResumeWorkFormatEnum
  employmentType: ResumeEmploymentTypeEnum
  experienceYears?: number
  about?: string
  skills?: string[]
  languages?: Array<{ lang: string; level: string }>
  contacts?: ResumeContacts
  workExperience?: Omit<WorkExperience, 'id'>[]
  education?: Omit<Education, 'id'>[]
}

export type ResumeUpdateInput = Partial<ResumeCreateInput>

// Application
export type ApplicationStatusEnum =
  | 'applied'
  | 'viewed'
  | 'in-review'
  | 'interview'
  | 'test-task'
  | 'offer'
  | 'hired'
  | 'rejected'

export interface ApplicationVacancyRef {
  documentId: string
  title: string
  status: VacancyStatusEnum
  sourceType: SourceTypeEnum
  company?: { documentId: string; name: string; slug: string }
}

export interface ApplicationResumeRef {
  documentId: string
  title: string
  firstName: string
  lastName: string
  status: ResumeStatusEnum
}

export interface ApplicationUserRef {
  id: number
  firstName: string
  lastName: string
}

export interface Application {
  id: number
  documentId: string
  vacancy: ApplicationVacancyRef
  resume: ApplicationResumeRef
  user: ApplicationUserRef
  status: ApplicationStatusEnum
  coverLetter?: string | null
  createdAt: string
}

export interface ApplicationCreateInput {
  vacancyId: string
  resumeId: string
  coverLetter?: string
}
```

### `frontend/src/lib/resume-utils.ts`

```typescript
export const RESUME_WORK_FORMAT_LABELS: Record<string, string> = {
  office: 'Офис',
  remote: 'Удалённо',
  hybrid: 'Гибрид',
  any: 'Любой',
}

export const RESUME_EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Полная занятость',
  'part-time': 'Частичная занятость',
  contract: 'Контракт',
  internship: 'Стажировка',
  freelance: 'Фриланс',
}

export const RESUME_CURRENCY_LABELS: Record<string, string> = {
  USD: '$ USD',
  EUR: '€ EUR',
  RUB: '₽ RUB',
  GBP: '£ GBP',
}

export function formatExperience(years?: number | null): string
export function canPublishResume(status: string): boolean // draft | rejected → true
export function canEditResume(status: string): boolean // draft | rejected | published → true
export function canArchiveResume(status: string): boolean // draft | published | rejected → true
```

---

## Секция 2: Сторы

### `frontend/src/stores/ResumeStore.ts`

```typescript
class ResumeStore {
  resumes: Resume[] = [] // публичный каталог
  myResumes: Resume[] = [] // мои резюме
  currentResume: Resume | null = null
  isLoading = false
  error: string | null = null
  total = 0
  page = 1
  pageSize = 20

  // computed
  get pageCount(): number

  // actions
  async fetchResumes(params?: ResumeListParams): Promise<void>
  async fetchMyResumes(page?: number): Promise<void>
  async fetchResumeById(id: string): Promise<void>
  async createResume(input: ResumeCreateInput): Promise<Resume>
  async updateResume(id: string, input: ResumeUpdateInput): Promise<void>
  async publishResume(id: string): Promise<void>
  async archiveResume(id: string): Promise<void>
}
```

**Тесты:** ~16 тестов (паттерн VacancyStore.test.ts)

### `frontend/src/stores/ApplicationStore.ts`

```typescript
class ApplicationStore {
  myApplications: Application[] = [] // кандидат — мои отклики
  vacancyApplications: Application[] = [] // работодатель — отклики на вакансию
  isLoading = false
  error: string | null = null
  limitReached = false
  total = 0
  page = 1
  pageSize = 20

  get pageCount(): number

  async createApplication(input: ApplicationCreateInput): Promise<void>
  async fetchMyApplications(page?: number): Promise<void>
  async fetchVacancyApplications(vacancyId: string, page?: number): Promise<void>
  async updateApplicationStatus(id: string, status: ApplicationStatusEnum): Promise<void>
  clearLimitReached(): void
}
```

**Тесты:** ~12 тестов

### `frontend/src/stores/RootStore.ts` — добавить:

```typescript
resume: ResumeStore
application: ApplicationStore
```

---

## Секция 3: Компоненты

### `components/resume/ResumeStatusBadge.tsx`

Бейдж статуса. Цветовая схема:

- `draft` — серый
- `moderation` — жёлтый
- `published` — зелёный
- `rejected` — красный
- `archived` — тёмно-серый

### `components/resume/ResumeCard.tsx`

Карточка для каталога: аватар (или инициалы), имя + title, страна/город, workFormat, employmentType, опыт, зарплатные ожидания, бейдж статуса. Ссылка на `/resumes/:documentId`.

### `components/resume/ResumeForm.tsx`

React Hook Form + Zod. Секции:

1. **Основное** — title, firstName, lastName, country, city
2. **Параметры** — workFormat, employmentType, experienceYears, desiredSalary, currency
3. **О себе** — about, skills (теги через запятую), languages (теги)
4. **Опыт работы** — `useFieldArray` для workExperience[]
5. **Образование** — `useFieldArray` для education[]
6. **Контакты** — phone, email, telegram, linkedin

### `components/application/ApplicationStatusBadge.tsx`

Бейдж для 8 статусов:

- `applied` — синий (Отправлен)
- `viewed` — голубой (Просмотрен)
- `in-review` — жёлтый (На рассмотрении)
- `interview` — фиолетовый (Интервью)
- `test-task` — оранжевый (Тестовое)
- `offer` — зелёный (Оффер)
- `hired` — тёмно-зелёный (Принят)
- `rejected` — красный (Отклонён)

### `components/application/ApplicationCard.tsx`

Карточка отклика: название вакансии/резюме + компания, `ApplicationStatusBadge`, дата, cover letter (сворачиваемый блок).

### `components/application/ApplyDialog.tsx`

Модальное окно:

- Select резюме из `resumeStore.myResumes` (только published)
- Textarea cover letter (необязательно)
- Кнопка «Отправить» → `applicationStore.createApplication(...)`
- LIMIT_REACHED → открывает UpsellModal
- Успех → toast + закрытие диалога

---

## Секция 4: Страницы

### Публичные

**`/resumes`**

- Если пользователь не Max/VIP → upsell-загородка (иконка замка, заголовок «База резюме», описание преимуществ, CTA кнопка «Перейти на Max»)
- Если Max/VIP → поиск (search), фильтры (workFormat, employmentType, experienceYears), список `ResumeCard`, пагинация

**`/resumes/[id]`**

- Полная карточка: аватар, имя, about, опыт, образование, навыки, языки
- Контакты: если `resume.contacts !== null` — показываем, иначе блок «Контакты доступны после одобрения отклика»
- Кнопка «Пригласить» — заглушка (Sprint 7)

### Dashboard — кандидат

**`/dashboard/resumes`**

- Список `myResumes`, кнопки: «На модерацию» (canPublish), «Редактировать» (canEdit), «В архив» (canArchive)
- Лимит-бар резюме (аналог LimitBar для вакансий)
- Кнопка «+ Создать резюме»

**`/dashboard/resumes/new`** → CreateResumeClient → ResumeForm → redirect `/dashboard/resumes`

**`/dashboard/resumes/[id]/edit`** → EditResumeClient → ResumeForm с defaultValues → redirect `/dashboard/resumes`

**`/dashboard/applications`**

- Список откликов кандидата (`myApplications`)
- `ApplicationCard` с timeline статуса (текущий статус выделен)
- Пагинация

### Dashboard — работодатель

**`/dashboard/vacancies/[id]/applications`**

- Заголовок с названием вакансии
- Список `ApplicationCard` + дропдаун статуса рядом (select с допустимыми переходами)
- Смена статуса → `store.updateApplicationStatus(id, newStatus)`, ошибка невалидного перехода → toast
- Ссылка на резюме кандидата
- Пагинация

### Интеграция в существующие страницы

**`/vacancies/[id]/VacancyDetailClient.tsx`**

- Кнопка «Откликнуться» только для `sourceType === 'internal'` + `status === 'published'`
- Кнопка скрыта если: не авторизован, или уже есть отклик (проверяем через `applicationStore`)
- Клик → открывает `ApplyDialog` с `vacancyId`
- После успешного отклика кнопка меняется на «Отклик отправлен» (disabled)

---

## Ограничения MVP

- Контакты в `/resumes/[id]` проверяются только на `null` (бэкенд решает логику)
- Дропдаун статуса у работодателя показывает все 8 статусов, невалидные блокируются ошибкой бэкенда (не на клиенте)
- ApplyDialog загружает все published резюме без пагинации (достаточно для MVP: лимит 1/5/20 резюме по плану)

---

## Файловая карта

```
frontend/src/
  types/api.ts                                          ← добавить Resume/Application типы
  lib/resume-utils.ts                                   ← новый файл
  stores/ResumeStore.ts                                 ← новый файл
  stores/ResumeStore.test.ts                            ← новый файл
  stores/ApplicationStore.ts                            ← новый файл
  stores/ApplicationStore.test.ts                       ← новый файл
  stores/RootStore.ts                                   ← обновить
  components/resume/ResumeStatusBadge.tsx               ← новый файл
  components/resume/ResumeStatusBadge.test.tsx          ← новый файл
  components/resume/ResumeCard.tsx                      ← новый файл
  components/resume/ResumeCard.test.tsx                 ← новый файл
  components/resume/ResumeForm.tsx                      ← новый файл
  components/application/ApplicationStatusBadge.tsx     ← новый файл
  components/application/ApplicationStatusBadge.test.tsx ← новый файл
  components/application/ApplicationCard.tsx            ← новый файл
  components/application/ApplicationCard.test.tsx       ← новый файл
  components/application/ApplyDialog.tsx                ← новый файл
  app/resumes/page.tsx                                  ← новый файл
  app/resumes/ResumesClient.tsx                         ← новый файл
  app/resumes/ResumesClient.test.tsx                    ← новый файл
  app/resumes/[id]/page.tsx                             ← новый файл
  app/resumes/[id]/ResumeDetailClient.tsx               ← новый файл
  app/resumes/[id]/ResumeDetailClient.test.tsx          ← новый файл
  app/dashboard/resumes/page.tsx                        ← новый файл
  app/dashboard/resumes/MyResumesClient.tsx             ← новый файл
  app/dashboard/resumes/MyResumesClient.test.tsx        ← новый файл
  app/dashboard/resumes/new/page.tsx                    ← новый файл
  app/dashboard/resumes/new/CreateResumeClient.tsx      ← новый файл
  app/dashboard/resumes/new/CreateResumeClient.test.tsx ← новый файл
  app/dashboard/resumes/[id]/edit/page.tsx              ← новый файл
  app/dashboard/resumes/[id]/edit/EditResumeClient.tsx  ← новый файл
  app/dashboard/resumes/[id]/edit/EditResumeClient.test.tsx ← новый файл
  app/dashboard/applications/page.tsx                   ← новый файл
  app/dashboard/applications/MyApplicationsClient.tsx   ← новый файл
  app/dashboard/applications/MyApplicationsClient.test.tsx ← новый файл
  app/dashboard/vacancies/[id]/applications/page.tsx    ← новый файл
  app/dashboard/vacancies/[id]/applications/VacancyApplicationsClient.tsx ← новый файл
  app/dashboard/vacancies/[id]/applications/VacancyApplicationsClient.test.tsx ← новый файл
  app/vacancies/[id]/VacancyDetailClient.tsx            ← обновить (кнопка Откликнуться)
```
