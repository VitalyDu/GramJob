# Company Logo Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить загрузку, превью и удаление логотипа компании в форме создания/редактирования.

**Architecture:** Моментальная загрузка при выборе файла через существующий `uploadFile()` → ID файла хранится в поле `logo` формы → передаётся вместе с остальными полями при сабмите. Бэкенд принимает числовой ID для привязки и `null` для удаления.

**Tech Stack:** Strapi 5, Next.js 15, React Hook Form + Zod, MobX, i18next, Vitest + Testing Library

---

### Task 1: i18n — добавить ключи для логотипа

**Files:**

- Modify: `frontend/src/locales/ru/common.json`
- Modify: `frontend/src/locales/en/common.json`

- [ ] **Step 1: Добавить русские ключи**

В `frontend/src/locales/ru/common.json` в раздел `forms.company` добавить:

```json
"logoLabel": "Логотип",
"logoUpload": "Загрузить логотип",
"logoChange": "Заменить",
"logoUploadError": "Ошибка загрузки изображения"
```

Итого раздел `forms.company` должен выглядеть (добавить после `"saving": "Сохранение..."`):

```json
"saving": "Сохранение...",
"logoLabel": "Логотип",
"logoUpload": "Загрузить логотип",
"logoChange": "Заменить",
"logoUploadError": "Ошибка загрузки изображения"
```

Также добавить `"delete"` в раздел `common` (после `"optional": "(необязательно)"`):

```json
"optional": "(необязательно)",
"delete": "Удалить"
```

- [ ] **Step 2: Добавить английские ключи**

В `frontend/src/locales/en/common.json`:

Раздел `forms.company` (после `"saving": "Saving..."`):

```json
"saving": "Saving...",
"logoLabel": "Logo",
"logoUpload": "Upload logo",
"logoChange": "Change",
"logoUploadError": "Image upload error"
```

Раздел `common` (после `"optional": "(optional)"`):

```json
"optional": "(optional)",
"delete": "Delete"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/locales/ru/common.json frontend/src/locales/en/common.json
git commit -m "feat(company-logo): добавить i18n ключи для загрузки логотипа"
```

---

### Task 2: Backend — company service принимает logo

**Files:**

- Modify: `backend/src/api/company/services/company.ts`

- [ ] **Step 1: Добавить `logo` в тип `CreateCompanyInput`**

В `backend/src/api/company/services/company.ts` изменить тип:

```typescript
type CreateCompanyInput = {
  name: string
  description: string
  country: string
  companySize: string
  city?: string
  website?: string
  telegram?: string
  linkedin?: string
  logo?: number
}
```

- [ ] **Step 2: Передать `logo` в `strapi.documents.create()`**

В методе `createCompany` изменить вызов `.create()`:

```typescript
return strapi.documents('api::company.company').create({
  data: {
    name: input.name,
    description: input.description,
    country: input.country,
    companySize: input.companySize as
      | 'size_1_10'
      | 'size_11_50'
      | 'size_51_200'
      | 'size_201_500'
      | 'size_500_plus',
    city: input.city,
    website: input.website,
    telegram: input.telegram,
    linkedin: input.linkedin,
    slug,
    moderationStatus: 'moderation',
    owner: ownerId,
    ...(input.logo !== undefined ? { logo: input.logo } : {}),
  },
})
```

- [ ] **Step 3: Проверить что существующие тесты не сломались**

```bash
cd backend && pnpm test -- --testPathPattern="company"
```

Ожидаемый результат: все company-utils тесты проходят, TypeScript не ругается.

```bash
cd backend && pnpm typecheck
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/company/services/company.ts
git commit -m "feat(company-logo): company service принимает logo ID при создании"
```

---

### Task 3: Backend — company controller принимает logo в create и update

**Files:**

- Modify: `backend/src/api/company/controllers/company.ts`

- [ ] **Step 1: Принять и валидировать logo в `create`**

В методе `create` контроллера, после блока валидации URL (после `for (const field of ['website', 'linkedin'] as const)`), добавить:

