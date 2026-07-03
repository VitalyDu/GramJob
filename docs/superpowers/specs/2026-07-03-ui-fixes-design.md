# UI Fixes Design — Sprint 10 Polish

Date: 2026-07-03

## Scope

Nine targeted UI/UX fixes for the GramJob frontend. No new pages, no backend data model changes beyond filter query handling.

---

## 1. Notification Icon

**File:** `frontend/src/components/notification/NotificationBadge.tsx`

Replace the `🔔` emoji with `<Bell className="h-5 w-5" />` from `lucide-react`. Keep the red badge and count logic unchanged.

---

## 2. Remove "Статистика сервиса" Block

**File:** `frontend/src/app/page.tsx`

Remove the `<section aria-label="Статистика сервиса">` block and its three `StatCard` children. Also remove the `StatCard` component definition and the `pluralizeRu` helper since they will be unused. The `getHomeStats` import and call in `Promise.all` should also be removed.

---

## 3. Language Switcher in Header

**File:** `frontend/src/components/layout/WebHeader.tsx`

Add a language toggle button between `NotificationBadge` and the user avatar. Use `Globe` icon from lucide-react as the trigger for a `DropdownMenu` containing two items:

- «Русский» (sets `i18next.changeLanguage('ru')`)
- «English» (sets `i18next.changeLanguage('en')`)

The active language item shows a checkmark. Language selection is persisted via `localStorage` (i18next already handles this via the `languageDetector` plugin). The switcher is shown for both authenticated and unauthenticated users. On mobile it is always visible.

---

## 4. Country Display: ISO Codes → Human-Readable Names

**New file:** `frontend/src/lib/countries.ts`

A static map of ~200 ISO 3166-1 alpha-2 codes to display names in Russian (e.g. `RU → 'Россия'`, `US → 'США'`, `DE → 'Германия'`).

Export:

- `COUNTRIES: Record<string, string>` — full map
- `COUNTRIES_LIST: { code: string; name: string }[]` — sorted array for use in selects
- `getCountryName(code: string): string` — returns name or the code itself if not found

Anywhere the `country` field is displayed (vacancy cards, resume cards, company cards, detail pages) must call `getCountryName(country)` instead of rendering the raw code.

Files to update:

- `components/vacancy/VacancyCard.tsx`
- `components/vacancy/VacancyForm.tsx`
- `components/resume/ResumeCard.tsx`
- `components/resume/ResumeForm.tsx`
- `components/company/CompanyCard.tsx`
- `components/company/CompanyForm.tsx`
- Any detail pages that render the country field directly

The backend continues to store and accept ISO codes — no backend changes needed.

---

## 5. Country Input → Combobox with Search

**New file:** `frontend/src/components/ui/country-select.tsx`

A reusable combobox component built with shadcn `Popover` + `Command` + `CommandInput`. Shows a button with the selected country name (or placeholder), opens a searchable dropdown. Search filters by country name.

Props:

```ts
interface CountrySelectProps {
  value: string // ISO code or ''
  onChange: (code: string) => void
  placeholder?: string
  className?: string
}
```

Replaces `<Input placeholder="Страна (RU, US...)">` in:

- `components/vacancy/VacancyFilters.tsx`
- `frontend/src/app/resumes/ResumesClient.tsx`
- `frontend/src/app/companies/CompaniesClient.tsx`
- `components/vacancy/VacancyForm.tsx`
- `components/resume/ResumeForm.tsx`
- `components/company/CompanyForm.tsx`

---

## 6. Multi-Select Filters (Variant A — API Change)

### Backend

**Files:** `backend/src/api/vacancy/controllers/vacancy.ts`, `backend/src/api/resume/controllers/resume.ts`

For `workFormat`, `employmentType`, and `seniority` query parameters:

- Read the value as a string or string array (Next.js sends repeated params: `?workFormat=remote&workFormat=hybrid`)
- Normalize to an array: `const values = Array.isArray(v) ? v : v ? [v] : []`
- Apply `$in` Strapi filter when the array is non-empty, instead of `$eq`

No content type schema changes needed.

### Frontend Types

**File:** `frontend/src/types/api.ts`

Change in `VacancyListParams`:

