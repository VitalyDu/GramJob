# Аудит API-контракта backend ↔ frontend

Дата: 2026-07-10
Метод: статическое сравнение всех backend-роутов/контроллеров с frontend-сторами, типами и компонентами + прогон тестов.

## Статус исправлений (2026-07-10)

**Все баги BUG-1…BUG-11 и Info-1 исправлены по TDD** (RED-тест → фикс → GREEN). Info-2…Info-5 — осознанно оставлены как есть (продуктовые решения / backlog).

| Баг      | Статус          | Фикс                                                                                                                                                                                                                                       |
| -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BUG-1    | ✅ Исправлен    | `vacancy.update` принимает `industryId`/`specializationId`/`companyId` с валидацией существования и владения; тесты `tests/integration/vacancy-update.test.ts`                                                                             |
| BUG-2    | ✅ Исправлен    | `publish`/`archive` резюме возвращают `RESUME_OWNER_CARD_FIELDS` + populate; тесты `tests/integration/resume-status-actions.test.ts`                                                                                                       |
| BUG-3    | ✅ Исправлен    | `company.submit` возвращает полные card fields + logo; тесты `tests/integration/company-submit.test.ts`                                                                                                                                    |
| BUG-4    | ✅ Исправлен    | `GET /industries` → `{data: [...]}`; потребители (`VacancyForm`, `VacancyFilters`) обновлены; тест `tests/integration/industries.test.ts`                                                                                                  |
| BUG-5    | ✅ Исправлен    | `boostCredits` + `isVip` добавлены в `SAFE_USER_FIELDS`; тест parity в `tests/integration/auth-telegram.test.ts`                                                                                                                           |
| BUG-6    | ✅ Исправлен    | Новый модуль `frontend/src/lib/saved-search-utils.ts`: массивы сериализуются повторением ключа, `page` исключается; `/vacancies` и `/resumes` теперь читают query string (Suspense + парсеры); `SaveSearchButton` сохраняет полные массивы |
| BUG-7    | ✅ Исправлен    | `populateEntity` фильтрует vacancy/resume по `status: published`; тесты `tests/integration/favorites-entity-status.test.ts`                                                                                                                |
| BUG-8    | ✅ Исправлен    | Тип `FavoriteVacancyCard.company: VacancyCompanyRef \| null`                                                                                                                                                                               |
| BUG-9    | ✅ Исправлен    | Из `VacancyListParams` удалены `experienceYears`/`skills`/`languages`/`status`                                                                                                                                                             |
| BUG-10   | ✅ Исправлен    | Сигнатуры backend аннотированы `string[]` + комментарий о различии с Resume                                                                                                                                                                |
| BUG-11   | ✅ Исправлен    | Секция «Языки» в `ResumeForm` (useFieldArray, lang+level), проброс в payload/defaultValues (включая `EditResumeClient`), рендер блока языков в `ResumeDetailClient`; тесты `ResumeForm.test.tsx`, `ResumeDetailClient.test.tsx`            |
| Info-1   | ✅ Исправлен    | Сообщение `company.submit`: `Must be "draft" or "rejected".`                                                                                                                                                                               |
| Info-2…5 | ⏸ Без изменений | Продуктовые решения / backlog                                                                                                                                                                                                              |

Попутно устранён флак integration-тестов: `updateSearchVector` (retry через `setTimeout`) падал unhandled rejection, если срабатывал после `teardownStrapi` — добавлен guard на `globalThis.strapi` (`vacancy/lifecycles.ts`, тест `tests/unit/vacancy-search-vector.test.ts`).

## Результаты тестов (после исправлений)

| Прогон                                       | Результат                                          |
| -------------------------------------------- | -------------------------------------------------- |
| Backend `tsc --noEmit`                       | 0 ошибок                                           |
| Backend unit-тесты (jest)                    | 29 suites, 269 тестов — все прошли                 |
| Backend integration-тесты (jest.integration) | 8 suites, 33 теста — все прошли (2 прогона подряд) |
| Frontend `tsc --noEmit`                      | 0 ошибок                                           |
| Frontend unit-тесты (vitest)                 | 59 файлов, 430 тестов — все прошли                 |

---

## Высокая серьёзность

### BUG-1. Редактирование вакансии молча теряет industryId / specializationId / companyId