```typescript
const logoId = body.logo
if (logoId !== undefined && logoId !== null) {
  if (typeof logoId !== 'number' || !Number.isInteger(logoId) || logoId <= 0) {
    return ctx.badRequest('logo must be a positive integer file ID')
  }
}
```

Затем в вызове `svc().createCompany(user.id, {...})` добавить поле:

```typescript
const company = await svc().createCompany(user.id, {
  name: name as string,
  description: description as string,
  country: country as string,
  companySize: companySize as string,
  city: body.city as string | undefined,
  website: body.website as string | undefined,
  telegram: body.telegram as string | undefined,
  linkedin: body.linkedin as string | undefined,
  ...(logoId !== undefined && logoId !== null ? { logo: logoId as number } : {}),
})
```

- [ ] **Step 2: Добавить `logo` в `allowedFields` в `update` и валидировать**

В методе `update` найти массив `allowedFields`:

```typescript
const allowedFields = [
  'name',
  'description',
  'country',
  'city',
  'companySize',
  'website',
  'telegram',
  'linkedin',
  'logo', // ← добавить
]
```

После цикла `for (const field of allowedFields)` добавить валидацию:

```typescript
if ('logo' in updateData) {
  const logoVal = updateData.logo
  if (
    logoVal !== null &&
    (typeof logoVal !== 'number' ||
      !Number.isInteger(logoVal as number) ||
      (logoVal as number) <= 0)
  ) {
    return ctx.badRequest('logo must be a positive integer file ID or null')
  }
}
```

- [ ] **Step 3: Запустить typecheck**

```bash
cd backend && pnpm typecheck
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 4: Ручная проверка (curl)**

Проверить что `logo: null` в update принимается без ошибки 400. Контроллер должен пропускать `null` в `updateData` (Strapi 5 обработает как удаление связи).

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/company/controllers/company.ts
git commit -m "feat(company-logo): company controller принимает logo в create и update"
```

---

### Task 4: Frontend — добавить logo в тип CompanyCreateInput

**Files:**

- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Добавить поле `logo` в `CompanyCreateInput`**

Найти интерфейс `CompanyCreateInput` (строка ~121) и добавить поле:

```typescript
export interface CompanyCreateInput {
  name: string
  description: string
  country: string
  companySize: CompanySizeEnum
  city?: string
  website?: string
  telegram?: string
  linkedin?: string
  logo?: number | null
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(company-logo): добавить logo в CompanyCreateInput"
```

---

### Task 5: Frontend — компонент LogoUploader

**Files:**

- Create: `frontend/src/components/company/LogoUploader.tsx`

- [ ] **Step 1: Написать failing тест**

Создать `frontend/src/components/company/LogoUploader.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LogoUploader } from './LogoUploader'

vi.mock('@/services/api', () => ({
  uploadFile: vi.fn(),
}))

import { uploadFile } from '@/services/api'
const mockUploadFile = vi.mocked(uploadFile)

describe('LogoUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('показывает placeholder и кнопку загрузки когда нет логотипа', () => {
    render(
      <LogoUploader
        currentLogoUrl={null}
        onUploadComplete={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /загрузить логотип/i })).toBeDefined()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('показывает превью и кнопки замены/удаления когда есть логотип', () => {
    render(
      <LogoUploader
        currentLogoUrl="https://example.com/logo.png"
        onUploadComplete={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    const img = screen.getByRole('img') as HTMLImageElement
    expect(img.src).toBe('https://example.com/logo.png')
    expect(screen.getByRole('button', { name: /заменить/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /удалить/i })).toBeDefined()
  })

  it('вызывает onUploadComplete после успешной загрузки', async () => {
    const onUploadComplete = vi.fn()
    mockUploadFile.mockResolvedValueOnce({ id: 42, url: 'https://example.com/new.png' })

    render(
      <LogoUploader
        currentLogoUrl={null}
        onUploadComplete={onUploadComplete}
        onRemove={vi.fn()}
      />
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'logo.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith({ id: 42, url: 'https://example.com/new.png' })
    })
  })

  it('вызывает onRemove при нажатии кнопки удаления', () => {
    const onRemove = vi.fn()
    render(
      <LogoUploader
        currentLogoUrl="https://example.com/logo.png"
        onUploadComplete={vi.fn()}
        onRemove={onRemove}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /удалить/i }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('показывает ошибку при неуспешной загрузке', async () => {
    mockUploadFile.mockRejectedValueOnce(new Error('Upload failed'))

    render(
      <LogoUploader
        currentLogoUrl={null}
        onUploadComplete={vi.fn()}
        onRemove={vi.fn()}
      />
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'logo.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeDefined()
    })
  })

  it('дизейблит кнопки пока идёт загрузка', async () => {
    let resolve!: (v: { id: number; url: string }) => void
    mockUploadFile.mockReturnValueOnce(new Promise((r) => { resolve = r }))

    render(
      <LogoUploader
        currentLogoUrl={null}
        onUploadComplete={vi.fn()}
        onRemove={vi.fn()}
      />
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'logo.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      const btn = screen.getByRole('button')
      expect(btn.hasAttribute('disabled')).toBe(true)
    })

    resolve({ id: 1, url: 'https://example.com/logo.png' })
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
cd frontend && pnpm test LogoUploader --run
```

