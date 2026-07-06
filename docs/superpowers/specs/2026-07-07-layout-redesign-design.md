# Layout Redesign — Design Spec

**Date:** 2026-07-07  
**Scope:** WebHeader, BottomNav, новые компоненты LanguageDrawer / UserMenuDrawer / TelegramTopBar, AppShell

---

## 1. WebHeader

### 1.1 Nav-ссылки (десктоп, `hidden md:flex`)

| Ссылка                            | Условие показа                 |
| --------------------------------- | ------------------------------ |
| Вакансии (`/vacancies`)           | всегда                         |
| Компании (`/companies`)           | всегда                         |
| Мои резюме (`/dashboard/resumes`) | только auth                    |
| База резюме (`/resumes`)          | только auth + plan Max или VIP |

Текущий публичный пункт «Резюме» (`/resumes`) убирается из `NAV_LINKS` (статического массива). Условные ссылки рендерятся отдельно, после статических, через проверку `auth.isAuthenticated` и `auth.user.subscriptionPlan`.

### 1.2 Убрать SubscriptionBadge

Блок `<Link href="/subscription"><SubscriptionBadge/></Link>` в правой части шапки удаляется.

### 1.3 DropdownMenuLabel

- Добавить иконку `<User className="h-4 w-4" />` (Lucide) перед именем внутри label
- Показывать `firstName` + `' ' + lastName` (если `lastName` есть), иначе `email`
- После имени рендерить `<SubscriptionBadge plan={auth.user.subscriptionPlan} />`

### 1.5 LanguageSwitcher — мобиль vs десктоп

`LanguageSwitcher` разделяется на два варианта рендера:

- **`md:hidden`** — кнопка Globe открывает `<LanguageDrawer>`
- **`hidden md:block`** — кнопка Globe открывает `<DropdownMenu>` (текущее поведение)

Оба варианта рендерятся одновременно, переключение через Tailwind-классы (без `useMediaQuery`).

---

## 2. BottomNav

Добавляется первый пункт — **только когда `isMiniApp === true`**:

```
href: '/'
icon: Home (Lucide)
label: 'GramJob'
isActive: (p) => p === '/'
```

В режиме `isMiniApp === false` пункт не рендерится, состав остаётся прежним (4 элемента). Пункт «Кабинет» остаётся на `/dashboard`.

---

## 3. Новые компоненты

### 3.1 `LanguageDrawer.tsx`

**Путь:** `frontend/src/components/layout/LanguageDrawer.tsx`

- Использует shadcn `Sheet` (`side="bottom"`)
- Props: `open: boolean`, `onOpenChange: (open: boolean) => void`
- Содержимое: два пункта (Русский / English) с иконкой `<Check>` на активном
- Логика смены языка: `i18next.changeLanguage` + `localStorage.setItem('gramjob_lang', lang)`
- Закрывает Sheet после выбора

### 3.2 `UserMenuDrawer.tsx`

**Путь:** `frontend/src/components/layout/UserMenuDrawer.tsx`

- Использует shadcn `Sheet` (`side="bottom"`)
- Props: `open: boolean`, `onOpenChange: (open: boolean) => void`
- Содержимое (сверху вниз):
  1. `Avatar` + `firstName [lastName]` + `<SubscriptionBadge>` → `<Link href="/dashboard/profile">` (закрывает Drawer)
  2. Уведомления → `<Link href="/dashboard/notifications">` (закрывает Drawer)
  3. Подписка → `<Link href="/subscription">` (закрывает Drawer)
  4. Язык → открывает вложенный `<LanguageDrawer>` (управление через локальный `langDrawerOpen`)
- Не рендерится для неавторизованных

### 3.3 `TelegramTopBar.tsx`

**Путь:** `frontend/src/components/layout/TelegramTopBar.tsx`

- `'use client'`, `observer` (MobX)
- Позиционирование: `fixed top-3 right-4 z-50 flex items-center gap-2`
- Стиль иконок: `Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur rounded-full"`
- Три элемента (слева → право):
  1. **Avatar** (инициал `firstName[0]` или `email[0]`) → открывает `<UserMenuDrawer>`; если пользователь не авторизован — не рендерится
  2. **Bell** с счётчиком непрочитанных (`notification.unreadCount`, логика из `NotificationBadge`) → `<Link href="/dashboard/notifications">`; если не авторизован — не рендерится
  3. **Globe** → открывает `<LanguageDrawer>`; рендерится всегда

---

## 4. AppShell

```tsx
// До:
{!isMiniApp && <WebHeader />}
<main className={`flex-1 ${isMiniApp ? 'pb-20' : 'pb-20 md:pb-0'}`}>

// После:
{!isMiniApp && <WebHeader />}
{isMiniApp && <TelegramTopBar />}
<main className={`flex-1 ${isMiniApp ? 'pt-14 pb-20' : 'pb-20 md:pb-0'}`}>
```

Отступ `pt-14` сверху в MiniApp-режиме предотвращает перекрытие контента плавающими иконками.

---

## 5. Затронутые файлы

| Файл                                   | Действие                                              |
| -------------------------------------- | ----------------------------------------------------- |
| `components/layout/WebHeader.tsx`      | Изменить                                              |
| `components/layout/BottomNav.tsx`      | Изменить                                              |
| `components/layout/AppShell.tsx`       | Изменить                                              |
| `components/layout/LanguageDrawer.tsx` | Создать                                               |
| `components/layout/UserMenuDrawer.tsx` | Создать                                               |
| `components/layout/TelegramTopBar.tsx` | Создать                                               |
| `locales/ru/common.json`               | Добавить ключи: `nav.myResumes`, `nav.resumeDatabase` |
| `locales/en/common.json`               | Добавить ключи: `nav.myResumes`, `nav.resumeDatabase` |

---

## 6. Тесты

- `BottomNav.test.tsx` — добавить кейсы: GramJob-пункт виден в isMiniApp=true, скрыт в isMiniApp=false
- `WebHeader` — unit-тесты не требуются (нет существующих), проверка вручную
- `TelegramTopBar` — smoke-тест: Globe всегда виден, Avatar/Bell скрыты для неавторизованных

---

## 7. Ограничения / вне scope

- Мобильная навигация WebHeader (hamburger-меню) — не затрагивается
- Страница `/dashboard/profile` — уже реализована в Sprint 9, не изменяется
- Анимации Drawer — стандартные shadcn Sheet, без кастомизации