- **Frontend:** `VacancyForm` при редактировании позволяет выбрать другую отрасль/специализацию/компанию и отправляет `industryId`, `specializationId`, `companyId` в `PUT /vacancies/:id` (`EditVacancyClient.tsx:42-56`, `VacancyUpdateInput = Partial<VacancyCreateInput>`).
- **Backend:** `vacancy.update` фильтрует body по `allowedFields`, где этих полей нет (`backend/src/api/vacancy/controllers/vacancy.ts:526-544`). Поля отбрасываются без ошибки.
- **Эффект:** пользователь меняет отрасль/специализацию, жмёт «Сохранить» — ответ 200, но связи не изменились; стор перезаписывает карточку старыми значениями. Тихая потеря данных.
- **Рекомендация:** либо разрешить смену `industryId`/`specializationId` на backend (с валидацией существования), либо явно запретить их редактирование в UI (disabled-поля) и убрать из `VacancyUpdateInput`.

---

## Средняя серьёзность

### BUG-2. `publish`/`archive` резюме возвращают урезанный объект — карточка «Мои резюме» ломается

- **Backend:** `POST /resumes/:id/publish` возвращает только `{documentId, title, status, createdAt}` (`resume.ts:122-128`), `DELETE /resumes/:id` (archive) — только `{documentId, title, status}` (`resume.ts:345-351`).
- **Frontend:** `ResumeStore.publishResume`/`archiveResume` заменяют элемент `myResumes[idx] = res.data` целиком (`ResumeStore.ts:183-187, 206-210`). Тип ответа заявлен как полный `Resume`.
- **Эффект:** после «На модерацию» / «Архивировать» карточка теряет firstName/lastName, страну, формат работы, зарплату и т.д. до перезагрузки страницы.
- **Рекомендация:** возвращать `RESUME_OWNER_CARD_FIELDS` из этих эндпоинтов, либо на frontend мержить (`{...old, ...res.data}`) или рефетчить список.

### BUG-3. `submit` компании возвращает урезанный объект — карточка «Мои компании» ломается

- **Backend:** `POST /companies/:id/submit` возвращает только `{documentId, name, slug, status, createdAt}` (`company.ts:66-72`).
- **Frontend:** `CompanyStore.submitCompany` заменяет карточку целиком (`CompanyStore.ts:213-217`).
- **Эффект:** после отправки на модерацию из карточки пропадают страна, размер компании, логотип.
- **Рекомендация:** аналогично BUG-2. Для сравнения: vacancy `publish`/`archive` сделаны правильно (возвращают полные CARD_FIELDS + populate).

### BUG-4. Счётчик отраслей на главной всегда 0 — несовпадение формата `/industries`

- **Backend:** `GET /industries` возвращает **голый массив** (`ctx.send(industries)`, `industry.ts:9`) — единственный эндпоинт без обёртки `{data, meta}`.
- **Frontend:** `getHomeStats` ожидает `{data: unknown[]}` и читает `res?.data?.length ?? 0` (`lib/home-data.ts:28,33`) → всегда `0`.
- При этом `VacancyForm` и `VacancyFilters` ожидают голый массив (`api.get<Industry[]>('/industries')`) — работают.
- **Рекомендация:** унифицировать `/industries` до `{data: [...]}` и поправить оба потребителя, либо поправить только `home-data.ts` (быстрый фикс).

### BUG-5. `POST /auth/telegram` не возвращает `boostCredits` и `isVip`

- **Backend:** `SAFE_USER_FIELDS` в `telegram-auth.ts:9-22` не содержит `boostCredits` и `isVip` (в отличие от `SAFE_RESPONSE_FIELDS` в `extensions/users-permissions/strapi-server.ts:5-20`).
- **Frontend:** тип `User` требует оба поля; `AuthStore._setSession(res.jwt, res.user)` кладёт неполный объект в стор и localStorage.
- **Эффект:** после Telegram-логина `user.isVip`/`user.boostCredits` = `undefined` до следующего вызова `GET /users/me`. Любая логика на этих полях (VIP-бейдж, лимиты бустов) даст неверный результат.
- **Рекомендация:** синхронизировать список полей с `SAFE_RESPONSE_FIELDS` (добавить `boostCredits`, `isVip`).

### BUG-6. Сохранённые поиски с multi-select фильтрами возвращают 0 результатов

- **Frontend:** `VacanciesClient` передаёт в `SaveSearchButton` объект `params`, где `workFormat`/`employmentType`/`seniority` — **массивы** (кастятся в `Record<string, string|number|boolean|undefined>` — тип лжёт). При открытии сохранённого поиска `buildQuery` делает `String(value)` → `workFormat=office,remote` (`MySavedSearchesClient.tsx:29-35`).
- **Backend:** `toArray` не разбивает строку по запятой (`utils/query.ts`) → фильтр `$in: ['office,remote']` не совпадает ни с одним значением enum.
- **Эффект:** сохранённый поиск с двумя и более значениями одного фильтра всегда выдаёт пустой результат.
- **Дополнительно:** в `filters` сохраняется и `page` — сохранённый поиск открывается не с первой страницы.
- **Рекомендация:** сериализовать массивы повторением ключа (`workFormat=office&workFormat=remote`) в `buildQuery`, исключать `page` при сохранении; либо научить backend `toArray` разбивать по запятой.