Ожидаемый результат: FAIL — `LogoUploader` не существует.

- [ ] **Step 3: Создать компонент**

Создать `frontend/src/components/company/LogoUploader.tsx`:

```typescript
'use client'

import { useRef, useState } from 'react'
import { Building2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { uploadFile } from '@/services/api'
import { Button } from '@/components/ui/button'

interface LogoUploaderProps {
  currentLogoUrl: string | null
  onUploadComplete: (result: { id: number; url: string }) => void
  onRemove: () => void
  disabled?: boolean
}

export function LogoUploader({
  currentLogoUrl,
  onUploadComplete,
  onRemove,
  disabled,
}: LogoUploaderProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setIsUploading(true)
    try {
      const uploaded = await uploadFile(file)
      onUploadComplete(uploaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('forms.company.logoUploadError'))
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
        {currentLogoUrl ? (
          <img src={currentLogoUrl} alt="Logo" className="h-full w-full object-cover" />
        ) : (
          <Building2 className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => void onFileChange(e)}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading
              ? t('common.loading')
              : currentLogoUrl
                ? t('forms.company.logoChange')
                : t('forms.company.logoUpload')}
          </Button>
          {currentLogoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t('common.delete')}
              disabled={disabled || isUploading}
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Запустить тест — убедиться что проходит**

```bash
cd frontend && pnpm test LogoUploader --run
```

Ожидаемый результат: 6 тестов PASS.

- [ ] **Step 5: Убедиться что тест находит aria-label**

Ключ `common.delete` был добавлен в Task 1. Тест ищет кнопку с `/удалить/i` — при работающем i18n (русский) она найдёт aria-label "Удалить".

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/company/LogoUploader.tsx frontend/src/components/company/LogoUploader.test.tsx
git commit -m "feat(company-logo): компонент LogoUploader"
```

---

### Task 6: Frontend — CompanyForm добавляет логотип

**Files:**

- Modify: `frontend/src/components/company/CompanyForm.tsx`
- Modify: `frontend/src/components/company/CompanyForm.test.tsx`

- [ ] **Step 1: Написать новые falling тесты в CompanyForm.test.tsx**

Добавить в конец `CompanyForm.test.tsx` (перед закрывающей `}` блока `describe`):

```typescript
import { vi } from 'vitest'

vi.mock('@/components/company/LogoUploader', () => ({
  LogoUploader: ({
    currentLogoUrl,
    onUploadComplete,
    onRemove,
  }: {
    currentLogoUrl: string | null
    onUploadComplete: (r: { id: number; url: string }) => void
    onRemove: () => void
  }) => (
    <div>
      {currentLogoUrl && <img src={currentLogoUrl} alt="Logo preview" />}
      <button
        type="button"
        onClick={() => onUploadComplete({ id: 99, url: 'https://example.com/logo.png' })}
      >
        Симулировать загрузку
      </button>
      <button type="button" onClick={onRemove}>
        Удалить лого
      </button>
    </div>
  ),
}))
```

Переместить этот mock в начало файла (перед блоком `describe`), выше существующего `vi.mock('@/components/ui/country-select', ...)`.

