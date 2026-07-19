# Resume Photo Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить загрузку, превью, замену и удаление фото в форму резюме.

**Architecture:** Моментальная загрузка при выборе файла через `uploadFile()` — ID файла сохраняется в React Hook Form state и передаётся при сабмите. Новый компонент `ResumePhotoUploader` повторяет паттерн `LogoUploader`. Бэкенд принимает числовой ID медиа-файла в create/update и null для удаления.

**Tech Stack:** Strapi 5 (Document API), Next.js 15, React Hook Form + Zod, i18next RU/EN, Vitest + Testing Library.

---

## File Map

| Файл                                                                | Действие                                              |
| ------------------------------------------------------------------- | ----------------------------------------------------- |
| `frontend/src/locales/ru/common.json`                               | Modify — добавить i18n ключи                          |
| `frontend/src/locales/en/common.json`                               | Modify — добавить i18n ключи                          |
| `backend/src/api/resume/services/resume.ts`                         | Modify — `avatar` в `CreateResumeInput` и `.create()` |
| `backend/src/api/resume/controllers/resume.ts`                      | Modify — валидация avatar в create и update           |
| `frontend/src/types/api.ts`                                         | Modify — `avatar` в `ResumeCreateInput`               |
| `frontend/src/components/resume/ResumePhotoUploader.tsx`            | Create — новый компонент                              |
| `frontend/src/components/resume/ResumePhotoUploader.test.tsx`       | Create — 6 тестов                                     |
| `frontend/src/components/resume/ResumeForm.tsx`                     | Modify — интеграция ResumePhotoUploader               |
| `frontend/src/components/resume/ResumeForm.test.tsx`                | Modify — добавить 4 теста                             |
| `frontend/src/app/dashboard/resumes/[id]/edit/EditResumeClient.tsx` | Modify — передать `defaultAvatar`                     |

---

### Task 1: i18n ключи для фото резюме

**Files:**

- Modify: `frontend/src/locales/ru/common.json`
- Modify: `frontend/src/locales/en/common.json`

- [ ] **Step 1: Добавить ключи в ru/common.json**

Найти строку `"save": "Сохранить",` в секции `forms.resume` (около строки 668). Добавить перед ней:

```json
      "photoLabel": "Фото",
      "photoUpload": "Загрузить фото",
      "photoChange": "Заменить",
      "photoUploadError": "Ошибка загрузки фото",
```

Итоговый фрагмент:

```json
      "photoLabel": "Фото",
      "photoUpload": "Загрузить фото",
      "photoChange": "Заменить",
      "photoUploadError": "Ошибка загрузки фото",
      "save": "Сохранить",
      "saving": "Сохранение..."
    }
```

- [ ] **Step 2: Добавить ключи в en/common.json**

Найти аналогичное место в `forms.resume`. Добавить перед `"save"`:

```json
      "photoLabel": "Photo",
      "photoUpload": "Upload photo",
      "photoChange": "Change",
      "photoUploadError": "Photo upload error",
```

- [ ] **Step 3: Проверить что JSON валидный**

```bash
cd /Users/vitaly/work/GramJob/frontend
node -e "JSON.parse(require('fs').readFileSync('src/locales/ru/common.json','utf8')); console.log('RU OK')"
node -e "JSON.parse(require('fs').readFileSync('src/locales/en/common.json','utf8')); console.log('EN OK')"
```

