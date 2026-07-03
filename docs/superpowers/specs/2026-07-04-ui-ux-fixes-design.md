# UI/UX Fixes — Design

**Дата:** 2026-07-04
**Источник требований:** `docs/ui-ux-features.md` (18 пунктов)
**Организация работы:** одна ветка, коммиты по блокам A–J, один PR.

## Контекст

Накопился список UI/UX-правок по frontend (Next.js 15, TailwindCSS 4, Shadcn/UI). Бэкенд менять не требуется: все нужные фильтры (industry, specialization, salaryFrom/To, salaryCurrency) уже поддерживаются `GET /vacancies` (`findPublished`), а `GET /industries` существует со Sprint 2. Free-план уже есть в seed `subscription-plans`.

## Блоки работ

### Блок A. Глобальные фиксы стилей (пункты 9, 10, 15)

- **cursor-pointer (№9, 10):** в `frontend/src/app/globals.css` добавить правило:
  `button:not(:disabled), [role="button"]:not([aria-disabled="true"]) { cursor: pointer; }`
  Tailwind 4 preflight ставит `cursor: default` на кнопки — одно правило закрывает Shadcn Button, кнопку аватара, триггеры Select/Dropdown/Sheet. После — ручная проверка ссылок-«кнопок», не являющихся `<button>`.
- **Card gap (№15):** в `frontend/src/components/ui/card.tsx` убрать `gap-6` из базового класса Card (у `CardContent` есть собственный `p-6`, gap создаёт двойной отступ между header и content). Визуально проверить все страницы с карточками; если где-то без gap контент слипается — точечно добавить отступ в том месте, а не глобально.

### Блок B. Шапка (пункты 10, 11, 12)

Файлы: `components/layout/WebHeader.tsx`, `components/notification/NotificationBadge.tsx`.

- **Bell = стиль Globe (№12):** Bell обернуть в `Button variant="ghost" size="icon" className="h-8 w-8"` (asChild + Link), иконка `h-4 w-4`. Бейдж непрочитанных (99+ cap) сохраняется поверх.
- **Имя после аватара (№11):** справа от аватара `<span className="hidden sm:inline">{firstName ?? email}</span>` внутри той же кнопки-триггера дропдауна.
- **Cursor на аватаре (№10):** закрывается блоком A (кнопка).

### Блок C. Логотипы и формы авторизации (пункты 1, 2, 3)

- **№1:** `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx` — логотип центрировать (`mx-auto`) и увеличить с 80×80 до ~120×120.
- **№2:** заменить вертикальное центрирование `items-center` на фиксированный верхний отступ (например `pt-12 sm:pt-16` + `justify-center` только по горизонтали) в обоих файлах — одинаковый отступ сверху, формы не «прыгают» при переходе login ↔ register.
- **№3:** `app/page.tsx` Hero — логотип `w-28 sm:w-32` → `w-36 sm:w-44` (width/height у `<Image>` поднять соответственно).

### Блок D. Контейнеры и формы создания (пункты 8, 14)

- **№8:** убрать дублирующий враппер `container px-4 py-8`:
  - `app/resumes/page.tsx`
  - `app/subscription/page.tsx`
    Врапперы `container mx-auto max-w-2xl px-4 py-8` на dashboard-страницах создания — проверить визуально: если layout уже даёт container/padding, убрать `container px-4 py-8`, оставив `mx-auto max-w-2xl`.
- **№14:** `CreateVacancyClient.tsx`, `CreateCompanyClient.tsx` (и edit-варианты для консистентности) — back-ссылка и заголовок из `flex items-center gap-4` (в ряд) → колонка: back сверху, `<h1>` под ней.

### Блок E. Фильтры — лейбл и MultiSelect (пункты 5, 6)

- **№5:** убрать заголовок «Фильтры»:
  - `components/vacancy/VacancyFilters.tsx` — desktop `CardTitle`
  - `app/companies/CompaniesClient.tsx` — `<p>Фильтры</p>`
  - `app/resumes/ResumesClient.tsx` — `<p>Фильтры</p>`
    Текст «Фильтры» на мобильной кнопке-триггере Sheet — оставить (это кнопка, не лейбл).
- **№6:** `components/ui/multi-select.tsx` — при `value.length > 1` вместо `«{label}: N»` выводить выбранные значения через запятую («Удалённо, Офис»), контейнер с `truncate` (обрезка с «…»), каунтер-бейдж справа сохранить. При одном значении — как сейчас (его label).

### Блок F. Новые фильтры вакансий (пункт 7)

Только frontend, бэкенд готов.