Добавить тесты в блок `describe('CompanyForm')`:

```typescript
it('отображает LogoUploader в секции Основное', () => {
  render(<CompanyForm onSubmit={vi.fn()} />)
  expect(screen.getByText('Симулировать загрузку')).toBeDefined()
})

it('включает logo в данных сабмита после загрузки', async () => {
  const onSubmit = vi.fn()
  render(<CompanyForm onSubmit={onSubmit} />)

  // Симулируем загрузку лого
  fireEvent.click(screen.getByText('Симулировать загрузку'))

  // Заполняем обязательные поля
  fireEvent.change(screen.getByLabelText(/название/i), { target: { value: 'Test Corp' } })
  fireEvent.change(screen.getByLabelText(/страна/i), { target: { value: 'DE' } })

  fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Corp', logo: 99 }),
      expect.anything()
    )
  })
})

it('сбрасывает logo на null при удалении', async () => {
  const onSubmit = vi.fn()
  render(<CompanyForm onSubmit={onSubmit} defaultLogo={{ id: 5, url: '/existing.png' } as any} />)

  // Удаляем лого
  fireEvent.click(screen.getByText('Удалить лого'))

  // Заполняем обязательные поля
  fireEvent.change(screen.getByLabelText(/название/i), { target: { value: 'Test Corp' } })
  fireEvent.change(screen.getByLabelText(/страна/i), { target: { value: 'DE' } })

  fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ logo: null }),
      expect.anything()
    )
  })
})

it('инициализирует превью логотипа из defaultLogo', () => {
  render(
    <CompanyForm
      onSubmit={vi.fn()}
      defaultLogo={{ id: 5, url: '/existing.png' } as any}
    />
  )
  const img = screen.getByAltText('Logo preview') as HTMLImageElement
  expect(img).toBeDefined()
})
```

- [ ] **Step 2: Запустить тесты — убедиться что новые падают**

```bash
cd frontend && pnpm test CompanyForm --run
```

Ожидаемый результат: существующие 6 тестов PASS, 4 новых FAIL (mock не подключён, prop `defaultLogo` не существует).

- [ ] **Step 3: Обновить CompanyForm.tsx**

Обновить существующую строку импорта React (строка 3) — добавить `useState`:

```typescript
import { useEffect, useMemo, useState } from 'react'
```

Добавить новые импорты после строки `import { cn } from '@/lib/utils'`:

```typescript
import { getMediaUrl } from '@/lib/media'
import { LogoUploader } from '@/components/company/LogoUploader'
import type { StrapiMedia } from '@/types/api'
```

Обновить `_baseSchema` (добавить поле `logo`):

```typescript
const _baseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  country: z.string().min(1),
  city: z.string().optional().default(''),
  companySize: z.enum(COMPANY_SIZE_VALUES),
  website: z.string().url().or(z.literal('')).optional().default(''),
  telegram: z.string().optional().default(''),
  linkedin: z.string().url().or(z.literal('')).optional().default(''),
  logo: z.number().int().positive().nullable().optional(),
})
```

Обновить интерфейс `Props`:

```typescript
interface Props {
  onSubmit: (data: FormData, e?: React.BaseSyntheticEvent) => void | Promise<void>
  defaultValues?: Partial<CompanyCreateInput>
  defaultLogo?: StrapiMedia | null
  isLoading?: boolean
}
```

Обновить сигнатуру функции и добавить state:

```typescript
export function CompanyForm({ onSubmit, defaultValues, defaultLogo, isLoading }: Props) {
  const { t } = useTranslation()

  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    defaultLogo ? getMediaUrl(defaultLogo.url) : null
  )
```

Добавить `logo` в `useMemo` схему (после `linkedin`):

```typescript
logo: z.number().int().positive().nullable().optional(),
```

Добавить `logo` в `defaultValues` хука `useForm`:

```typescript
defaultValues: {
  name: defaultValues?.name ?? '',
  description: defaultValues?.description ?? '',
  country: defaultValues?.country ?? '',
  city: defaultValues?.city ?? '',
  companySize: defaultValues?.companySize ?? 'size_1_10',
  website: defaultValues?.website ?? '',
  telegram: defaultValues?.telegram ?? '',
  linkedin: defaultValues?.linkedin ?? '',
  logo: defaultLogo?.id ?? null,
},
```