---

## Низкая серьёзность

### BUG-7. Избранное: entity вакансии/резюме не фильтруется по статусу

- `populateEntity` для company фильтрует `status: published`, а для vacancy и resume — нет (`favorite.ts:61-84`).
- Эффект: архивные/просроченные/снятые с публикации вакансии отображаются в избранном как активные (без пометки, ссылка ведёт на 404 публичной карточки); карточки резюме из избранного остаются видимыми работодателю и после даунгрейда с Max (частичный обход гейта базы резюме — без контактов).

### BUG-8. Тип `FavoriteVacancyCard.company` ненулевой, но backend может вернуть `null`

- Вакансия без компании (companyId опционален) → `entity.company = null`, тип обещает объект (`types/api.ts:455`). UI спасает optional chaining (`MyFavoritesClient.tsx:112`), но тип неверный — поправить на `VacancyCompanyRef | null`.

### BUG-9. `VacancyListParams` объявляет параметры, которые backend игнорирует

- `experienceYears`, `skills`, `languages`, `status` есть в типе (`types/api.ts:219-241`), но `findPublished` их не обрабатывает. Сейчас UI их не отправляет, но тип провоцирует «рабочий» код без эффекта. Убрать из типа или реализовать на backend.

### BUG-10. Несогласованный формат `languages` у Vacancy

- Frontend: `Vacancy.languages?: string[]`, форма шлёт массив строк из comma-separated input.
- Backend: сигнатуры `createVacancy` аннотированы `Array<{lang, level}>` (`vacancy.ts:187`) — фактически JSON-passthrough, хранится `string[]`.
- У Resume же реально `{lang, level}[]`. Работает, но аннотация вводит в заблуждение и две сущности используют разные форматы одного понятия.

### BUG-11. Resume: `languages` невозможно заполнить и негде увидеть

- Backend принимает и отдаёт `languages: {lang, level}[]`, но `ResumeForm` поле не отправляет, а страницы резюме его не рендерят. Контрактная возможность не используется UI (частичная передача данных «frontend → backend»).

---

## Информационные замечания

1. **Устаревшее сообщение об ошибке:** `company.submit` пишет `Must be "draft"`, хотя `canSubmit` допускает и `rejected` (`company.ts:63`).
2. **`PUT /users/me`** реализован на backend (allowlist: firstName, lastName, language, avatar), но frontend его нигде не вызывает — страница профиля read-only.
3. **`/industries`** — единственный эндпоинт с голым массивом вместо `{data, meta}` (см. BUG-4).
4. **Report для `type: 'user'`** поддерживается backend, но UI жалобу на пользователя не отправляет (только vacancy/resume/company).
5. **Vacancy `postedBy`** (id, firstName, lastName) отдаётся во всех публичных списках/карточках — подтвердить, что это осознанное продуктовое решение.

---

## Что проверено и совпадает

- Application: create/findMine/findByVacancy/findOne/updateStatus — параметры, коды ошибок (`ALREADY_APPLIED` 409, `LIMIT_REACHED` 403), карта переходов статусов идентична на обеих сторонах.
- Favorite/SavedSearch/Block/Report: маршруты, параметры, коды (`ALREADY_FAVORITED`/`ALREADY_BLOCKED` 409), пагинация `{total, page, pageSize, pageCount}`.
- Vacancy: create/publish/boost/archive/findPublished/findMine/my/:id — формат ответов, `LIMIT_REACHED`, `skipViewCount=true` для SSR.
- Resume: гейт Max-плана (403 → `accessDenied`), маскирование контактов, owner-доступ к черновикам.
- Company: create/update/delete/my/my/:id/slug — allowlist полей update совпадает с формой.
- Payment: `subscribe`/`vacancy-pack`/`apply-pack` — `{invoiceUrl}`, `packageId: number` (frontend передаёт `id`, не `documentId` — корректно).
- Notification: `isRead`-фильтр, markRead/markAllRead, `unreadCount` через `meta.total`.
- Analytics: `from`/`to` (YYYY-MM-DD), формат `{total, daily}` совпадает с типами.
- Auth: `/auth/local`, `/auth/local/register`, `GET /users/me` (`SAFE_RESPONSE_FIELDS` покрывает тип `User` полностью).