Expected: `RU OK` и `EN OK`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/locales/ru/common.json frontend/src/locales/en/common.json
git commit -m "feat(resume): добавить i18n ключи для загрузки фото"
```

---

### Task 2: Backend service — добавить avatar в CreateResumeInput

**Files:**

- Modify: `backend/src/api/resume/services/resume.ts`

- [ ] **Step 1: Добавить `avatar` в тип `CreateResumeInput`**

В файле `backend/src/api/resume/services/resume.ts` добавить поле `avatar?: number` в конец типа `CreateResumeInput` (перед закрывающей скобкой, после `education`):

```typescript
type CreateResumeInput = {
  title: string
  firstName: string
  lastName: string
  country: string
  city?: string
  desiredSalary?: number
  currency?: string
  workFormat: string[]
  employmentType: string[]
  experienceYears?: number
  about?: string
  skills?: string[]
  languages?: Array<{ lang: string; level: string }>
  contacts?: {
    phone?: string
    email?: string
    telegram?: string
    linkedin?: string
  }
  workExperience?: Array<{
    company: string
    position: string
    startDate: string
    endDate?: string
    current?: boolean
    description?: string
  }>
  education?: Array<{
    institution: string
    degree: string
    field: string
    startDate: string
    endDate?: string
    current?: boolean
  }>
  avatar?: number
}
```

- [ ] **Step 2: Передать `avatar` в `.create()`**

В методе `createResume`, в блоке `data: { ... }` внутри `.create()`, добавить строку после `moderationStatus`:

```typescript
return (strapi.documents as any)('api::resume.resume').create({
  data: {
    user: userId,
    title: input.title,
    firstName: input.firstName,
    lastName: input.lastName,
    country: input.country,
    city: input.city,
    desiredSalary: input.desiredSalary,
    currency: input.currency as 'USD' | 'EUR' | 'RUB' | 'GBP' | undefined,
    workFormat: input.workFormat as any,
    employmentType: input.employmentType as any,
    experienceYears: input.experienceYears,
    about: input.about,
    skills: input.skills ?? [],
    languages: input.languages ?? [],
    contacts: input.contacts ?? {},
    workExperience: input.workExperience ?? [],
    education: input.education ?? [],
    views: 0,
    invitations: 0,
    moderationStatus: 'moderation',
    ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
  },
})
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/vitaly/work/GramJob/backend
npx tsc --noEmit 2>&1 | head -20
```

Expected: нет ошибок.

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/resume/services/resume.ts
git commit -m "feat(resume): добавить avatar в CreateResumeInput и createResume"
```

---

### Task 3: Backend controller — валидация avatar в create и update

**Files:**

- Modify: `backend/src/api/resume/controllers/resume.ts`

- [ ] **Step 1: Добавить извлечение и валидацию avatar в `create`**

В методе `create`, после блока `const salaryErr = validateSalaryRange(...)` (около строки 116), добавить:

```typescript
const avatarId = body.avatar
if (avatarId !== undefined && avatarId !== null) {
  if (typeof avatarId !== 'number' || !Number.isInteger(avatarId) || avatarId <= 0) {
    return ctx.badRequest('avatar must be a positive integer file ID')
  }
}
```

- [ ] **Step 2: Передать avatar в вызов сервиса**

В `svc().createResume(user.id, { ... })` добавить в конец объекта:

```typescript
const resume = await svc().createResume(user.id, {
  title: title as string,
  firstName: firstName as string,
  lastName: lastName as string,
  country: country as string,
  city: body.city as string | undefined,
  desiredSalary: body.desiredSalary as number | undefined,
  currency: body.currency as string | undefined,
  workFormat: workFormat as string[],
  employmentType: employmentType as string[],
  experienceYears: body.experienceYears as number | undefined,
  about: body.about as string | undefined,
  skills: body.skills as string[] | undefined,
  languages: body.languages as Array<{ lang: string; level: string }> | undefined,
  contacts: body.contacts as any,
  workExperience: body.workExperience as any,
  education: body.education as any,
  ...(typeof avatarId === 'number' && avatarId > 0 ? { avatar: avatarId } : {}),
})
```

- [ ] **Step 3: Добавить `avatar` в `allowedFields` в `update`**

В методе `update`, в массив `allowedFields` добавить `'avatar'`:

```typescript
const allowedFields = [
  'title',
  'firstName',
  'lastName',
  'country',
  'city',
  'desiredSalary',
  'currency',
  'workFormat',
  'employmentType',
  'experienceYears',
  'about',
  'skills',
  'languages',
  'contacts',
  'workExperience',
  'education',
  'avatar',
]
```

- [ ] **Step 4: Добавить валидацию avatar в `update` после цикла allowedFields**

После блока `if (Object.keys(updateData).length === 0) { ... }`, но перед валидацией `title/firstName/...`, добавить:

```typescript
if ('avatar' in updateData) {
  const avatarVal = updateData.avatar
  if (
    avatarVal !== null &&
    (typeof avatarVal !== 'number' ||
      !Number.isInteger(avatarVal as number) ||
      (avatarVal as number) <= 0)
  ) {
    return ctx.badRequest('avatar must be a positive integer file ID or null')
  }
}
```

- [ ] **Step 5: Typecheck**

```bash
cd /Users/vitaly/work/GramJob/backend
npx tsc --noEmit 2>&1 | head -20
```

Expected: нет ошибок.

- [ ] **Step 6: Запустить backend тесты**

```bash
cd /Users/vitaly/work/GramJob/backend
npm test 2>&1 | tail -10
```

Expected: все тесты проходят.

- [ ] **Step 7: Commit**

```bash
git add backend/src/api/resume/controllers/resume.ts
git commit -m "feat(resume): принимать avatar в create и update контроллере"
```

---

### Task 4: Frontend types — добавить avatar в ResumeCreateInput

**Files:**

- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Добавить `avatar` в `ResumeCreateInput`**

Найти интерфейс `ResumeCreateInput` (около строки 356). Добавить `avatar?: number | null` в конец:

```typescript
export interface ResumeCreateInput {
  title: string
  firstName: string
  lastName: string
  country: string
  city?: string
  desiredSalary?: number
  currency?: ResumeCurrencyEnum
  workFormat: ResumeWorkFormatEnum[]
  employmentType: EmploymentTypeEnum[]
  experienceYears?: number
  about?: string
  skills?: string[]
  languages?: Array<{ lang: string; level: string }>
  contacts?: { telegram?: string; email?: string; phone?: string }
  workExperience?: WorkExperience[]
  education?: Education[]
  avatar?: number | null
}
```

- [ ] **Step 2: Typecheck frontend**

```bash
cd /Users/vitaly/work/GramJob/frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(resume): добавить avatar в ResumeCreateInput"
```

---

### Task 5: Компонент ResumePhotoUploader (TDD)

**Files:**

- Create: `frontend/src/components/resume/ResumePhotoUploader.test.tsx`
- Create: `frontend/src/components/resume/ResumePhotoUploader.tsx`

- [ ] **Step 1: Написать падающие тесты**

Создать `frontend/src/components/resume/ResumePhotoUploader.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResumePhotoUploader } from './ResumePhotoUploader'

vi.mock('@/services/api', () => ({
  uploadFile: vi.fn(),
}))

import { uploadFile } from '@/services/api'
const mockUploadFile = vi.mocked(uploadFile)

describe('ResumePhotoUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('показывает placeholder и кнопку загрузки когда нет фото', () => {
    render(
      <ResumePhotoUploader currentPhotoUrl={null} onUploadComplete={vi.fn()} onRemove={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /загрузить фото/i })).toBeDefined()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('показывает превью и кнопки замены/удаления когда есть фото', () => {
    render(
      <ResumePhotoUploader
        currentPhotoUrl="https://example.com/photo.png"
        onUploadComplete={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    const img = screen.getByRole('img') as HTMLImageElement
    expect(img.src).toBe('https://example.com/photo.png')
    expect(screen.getByRole('button', { name: /заменить/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /удалить/i })).toBeDefined()
  })

  it('вызывает onUploadComplete после успешной загрузки', async () => {
    const onUploadComplete = vi.fn()
    mockUploadFile.mockResolvedValueOnce({ id: 42, url: 'https://example.com/new.png' })

    render(
      <ResumePhotoUploader
        currentPhotoUrl={null}
        onUploadComplete={onUploadComplete}
        onRemove={vi.fn()}
      />
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'photo.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith({ id: 42, url: 'https://example.com/new.png' })
    })
  })

  it('вызывает onRemove при нажатии кнопки удаления', () => {
    const onRemove = vi.fn()
    render(
      <ResumePhotoUploader
        currentPhotoUrl="https://example.com/photo.png"
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
      <ResumePhotoUploader currentPhotoUrl={null} onUploadComplete={vi.fn()} onRemove={vi.fn()} />
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'photo.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeDefined()
    })
  })

  it('дизейблит кнопки когда disabled=true', () => {
    render(
      <ResumePhotoUploader
        currentPhotoUrl={null}
        onUploadComplete={vi.fn()}
        onRemove={vi.fn()}
        disabled
      />
    )
    const btn = screen.getByRole('button', { name: /загрузить фото/i })
    expect(btn.hasAttribute('disabled')).toBe(true)
  })
})
```

