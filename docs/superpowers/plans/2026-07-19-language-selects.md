# Language Selects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить текстовые поля языков в ResumeForm (lang + level) и VacancyForm (languages) на searchable combobox/select компоненты.

**Architecture:** Создаём `languages.ts` (список ISO 639-1 кодов через `Intl.DisplayNames`) + `language-select.tsx` (одиночный combobox) + `languages-multi-select.tsx` (мульти-выбор). Обновляем ResumeForm и VacancyForm. Хранение: ISO коды (`'en'`, `'ru'`), уровни: `'A1'`–`'C2'` + `'Native'`.

**Tech Stack:** React, Radix UI (Popover, Command), shadcn/ui (Select, Badge), react-hook-form Controller, i18next, `Intl.DisplayNames`

---

## File Map

| Действие | Файл                                                    |
| -------- | ------------------------------------------------------- |
| Create   | `frontend/src/lib/languages.ts`                         |
| Create   | `frontend/src/lib/languages.test.ts`                    |
| Create   | `frontend/src/components/ui/language-select.tsx`        |
| Create   | `frontend/src/components/ui/languages-multi-select.tsx` |
| Modify   | `frontend/src/locales/ru/common.json`                   |
| Modify   | `frontend/src/locales/en/common.json`                   |
| Modify   | `frontend/src/components/resume/ResumeForm.tsx`         |
| Modify   | `frontend/src/components/vacancy/VacancyForm.tsx`       |
| Modify   | `frontend/src/components/resume/ResumeForm.test.tsx`    |

---

### Task 1: `src/lib/languages.ts` + unit tests

**Files:**

- Create: `frontend/src/lib/languages.ts`
- Create: `frontend/src/lib/languages.test.ts`

- [ ] **Step 1: Написать failing тест**

```ts
// frontend/src/lib/languages.test.ts
import { describe, it, expect } from 'vitest'
import { LANGUAGES_LIST, getLanguageName, getLanguagesList } from './languages'

describe('languages', () => {
  it('getLanguageName возвращает локализованное название для ru локали', () => {
    expect(getLanguageName('en', 'ru')).toBeTruthy()
    expect(getLanguageName('de', 'ru')).toBeTruthy()
    expect(getLanguageName('ru', 'ru')).toBeTruthy()
  })

  it('getLanguageName возвращает локализованное название для en локали', () => {
    expect(getLanguageName('en', 'en')).toBeTruthy()
    expect(getLanguageName('ru', 'en')).toBeTruthy()
  })

  it('getLanguageName возвращает сам код если пустая строка', () => {
    expect(getLanguageName('', 'ru')).toBe('')
  })

  it('LANGUAGES_LIST отсортирован по алфавиту (ru)', () => {
    const names = LANGUAGES_LIST.map((l) => l.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'ru'))
    expect(names).toEqual(sorted)
  })

  it('LANGUAGES_LIST содержит основные коды', () => {
    const codes = LANGUAGES_LIST.map((l) => l.code)
    expect(codes).toContain('en')
    expect(codes).toContain('ru')
    expect(codes).toContain('de')
    expect(codes).toContain('zh')
    expect(codes).toContain('ar')
  })

  it('getLanguagesList возвращает отсортированный список для en локали', () => {
    const list = getLanguagesList('en')
    const en = list.find((l) => l.code === 'en')
    expect(en).toBeDefined()
    expect(en?.name).toBeTruthy()
  })
})
```

- [ ] **Step 2: Запустить и убедиться, что тест падает**

```bash
cd /Users/vitaly/work/GramJob/frontend && pnpm test --run src/lib/languages.test.ts
```

Ожидаемый результат: `FAIL — Cannot find module './languages'`

- [ ] **Step 3: Реализовать `languages.ts`**

