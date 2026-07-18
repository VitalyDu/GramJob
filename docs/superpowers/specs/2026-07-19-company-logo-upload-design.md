# Загрузка логотипа компании

**Дата:** 2026-07-19

## Контекст

`Company` уже имеет поле `logo: StrapiMedia` в контент-типе и populate в контроллере, но:

- `CompanyCreateInput` не содержит `logo`
- Бэкенд в `create`/`update` не принимает `logo`
- `CompanyForm` не отображает поле загрузки

## Функциональность

- Загрузка логотипа при создании и редактировании компании
- Превью загруженного изображения до сабмита формы
- Замена существующего логотипа
- Удаление существующего логотипа (передаётся `logo: null` в API)

## Подход

Моментальная загрузка при выборе файла (как `AvatarUploader`): пользователь выбирает файл → файл сразу загружается через `uploadFile()` → `{id, url}` сохраняется в state формы → при сабмите ID передаётся вместе с остальными полями.

## Изменения

### Backend

**`backend/src/api/company/services/company.ts`**

- Добавить `logo?: number` в тип `CreateCompanyInput`
- Передать `logo: input.logo` в `strapi.documents.create()` (Strapi принимает числовой ID для media-связи)

**`backend/src/api/company/controllers/company.ts`**

- `create`: извлечь `logo` из body, валидировать что это положительное целое число (если передано), передать в сервис
- `update`: добавить `'logo'` в массив `allowedFields` — Strapi обрабатывает `null` как удаление связи

### Frontend

**`frontend/src/types/api.ts`**

- Добавить `logo?: number | null` в `CompanyCreateInput`

**Новый `frontend/src/components/company/LogoUploader.tsx`**

Props:

```typescript
interface LogoUploaderProps {
  currentLogoUrl: string | null
  onUploadComplete: (result: { id: number; url: string }) => void
  onRemove: () => void
  disabled?: boolean
}
```

Поведение:

- Нет лого: placeholder (иконка Building2) + кнопка «Загрузить логотип»
- Есть лого: `<img>` превью + кнопка «Заменить» + кнопка «Удалить»
- Внутреннее состояние: `isUploading`, `error`
- `uploadFile()` вызывается внутри компонента; при ошибке — текст ошибки под кнопками
- `accept="image/png,image/jpeg,image/webp"` на file input

**`frontend/src/components/company/CompanyForm.tsx`**

- Новый prop: `defaultLogo?: StrapiMedia | null`
- Добавить `logo: z.number().int().positive().nullable().optional()` в схему
- `defaultValues.logo` инициализируется из `defaultLogo?.id ?? null`
- `logoPreviewUrl` — отдельный `useState`, инициализируется из `getMediaUrl(defaultLogo?.url)`
- `LogoUploader` вставляется в секцию «Основное» перед полем «Название»
- При завершении загрузки: `setValue('logo', id)` + `setLogoPreviewUrl(url)`
- При удалении: `setValue('logo', null)` + `setLogoPreviewUrl(null)`

**`frontend/src/app/dashboard/companies/[id]/edit/EditCompanyClient.tsx`**

- Добавить `defaultLogo={company.logo}` в `<CompanyForm>`

`CreateCompanyClient.tsx` — изменений не требует (лого `null` по умолчанию).

## Тесты

- Обновить `CompanyForm.test.tsx`: проверить что `defaultLogo` корректно инициализирует превью и `logoId` в данных формы
- `LogoUploader` — снапшот/юнит-тест не обязателен (компонент UI-only, поведение покрывается интеграционно через `CompanyForm.test.tsx`)

## Что не меняется

- `CompanyStore.createCompany` / `updateCompany` — принимают `CompanyCreateInput`/`CompanyUpdateInput`, которые уже будут содержать `logo`
- Публичное отображение лого — `CompanyCard` и `CompanyDetailClient` уже показывают лого через `getMediaUrl`