```ts
// before
workFormat?: WorkFormatEnum
employmentType?: EmploymentTypeEnum
seniority?: SeniorityEnum

// after
workFormat?: WorkFormatEnum[]
employmentType?: EmploymentTypeEnum[]
seniority?: SeniorityEnum[]
```

Same change in `ResumeListParams` for `workFormat` and `employmentType`.

API client must serialize arrays as repeated query params (not `workFormat[0]=...`).

### New Component

**New file:** `frontend/src/components/ui/multi-select.tsx`

A shadcn-style dropdown with checkboxes. Shows a button with a count of selected items (e.g. "Формат работы: 2"). Clicking opens a popover with a list of checkboxes. A "Сбросить" link clears the selection.

Props:

```ts
interface MultiSelectProps<T extends string> {
  label: string
  options: { value: T; label: string }[]
  value: T[]
  onChange: (values: T[]) => void
}
```

### Frontend Wiring

**Files:** `components/vacancy/VacancyFilters.tsx`, `app/resumes/ResumesClient.tsx`

Replace `Select` (single-value) with `MultiSelect` for `workFormat`, `employmentType`, `seniority`. Update `Draft` type accordingly. Update `countActive` to count array lengths.

Update `VacancyStore.fetchVacancies` and `ResumeStore.fetchResumes` to serialize array params correctly in the API call.

---

## 7. Card Vertical Padding Fix

**File:** `frontend/src/components/ui/card.tsx`

Current state:

- `Card` root has `py-6` (24px top/bottom) + `gap-6`
- `CardContent` has `px-6` only (no vertical padding)

When a `CardContent` overrides with `className="p-5"` or `className="p-6"` (adding vertical padding), the combination of Card's `py-6` and CardContent's own `py-*` produces 44px+ of vertical space — visually too much.

Fix:

1. Remove `py-6` from `Card` class — Card becomes `flex flex-col gap-6 rounded-xl border bg-card text-card-foreground shadow-sm`
2. Update `CardContent` default from `px-6` to `p-6` so the standard layout (Card + CardContent without class overrides) still has proper vertical padding

Result: CardContent with explicit `p-5` or `p-6` will now produce exactly that much padding (no hidden extra from Card). CardContent with default `p-6` still looks the same as before.

This is a global change — all Card + CardContent usages must be visually checked after applying.

---

## 8. Search Bar Above Filters

**Files:** `app/vacancies/VacanciesClient.tsx`, `app/resumes/ResumesClient.tsx`, `app/companies/CompaniesClient.tsx`, `components/vacancy/VacancyFilters.tsx`

Move the search input out of the sidebar `<aside>` and place it as a full-width row above the two-column grid. New layout structure:

```
<div class="space-y-4">
  <SearchBar />          ← full width, above grid
  <div class="grid cols-[280px_1fr]">
    <aside> filters </aside>
    <section> list </section>
  </div>
</div>
```

For `VacancyFilters`, remove the search input from the component entirely — search state will be managed by the parent `VacanciesClient`. Pass `search` / `onSearchChange` as props or lift state up.

For `ResumesClient` and `CompaniesClient`, extract the inline search input from the aside and move it above the grid.

The mobile sheet (bottom drawer) in `VacancyFilters` also removes the search input since it's now always visible at the top.

---

## 9. Remove Duplicate Page Titles

**Files:** `app/vacancies/page.tsx`, `app/companies/page.tsx`, and any other `page.tsx` files that render both an `<h1>` and a client component that renders `<PageHeader>`.

Pattern to fix:

- `page.tsx` renders `<h1>Вакансии</h1>` + `<VacanciesClient />`
- `VacanciesClient` renders `<PageHeader title="Вакансии" ...>`  
  → Remove the `<h1>` from `page.tsx`; keep `PageHeader` in the client component.

Also check `app/resumes/page.tsx` — it does not have an `<h1>` (already correct).

Audit all other public `page.tsx` files for the same pattern.

---

## Out of Scope

- Backend data model changes
- New pages
- Changes to Strapi admin UI
- Mobile bottom navigation
- Telegram Mini App-specific flows

---

## Testing Notes

- Multi-select filter change requires backend integration test (verify `$in` query works with Strapi)
- Country combobox: verify that form submission still sends ISO code, not display name
- Card padding fix: visual regression check across all dashboard pages
- Language switcher: verify persistence across page reload