```ts
// frontend/src/lib/languages.ts
const LANGUAGE_CODES: string[] = [
  'ab',
  'af',
  'ak',
  'am',
  'ar',
  'az',
  'be',
  'bg',
  'bn',
  'bs',
  'ca',
  'cs',
  'cy',
  'da',
  'de',
  'el',
  'en',
  'eo',
  'es',
  'et',
  'eu',
  'fa',
  'fi',
  'fr',
  'ga',
  'gl',
  'gu',
  'he',
  'hi',
  'hr',
  'hu',
  'hy',
  'id',
  'is',
  'it',
  'ja',
  'ka',
  'kk',
  'km',
  'kn',
  'ko',
  'ku',
  'ky',
  'lb',
  'lo',
  'lt',
  'lv',
  'mk',
  'ml',
  'mn',
  'mr',
  'ms',
  'mt',
  'my',
  'ne',
  'nl',
  'no',
  'pa',
  'pl',
  'pt',
  'ro',
  'ru',
  'si',
  'sk',
  'sl',
  'sq',
  'sr',
  'sv',
  'sw',
  'ta',
  'te',
  'tg',
  'th',
  'tk',
  'tr',
  'uk',
  'ur',
  'uz',
  'vi',
  'yo',
  'zh',
  'zu',
]

function buildDisplayNames(locale: string): Intl.DisplayNames {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' })
  } catch {
    return new Intl.DisplayNames(['ru'], { type: 'language' })
  }
}

export function getLanguageName(code: string, locale = 'ru'): string {
  if (!code) return code
  return buildDisplayNames(locale).of(code) ?? code
}

export function getLanguagesList(locale = 'ru'): { code: string; name: string }[] {
  const dn = buildDisplayNames(locale)
  return LANGUAGE_CODES.map((code) => ({ code, name: dn.of(code) ?? code })).sort((a, b) =>
    a.name.localeCompare(b.name, locale)
  )
}

export const LANGUAGES_LIST = getLanguagesList('ru')
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
cd /Users/vitaly/work/GramJob/frontend && pnpm test --run src/lib/languages.test.ts
```

Ожидаемый результат: `6 passed`

- [ ] **Step 5: Коммит**

```bash
cd /Users/vitaly/work/GramJob && git add frontend/src/lib/languages.ts frontend/src/lib/languages.test.ts
git commit -m "feat(ui): add languages utility with ISO 639-1 codes and Intl.DisplayNames"
```

---

### Task 2: `language-select.tsx` — одиночный combobox

**Files:**

- Create: `frontend/src/components/ui/language-select.tsx`

Этот компонент тестируется через форму (Task 5), отдельных unit-тестов нет.

- [ ] **Step 1: Создать компонент**

```tsx
// frontend/src/components/ui/language-select.tsx
'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getLanguagesList, getLanguageName } from '@/lib/languages'

interface LanguageSelectProps {
  value: string
  onChange: (code: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function LanguageSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: LanguageSelectProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const languagesList = useMemo(() => getLanguagesList(i18n.language), [i18n.language])
  const defaultPlaceholder = placeholder ?? t('languageSelect.placeholder')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          {value ? getLanguageName(value, i18n.language) : defaultPlaceholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('languageSelect.searchPlaceholder')} />
          <CommandList>
            <CommandEmpty>{t('languageSelect.notFound')}</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange('')
                    setOpen(false)
                  }}
                >
                  <span className="text-muted-foreground">{t('languageSelect.notSpecified')}</span>
                </CommandItem>
              )}
              {languagesList.map((lang) => (
                <CommandItem
                  key={lang.code}
                  value={lang.name}
                  onSelect={() => {
                    onChange(lang.code)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === lang.code ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {lang.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd /Users/vitaly/work/GramJob/frontend && pnpm typecheck 2>&1 | grep language-select
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Коммит**

```bash
cd /Users/vitaly/work/GramJob && git add frontend/src/components/ui/language-select.tsx
git commit -m "feat(ui): add LanguageSelect searchable combobox component"
```

---

### Task 3: `languages-multi-select.tsx` — мульти-выбор

**Files:**

- Create: `frontend/src/components/ui/languages-multi-select.tsx`

- [ ] **Step 1: Создать компонент**

```tsx
// frontend/src/components/ui/languages-multi-select.tsx
'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getLanguagesList, getLanguageName } from '@/lib/languages'