Добавить `setValue` в деструктуризацию `useForm`:

```typescript
const {
  register,
  handleSubmit,
  control,
  setValue,
  formState: { errors },
} = useForm<FormData>({
```

Добавить `LogoUploader` в CardContent секции «Основное» **перед** полем «Название»:

```typescript
<CardContent className="space-y-4">
  <Field>
    <FieldLabel>{t('forms.company.logoLabel')}</FieldLabel>
    <LogoUploader
      currentLogoUrl={logoPreviewUrl}
      onUploadComplete={({ id, url }) => {
        setValue('logo', id)
        setLogoPreviewUrl(url)
      }}
      onRemove={() => {
        setValue('logo', null)
        setLogoPreviewUrl(null)
      }}
      disabled={isLoading}
    />
  </Field>

  <Field>
    <FieldLabel htmlFor="name">{t('forms.company.nameLabel')} *</FieldLabel>
    ...
```

- [ ] **Step 4: Запустить тесты — убедиться что все проходят**

```bash
cd frontend && pnpm test CompanyForm --run
```

Ожидаемый результат: все 10 тестов PASS.

- [ ] **Step 5: Typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/company/CompanyForm.tsx frontend/src/components/company/CompanyForm.test.tsx
git commit -m "feat(company-logo): добавить LogoUploader в CompanyForm"
```

---

### Task 7: Frontend — EditCompanyClient передаёт defaultLogo

**Files:**

- Modify: `frontend/src/app/dashboard/companies/[id]/edit/EditCompanyClient.tsx`
- Modify: `frontend/src/app/dashboard/companies/[id]/edit/EditCompanyClient.test.tsx`

- [ ] **Step 1: Проверить наличие теста**

```bash
cat frontend/src/app/dashboard/companies/\[id\]/edit/EditCompanyClient.test.tsx
```

Посмотреть что тестируется. Найти есть ли тест на форму с defaultValues.

- [ ] **Step 2: Обновить EditCompanyClient.tsx**

В `<CompanyForm>` добавить проп `defaultLogo`:

```typescript
<CompanyForm
  onSubmit={handleSubmit}
  isLoading={store.isLoading}
  defaultLogo={company.logo ?? null}
  defaultValues={{
    name: company.name,
    country: company.country,
    companySize: company.companySize,
    description: company.description ?? '',
    city: company.city ?? '',
    website: company.website ?? '',
    telegram: company.telegram ?? '',
    linkedin: company.linkedin ?? '',
  }}
/>
```

- [ ] **Step 3: Typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 4: Запустить все frontend тесты**

```bash
cd frontend && pnpm test --run
```

Ожидаемый результат: все тесты PASS, нет регрессий.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/dashboard/companies/\[id\]/edit/EditCompanyClient.tsx
git commit -m "feat(company-logo): передавать defaultLogo в форму редактирования компании"
```

---

### Task 8: Backend — финальная проверка

**Files:** нет изменений

- [ ] **Step 1: Запустить backend typecheck и тесты**

```bash
cd backend && pnpm typecheck && pnpm test
```

Ожидаемый результат: 0 ошибок TypeScript, все существующие тесты PASS.

- [ ] **Step 2: Ручная проверка в браузере**

1. Открыть `/dashboard/companies/new`
2. Убедиться, что секция «Основное» показывает `LogoUploader` (иконка здания + кнопка «Загрузить логотип»)
3. Выбрать PNG/JPG файл — должен появиться превью
4. Заполнить остальные поля, нажать «Сохранить» — компания должна создаться с логотипом (проверить в Strapi Admin)
5. Открыть редактирование этой компании — логотип должен загружаться из `company.logo`
6. Нажать «Удалить» на логотипе, сохранить — логотип должен удалиться в Strapi

- [ ] **Step 3: Итоговый commit если нужны правки**

```bash
git add -p
git commit -m "fix(company-logo): правки после ручной проверки"
```