- `types/api.ts`: расширить `VacancyListParams` полями `industry?`, `specialization?`, `salaryFrom?`, `salaryTo?`, `salaryCurrency?` (если отсутствуют).
- Загрузка отраслей: `GET /industries` (с populate specializations). Хранение — `IndustryStore` (MobX, по паттерну остальных сторов) либо локальный fetch в VacanciesClient; выбрать IndustryStore, т.к. отрасли понадобятся и в других местах (формы уже используют?— проверить и переиспользовать существующий механизм, если VacancyForm уже грузит industries).
- `VacancyFilters.tsx`: добавить
  - Select «Отрасль» (name по текущей локали из `json{ru,en}`)
  - Select «Специализация» — каскадный, активен после выбора отрасли, options из выбранной industry
  - «Зарплата»: два числовых инпута (от / до) + Select валюты (из `SalaryCurrencyEnum`)
- `VacanciesClient.tsx`: пробросить новые параметры в query string и в `fetchVacancies`. Сброс specialization при смене industry.

### Блок G. Фильтры компаний как у вакансий (пункт 13)

- Создать `components/company/CompanyFilters.tsx` по структуре `VacancyFilters` (desktop: Card в колонке слева; mobile: Sheet с кнопкой «Фильтры»), внутри — существующие фильтры компаний: страна (CountrySelect), размер компании.
- `CompaniesClient.tsx` перевести на этот компонент; сетка `md:grid-cols-[280px_1fr]` уже совпадает.

### Блок H. Аватар на профиле (пункт 16)

- `app/dashboard/profile/ProfileClient.tsx`: добавить `Avatar` (инициал, как в WebHeader) рядом с именем в шапке страницы.

### Блок I. Подписка (пункты 17, 18)

Файлы: `app/subscription/SubscriptionClient.tsx`, `components/subscription/SubscriptionPlanCard.tsx`.

- **№17:**
  - Убрать фильтр `p.code !== 'free'` — показывать Free.
  - Явная сортировка планов: `free → pro → max → vip` (map порядка по `code`, не полагаться на порядок API).
  - Free-карточка: без кнопки покупки (или «Текущий план»), лимиты из данных плана.
  - VIP Employer-карточка — дополнить перечнем: vip-бейдж на компании и вакансии, блок «Рекомендуем» на главной, ускоренная модерация (< 4ч), приоритет в поиске. Пояснение «надстройка над Max» сохранить.
- **№18:** создать `components/icons/TelegramStarIcon.tsx` (inline SVG фирменной звезды Telegram Stars) и использовать в отображении цен (`formatStarsPrice` / места рендера цены) вместо текущей звезды.

### Блок J. Полный i18n-аудит (пункт 4) — последним

Выполняется после A–I, чтобы покрыть и новые строки.

- Пройти все страницы/компоненты frontend, вынести hardcoded RU-строки в `locales/ru/common.json` + `locales/en/common.json`, заменить на `t()`.
- Известные очаги: `VacancyFilters`, `multi-select` («Сбросить»), `SubscriptionClient`, `ProfileClient`, `VacanciesClient`, `CompaniesClient`, `ResumesClient`, главная (`app/page.tsx`), формы, dashboard-страницы, диалоги (ApplyDialog, ReportDialog), бейджи статусов.
- `*_LABELS`-константы в `lib/vacancy-utils.ts`, `lib/resume-utils.ts`, `lib/company-utils.ts`, `lib/moderation-utils.ts`, `lib/subscription-utils.ts` — перевести на функции вида `getLabel(value, t)` либо словари `{ru, en}` с выбором по текущей локали; обновить зависимые тесты.
- Названия отраслей/специализаций уже локализованы на бэкенде (`json{ru,en}`) — выводить по локали.

## Не входит в объём

- Изменения backend (не требуются).
- Логотипы-файлы (`logo-*.png` уже обновлены в рабочем дереве — коммитятся вместе с правками).
- Тёмная тема цветных бейджей (известное ограничение Sprint 9).

## Тестирование

- После каждого блока: `typecheck` + существующие юнит-тесты (310).
- Обновить/добавить тесты: `multi-select` (рендер выбранных значений), `VacancyFilters` (новые фильтры), labels-утилиты после i18n-рефакторинга.
- В конце: визуальная проверка в браузере (dev server) — auth-формы, главная, вакансии+фильтры, компании, резюме, подписка, дашборд, переключение RU/EN.

## Порядок и критерий готовности

A → B → C → D → E → F → G → H → I → J. Готово, когда все 18 пунктов из `docs/ui-ux-features.md` закрыты, тесты зелёные, 0 ошибок TypeScript, визуальная проверка пройдена.