interface LanguagesMultiSelectProps {
  value: string[]
  onChange: (codes: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function LanguagesMultiSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: LanguagesMultiSelectProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const languagesList = useMemo(() => getLanguagesList(i18n.language), [i18n.language])
  const defaultPlaceholder = placeholder ?? t('languagesMultiSelect.placeholder')

  const toggle = (code: string) => {
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code))
    } else {
      onChange([...value, code])
    }
  }

  const triggerLabel = () => {
    if (value.length === 0) return null
    const [first, ...rest] = value
    const firstName = getLanguageName(first!, i18n.language)
    if (rest.length === 0) return firstName
    return `${firstName} +${rest.length}`
  }

  const label = triggerLabel()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className={cn(!label && 'text-muted-foreground')}>
            {label ?? defaultPlaceholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1 border-b p-2">
            {value.map((code) => (
              <Badge key={code} variant="secondary" className="gap-1 pr-1">
                {getLanguageName(code, i18n.language)}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(value.filter((c) => c !== code))
                  }}
                  className="rounded-sm opacity-70 hover:opacity-100"
                  aria-label={`Убрать ${getLanguageName(code, i18n.language)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Command>
          <CommandInput placeholder={t('languagesMultiSelect.searchPlaceholder')} />
          <CommandList>
            <CommandEmpty>{t('languagesMultiSelect.notFound')}</CommandEmpty>
            <CommandGroup>
              {languagesList.map((lang) => (
                <CommandItem key={lang.code} value={lang.name} onSelect={() => toggle(lang.code)}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.includes(lang.code) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {lang.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd /Users/vitaly/work/GramJob/frontend && pnpm typecheck 2>&1 | grep languages-multi
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Коммит**

```bash
cd /Users/vitaly/work/GramJob && git add frontend/src/components/ui/languages-multi-select.tsx
git commit -m "feat(ui): add LanguagesMultiSelect combobox component"
```

---

### Task 4: Locale keys

**Files:**

- Modify: `frontend/src/locales/ru/common.json`
- Modify: `frontend/src/locales/en/common.json`

- [ ] **Step 1: Добавить ключи в `ru/common.json`**

После блока `"citySelect"` (строка ~762) добавить:

```json
  "languageSelect": {
    "placeholder": "Выберите язык",
    "searchPlaceholder": "Поиск языка...",
    "notFound": "Язык не найден",
    "notSpecified": "— Не указан"
  },
  "languagesMultiSelect": {
    "placeholder": "Выберите языки",
    "searchPlaceholder": "Поиск языка...",
    "notFound": "Язык не найден"
  },
```

В блоке `"enums"` после `"resumeWorkFormat"` добавить:

```json
    "languageLevel": {
      "A1": "A1 — Начальный",
      "A2": "A2 — Элементарный",
      "B1": "B1 — Средний",
      "B2": "B2 — Выше среднего",
      "C1": "C1 — Продвинутый",
      "C2": "C2 — Свободное владение",
      "Native": "Родной"
    },
```

В блоке `"forms"."vacancy"` изменить:

- `"languagesLabel": "Языки (через запятую)"` → `"languagesLabel": "Языки"`
- Удалить строку `"languagesPlaceholder": "Русский, English"` (поле больше не Input)

- [ ] **Step 2: Добавить ключи в `en/common.json`**

После блока `"citySelect"` добавить:

```json
  "languageSelect": {
    "placeholder": "Select language",
    "searchPlaceholder": "Search language...",
    "notFound": "Language not found",
    "notSpecified": "— Not specified"
  },
  "languagesMultiSelect": {
    "placeholder": "Select languages",
    "searchPlaceholder": "Search language...",
    "notFound": "Language not found"
  },
```

В блоке `"enums"` добавить:

```json
    "languageLevel": {
      "A1": "A1 — Beginner",
      "A2": "A2 — Elementary",
      "B1": "B1 — Intermediate",
      "B2": "B2 — Upper Intermediate",
      "C1": "C1 — Advanced",
      "C2": "C2 — Mastery",
      "Native": "Native"
    },
```

В блоке `"forms"."vacancy"` изменить:

- `"languagesLabel": "Languages (comma-separated)"` → `"languagesLabel": "Languages"`
- Удалить строку `"languagesPlaceholder": "Russian, English"`

- [ ] **Step 3: Проверить TypeScript**

```bash
cd /Users/vitaly/work/GramJob/frontend && pnpm typecheck
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 4: Коммит**

```bash
cd /Users/vitaly/work/GramJob && git add frontend/src/locales/ru/common.json frontend/src/locales/en/common.json
git commit -m "feat(i18n): add languageSelect, languagesMultiSelect and languageLevel locale keys"
```

---

### Task 5: Обновить `ResumeForm.tsx`

**Files:**

- Modify: `frontend/src/components/resume/ResumeForm.tsx`

Изменения: `lang` Input → `LanguageSelect`, `level` Input → `Select` с уровнями CEFR.

- [ ] **Step 1: Написать failing тест для новых данных**

В `ResumeForm.test.tsx` добавить mock для `LanguageSelect` в самом начале (до существующих тестов) и обновить тест `languages (BUG-11)`.

Полное содержимое нового `ResumeForm.test.tsx` (заменяет только блок `describe('ResumeForm — languages')`):

```tsx
// В начале файла добавить mock:
vi.mock('@/components/ui/language-select', () => ({
  LanguageSelect: ({ value, onChange }: { value: string; onChange: (code: string) => void }) => (
    <input data-testid="language-select" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

// Заменить describe('ResumeForm — languages (BUG-11)') на:
describe('ResumeForm — languages', () => {
  it('отображает lang из defaultValues через mock-input', () => {
    render(
      <ResumeForm
        defaultValues={{
          ...baseDefaults,
          languages: [{ lang: 'en', level: 'B2' }],
        }}
        onSubmit={vi.fn()}
      />
    )
    const langInputs = screen.getAllByTestId('language-select')
    expect(langInputs[0]).toHaveValue('en')
  })

  it('передаёт languages с ISO-кодами в payload при submit', async () => {
    const onSubmit = vi.fn()
    render(
      <ResumeForm
        defaultValues={{
          ...baseDefaults,
          languages: [
            { lang: 'en', level: 'B2' },
            { lang: 'de', level: 'A1' },
          ],
        }}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    const payload = onSubmit.mock.calls[0]![0] as ResumeCreateInput
    expect(payload.languages).toEqual([
      { lang: 'en', level: 'B2' },
      { lang: 'de', level: 'A1' },
    ])
  })

  it('не отправляет languages если lang пустой', async () => {
    const onSubmit = vi.fn()
    render(<ResumeForm defaultValues={baseDefaults} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    const payload = onSubmit.mock.calls[0]![0] as ResumeCreateInput
    expect(payload.languages).toBeUndefined()
  })
})
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

```bash
cd /Users/vitaly/work/GramJob/frontend && pnpm test --run src/components/resume/ResumeForm.test.tsx
```

Ожидаемый результат: тест `'отображает lang из defaultValues'` FAIL (нет `data-testid="language-select"`)

- [ ] **Step 3: Реализовать изменения в `ResumeForm.tsx`**

**Добавить импорты** (в блок импортов UI компонентов):

```tsx
import { LanguageSelect } from '@/components/ui/language-select'
```

**Заменить секцию «Языки»** (блок `{langFields.map(...)}` — строки 864–891 оригинала):

```tsx
{
  langFields.map((field, index) => (
    <div key={field.id} className="flex items-end gap-2">
      <Field className="flex-1">
        <FieldLabel>{t('forms.resume.languageLabel')}</FieldLabel>
        <Controller
          control={control}
          name={`languages.${index}.lang`}
          render={({ field: f }) => <LanguageSelect value={f.value} onChange={f.onChange} />}
        />
      </Field>
      <Field className="w-[160px] shrink-0">
        <FieldLabel>{t('forms.resume.languageLevelLabel')}</FieldLabel>
        <Controller
          control={control}
          name={`languages.${index}.level`}
          render={({ field: f }) => (
            <Select value={f.value} onValueChange={f.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('forms.resume.languageLevelPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'] as const).map((level) => (
                  <SelectItem key={level} value={level}>
                    {t(`enums.languageLevel.${level}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => removeLang(index)}
        aria-label={t('forms.resume.removeEntry')}
        className="mb-0.5"
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  ))
}
```

Удалить `register` из импортов деструктуризации `useForm`, если он больше не используется (проверьте — он нужен для других полей, поэтому скорее всего оставить).

- [ ] **Step 4: Запустить тесты**

```bash
cd /Users/vitaly/work/GramJob/frontend && pnpm test --run src/components/resume/ResumeForm.test.tsx
```

Ожидаемый результат: все тесты PASS.

- [ ] **Step 5: TypeScript**

```bash
cd /Users/vitaly/work/GramJob/frontend && pnpm typecheck
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 6: Коммит**

```bash
cd /Users/vitaly/work/GramJob && git add frontend/src/components/resume/ResumeForm.tsx frontend/src/components/resume/ResumeForm.test.tsx
git commit -m "feat(resume): replace language inputs with LanguageSelect combobox and CEFR level Select"
```

---

### Task 6: Обновить `VacancyForm.tsx`

**Files:**

- Modify: `frontend/src/components/vacancy/VacancyForm.tsx`

Изменения: схема `languages: z.string()` → `z.array(z.string())`, поле `Input` → `LanguagesMultiSelect`.

- [ ] **Step 1: Внести изменения в `VacancyForm.tsx`**

**Добавить импорт:**

```tsx
import { LanguagesMultiSelect } from '@/components/ui/languages-multi-select'
```

**В `_baseSchema`** (строка ~114) заменить:

```ts
// было:
languages: z.string().optional().default(''),
// стало:
languages: z.array(z.string()).optional().default([]),
```

**В `schema` useMemo** (строка ~165) — то же самое:

```ts
// было:
languages: z.string().optional().default(''),
// стало:
languages: z.array(z.string()).optional().default([]),
```

**В `useForm` `defaultValues`** (строка ~201) заменить:

```ts
// было:
languages: defaultValues?.languages?.join(', ') ?? '',
// стало:
languages: defaultValues?.languages ?? [],
```

**В `handleFormSubmit`** удалить блок split для `languages` (строки ~232–236), заменить:

```ts
// Было:
const languages = data.languages
  ? data.languages
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : undefined
// ...
...(languages?.length ? { languages } : {}),

// Стало (убрать блок выше, изменить строку в input):
...(data.languages?.length ? { languages: data.languages } : {}),
```

**Заменить поле `languages`** в JSX (секция «Дополнительно»):

```tsx
// было:
<Field>
  <FieldLabel htmlFor="languages">{t('forms.vacancy.languagesLabel')}</FieldLabel>
  <Input
    id="languages"
    {...register('languages')}
    placeholder={t('forms.vacancy.languagesPlaceholder')}
  />
</Field>

// стало:
<Field>
  <FieldLabel>{t('forms.vacancy.languagesLabel')}</FieldLabel>
  <Controller
    control={control}
    name="languages"
    render={({ field }) => (
      <LanguagesMultiSelect
        value={field.value ?? []}
        onChange={field.onChange}
      />
    )}
  />
</Field>
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd /Users/vitaly/work/GramJob/frontend && pnpm typecheck
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 3: Запустить все тесты**

```bash
cd /Users/vitaly/work/GramJob/frontend && pnpm test --run
```

Ожидаемый результат: все тесты PASS (счётчик ≥ 456).

- [ ] **Step 4: Коммит**

```bash
cd /Users/vitaly/work/GramJob && git add frontend/src/components/vacancy/VacancyForm.tsx
git commit -m "feat(vacancy): replace languages text input with LanguagesMultiSelect combobox"
```

---

## Self-Review

### Spec coverage

- ✅ ResumeForm `lang` → LanguageSelect (searchable combobox)
- ✅ ResumeForm `level` → Select с уровнями A1–C2 + Native
- ✅ VacancyForm `languages` → LanguagesMultiSelect (multi-select combobox с поиском)
- ✅ Все языки через Intl.DisplayNames
- ✅ Locale ключи для обоих компонентов + уровней

### Placeholder scan

- Нет TBD или TODO
- Весь код конкретный и полный

### Type consistency

- `LanguageSelect` получает `value: string`, `onChange: (code: string) => void` — соответствует Controller render props
- `LanguagesMultiSelect` получает `value: string[]`, `onChange: (codes: string[]) => void` — соответствует Controller + новой схеме `z.array(z.string())`
- `getLanguageName` / `getLanguagesList` используются одинаково в обоих UI компонентах
- Уровни в ResumeForm: `['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native']` — соответствует locale ключам `enums.languageLevel.*`