- [ ] **Step 2: Убедиться что тесты падают**

```bash
cd /Users/vitaly/work/GramJob/frontend
npx vitest run src/components/resume/ResumePhotoUploader.test.tsx 2>&1 | tail -10
```

Expected: ошибка `Cannot find module './ResumePhotoUploader'`.

- [ ] **Step 3: Создать компонент ResumePhotoUploader**

Создать `frontend/src/components/resume/ResumePhotoUploader.tsx`:

```typescript
'use client'

import { useRef, useState } from 'react'
import { UserRound, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { uploadFile } from '@/services/api'
import { Button } from '@/components/ui/button'

interface ResumePhotoUploaderProps {
  currentPhotoUrl: string | null
  onUploadComplete: (result: { id: number; url: string }) => void
  onRemove: () => void
  disabled?: boolean
}

export function ResumePhotoUploader({
  currentPhotoUrl,
  onUploadComplete,
  onRemove,
  disabled,
}: ResumePhotoUploaderProps) {
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
      setError(err instanceof Error ? err.message : t('forms.resume.photoUploadError'))
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
        {currentPhotoUrl ? (
          <img src={currentPhotoUrl} alt="Photo" className="h-full w-full object-cover" />
        ) : (
          <UserRound className="h-7 w-7 text-muted-foreground" />
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
              : currentPhotoUrl
                ? t('forms.resume.photoChange')
                : t('forms.resume.photoUpload')}
          </Button>
          {currentPhotoUrl && (
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

- [ ] **Step 4: Убедиться что тесты проходят**

```bash
cd /Users/vitaly/work/GramJob/frontend
npx vitest run src/components/resume/ResumePhotoUploader.test.tsx 2>&1 | tail -10
```

Expected: `6 passed`.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: нет ошибок.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/resume/ResumePhotoUploader.tsx frontend/src/components/resume/ResumePhotoUploader.test.tsx
git commit -m "feat(resume): добавить компонент ResumePhotoUploader"
```

---

### Task 6: Интеграция ResumePhotoUploader в ResumeForm (TDD)

**Files:**

- Modify: `frontend/src/components/resume/ResumeForm.test.tsx`
- Modify: `frontend/src/components/resume/ResumeForm.tsx`

- [ ] **Step 1: Добавить mock и 4 падающих теста в ResumeForm.test.tsx**

**Файл уже существует** — вносим изменения, не заменяем полностью.

Шаг 1a: В строке `import type { ResumeCreateInput } from '@/types/api'` добавить `StrapiMedia`:

```typescript
import type { ResumeCreateInput, StrapiMedia } from '@/types/api'
```

Шаг 1b: После блока импортов (после строки `import type { ResumeCreateInput, StrapiMedia } from '@/types/api'`) вставить mock:

```typescript
vi.mock('@/components/resume/ResumePhotoUploader', () => ({
  ResumePhotoUploader: ({
    currentPhotoUrl,
    onUploadComplete,
    onRemove,
    disabled,
  }: {
    currentPhotoUrl: string | null
    onUploadComplete: (r: { id: number; url: string }) => void
    onRemove: () => void
    disabled?: boolean
  }) => (
    <div>
      {currentPhotoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentPhotoUrl} alt="Photo preview" />
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onUploadComplete({ id: 77, url: 'https://example.com/photo.png' })}
      >
        Симулировать загрузку фото
      </button>
      <button type="button" disabled={disabled} onClick={onRemove}>
        Удалить фото
      </button>
    </div>
  ),
}))
```

Затем добавить новый `describe` блок **после** существующего `describe('ResumeForm — languages (BUG-11)', ...)`:

```typescript
describe('ResumeForm — avatar upload', () => {
  it('отображает ResumePhotoUploader в форме', () => {
    render(<ResumeForm defaultValues={baseDefaults} onSubmit={vi.fn()} />)
    expect(screen.getByText('Симулировать загрузку фото')).toBeDefined()
  })

  it('включает avatar в данных сабмита после загрузки', async () => {
    const onSubmit = vi.fn()
    render(<ResumeForm defaultValues={baseDefaults} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByText('Симулировать загрузку фото'))
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    const payload = onSubmit.mock.calls[0]![0] as ResumeCreateInput
    expect(payload.avatar).toBe(77)
  })

  it('сбрасывает avatar на null при удалении', async () => {
    const onSubmit = vi.fn()
    render(
      <ResumeForm
        defaultValues={baseDefaults}
        defaultAvatar={{ id: 5, url: 'https://example.com/photo.png' } as StrapiMedia}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByText('Удалить фото'))
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    const payload = onSubmit.mock.calls[0]![0] as ResumeCreateInput
    expect(payload.avatar).toBeNull()
  })

  it('инициализирует превью из defaultAvatar', () => {
    render(
      <ResumeForm
        defaultValues={baseDefaults}
        defaultAvatar={{ id: 5, url: 'https://example.com/photo.png' } as StrapiMedia}
        onSubmit={vi.fn()}
      />
    )
    const img = screen.getByAltText('Photo preview') as HTMLImageElement
    expect(img).toBeDefined()
  })
})
```

- [ ] **Step 2: Убедиться что новые тесты падают**

```bash
cd /Users/vitaly/work/GramJob/frontend
npx vitest run src/components/resume/ResumeForm.test.tsx 2>&1 | tail -15
```

Expected: существующие 3 теста проходят, новые 4 падают с ошибкой (нет prop `defaultAvatar`, нет `avatar` в payload).

- [ ] **Step 3: Обновить ResumeForm.tsx**

В `frontend/src/components/resume/ResumeForm.tsx` выполнить следующие изменения:

**3a. Добавить импорты** (после существующих импортов, перед `function EnumMultiPills`):

```typescript
import { useState } from 'react' // уже есть в строке импорта, убедиться что включён
import { getMediaUrl } from '@/lib/media'
import { ResumePhotoUploader } from '@/components/resume/ResumePhotoUploader'
import type { StrapiMedia } from '@/types/api'
```

Текущая строка импорта из `react` (`import { useState, useMemo, useEffect } from 'react'`) уже содержит `useState` — добавлять отдельно не нужно. Добавить только два новых импорта (`getMediaUrl` и `ResumePhotoUploader`) и тип.

**3b. Добавить `avatar` в `_baseSchema`** (статическая схема для вывода типов):

```typescript
const _baseSchema = z.object({
  title: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  country: z.string().min(1),
  city: z.string().optional().default(''),
  desiredSalary: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  currency: z.enum(['USD', 'EUR', 'RUB', 'GBP']).optional(),
  workFormat: z.array(z.enum(['office', 'remote', 'hybrid', 'any'])).min(1),
  employmentType: z
    .array(z.enum(['full-time', 'part-time', 'contract', 'internship', 'freelance']))
    .min(1),
  experienceYears: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().int().nonnegative().optional()
  ),
  about: z.string().optional().default(''),
  skills: z.string().optional().default(''),
  contactTelegram: z.string().optional().default(''),
  contactEmail: z.string().optional().default(''),
  contactPhone: z.string().optional().default(''),
  workExperience: z.array(_baseWorkExperienceSchema).default([]),
  education: z.array(_baseEducationSchema).default([]),
  languages: z.array(_baseLanguageSchema).default([]),
  avatar: z.number().int().positive().nullable().default(null),
})
```

**3c. Добавить `avatar` в memoized `schema`** (в `useMemo` внутри компонента, после строки `languages: z.array(_baseLanguageSchema).default([])`):

```typescript
        languages: z.array(_baseLanguageSchema).default([]),
        avatar: z.number().int().positive().nullable().default(null),
```

**3d. Обновить тип `Props`**:

```typescript
interface Props {
  defaultValues?: Partial<ResumeCreateInput>
  defaultAvatar?: StrapiMedia | null
  isLoading?: boolean
  onSubmit: (data: ResumeCreateInput) => void | Promise<void>
}
```

**3e. Добавить `defaultAvatar` в параметры компонента**:

```typescript
export function ResumeForm({ defaultValues, defaultAvatar, isLoading, onSubmit }: Props) {
```

**3f. Добавить state** сразу после `const { t, i18n } = useTranslation()`:

```typescript
const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(
  defaultAvatar ? (getMediaUrl(defaultAvatar.url) ?? null) : null
)
```

**3g. Добавить `avatar` в `defaultValues` в `useForm`** (в конец объекта `defaultValues`):

```typescript
      avatar: defaultAvatar?.id ?? null,
```

**3h. Добавить `avatar` в `handleFormSubmit`** payload (в конец объекта перед `} as ResumeCreateInput`):

```typescript
      ...(filledLanguages.length > 0 ? { languages: filledLanguages } : {}),
      avatar: data.avatar,
    } as ResumeCreateInput
```

**3i. Вставить `ResumePhotoUploader` в секцию «Личные данные»** — перед `<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">` с полями firstName/lastName:

```tsx
<Field>
  <FieldLabel>{t('forms.resume.photoLabel')}</FieldLabel>
  <ResumePhotoUploader
    currentPhotoUrl={avatarPreviewUrl}
    onUploadComplete={({ id, url }) => {
      setValue('avatar', id)
      setAvatarPreviewUrl(url)
    }}
    onRemove={() => {
      setValue('avatar', null)
      setAvatarPreviewUrl(null)
    }}
    {...(isLoading ? { disabled: true } : {})}
  />
</Field>
```

- [ ] **Step 4: Убедиться что все тесты ResumeForm проходят**

```bash
cd /Users/vitaly/work/GramJob/frontend
npx vitest run src/components/resume/ResumeForm.test.tsx 2>&1 | tail -10
```

Expected: `7 passed` (3 existing + 4 new).

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: нет ошибок.

- [ ] **Step 6: Запустить все frontend тесты**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: все тесты проходят (было ~466, должно быть ~476).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/resume/ResumeForm.tsx frontend/src/components/resume/ResumeForm.test.tsx
git commit -m "feat(resume): интегрировать ResumePhotoUploader в ResumeForm"
```

---

### Task 7: EditResumeClient — передать defaultAvatar

**Files:**

- Modify: `frontend/src/app/dashboard/resumes/[id]/edit/EditResumeClient.tsx`

- [ ] **Step 1: Добавить `defaultAvatar` в `<ResumeForm>`**

В `frontend/src/app/dashboard/resumes/[id]/edit/EditResumeClient.tsx` в рендере `<ResumeForm>` добавить prop `defaultAvatar`:

```tsx
<ResumeForm
  defaultAvatar={r.avatar ?? null}
  defaultValues={
    {
      title: r.title,
      firstName: r.firstName,
      lastName: r.lastName,
      country: r.country,
      city: r.city ?? undefined,
      desiredSalary: r.desiredSalary ?? undefined,
      currency: r.currency ?? undefined,
      workFormat: r.workFormat,
      employmentType: r.employmentType,
      experienceYears: r.experienceYears ?? undefined,
      about: r.about ?? undefined,
      skills: r.skills ?? undefined,
      contacts: r.contacts ?? undefined,
      workExperience: r.workExperience ?? undefined,
      education: r.education ?? undefined,
      languages: r.languages ?? undefined,
    } as Partial<import('@/types/api').ResumeCreateInput>
  }
  isLoading={store.isLoading}
  onSubmit={handleSubmit}
/>
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/vitaly/work/GramJob/frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: нет ошибок.

- [ ] **Step 3: Финальный прогон всех тестов**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: все тесты проходят.

```bash
cd /Users/vitaly/work/GramJob/backend
npm test 2>&1 | tail -5
```

Expected: все тесты проходят.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/resumes/[id]/edit/EditResumeClient.tsx
git commit -m "feat(resume): передать defaultAvatar в EditResumeClient"
```
