# Аудит прода GramJob — 2026-07-06

Проверялись: живой прод (gramjob.com, api.gramjob.com, /admin), headless-браузер (Chromium/Playwright), статический анализ кода в main.

Что в порядке (проверено): тесты проходят (frontend 408, backend 268), `tsc --noEmit` чистый в обоих пакетах, CORS настроен корректно (gramjob.com + web.telegram.org), FTS-поиск работает, SQL-инъекции через `search`/`sort`/`country` не проходят, `pageSize` клампится, Telegram webhook без секрета отдаёт 403, rate limiting активен, страница логина админки грузится без ошибок консоли, gzip включён, `telegram-web-app.js` подключён, публичные страницы в браузере работают без JS-ошибок.

---

## 🔴 Критические

### 1. Cron-задачи вообще не выполняются

`backend/config/cron-tasks.ts` существует, но **нигде не зарегистрирован** — в `backend/config/server.ts` нет секции `cron`, импортов файла нет ни в одном модуле.

Не работают:

- ежечасное истечение вакансий (`published` → `expired` через 60 дней);
- истечение подписок в 02:00 UTC (откат на Free, сброс `isVip`) — **оплаченные подписки никогда не истекут**;
- предупреждения за 7 дней до истечения подписки;
- агрегация аналитики (VacancyAnalytics/ResumeAnalytics) — страницы аналитики будут пустыми;
- уведомления по saved searches.

Фикс: в `config/server.ts` добавить

```ts
import cronTasks from './cron-tasks'
// ...
cron: { enabled: true, tasks: cronTasks },
```

### 2. На проде задеплоена устаревшая сборка frontend (без Sprint 10)

- `https://gramjob.com/sitemap.xml` → **404** (локально `src/app/sitemap.ts` есть, коммит 7aa8b2e от 06.07)
- `https://gramjob.com/robots.txt` → **404** (локально `src/app/robots.ts` есть, коммит e4565af)
- На детальной странице вакансии нет `og:*` и `<link rel="canonical">` (коммит 80405af не задеплоен)
- SSR-страница `/vacancies` отдаёт «Вакансии не найдены» — initial data из 42eb579 не задеплоена. **Для поисковиков список вакансий сейчас пустой** — SEO не работает.

Фикс: пересобрать и задеплоить frontend из актуального main.

### 3. www.gramjob.com не работает

У `www.gramjob.com` **нет A-записи в DNS** (apex `gramjob.com` → 138.226.237.70, api → 138.226.236.150). Пользователи, набирающие www, получают ошибку соединения. Нужны: A/CNAME-запись, TLS-сертификат, 301-редирект на apex.

---

## 🟠 Высокие

### 4. CSP Strapi собран под dev — вероятная причина ошибок в админке

`backend/config/middlewares.ts`, `img-src`: `'self' data: blob: localhost:9000 *.gramjob.com market-assets.strapi.io`.

- `localhost:9000` — dev-MinIO, на проде мусор;
- прод-хост S3/R2 (`*.r2.cloudflarestorage.com` — судя по `next.config.ts`) **отсутствует** → превью загруженных медиа в Media Library и в карточках контента блокируются CSP → ошибки в консоли админки, битые картинки.

Фикс: вынести хост медиа в env (`S3_PUBLIC_HOSTNAME`) и добавить в `img-src` (+ `media-src`), убрать `localhost:9000` для production.

### 5. Upload-провайдер без `baseUrl` — публичные URL файлов, вероятно, битые

`config/plugins.ts`: провайдер aws-s3 настроен только с `endpoint: env('S3_ENDPOINT')`. Без `baseUrl` Strapi отдаёт URL файлов вида `https://<S3_ENDPOINT>/gramjob/...`. Если на проде это R2-endpoint (`*.r2.cloudflarestorage.com`) — он **приватный**, файлы по таким URL не открываются ни в админке, ни на сайте.

Фикс: публичный домен для бакета (R2 public bucket / custom domain, например `media.gramjob.com`) + `baseUrl` в providerOptions + этот же хост в CSP (п. 4) и `next.config.ts` remotePatterns.

### 6. Загрузка логотипа/обложки компании не реализована на frontend

В `frontend/src` нет ни одного обращения к `/api/upload`; в `CompanyForm` нет полей logo/cover. В `seed-permissions.ts` роли authenticated не выдано `plugin::upload.content-api.upload` — даже если UI появится, API вернёт 403. Логотипы сейчас можно загрузить только вручную через админку.

### 7. In-memory состояние на проде (известные MVP-ограничения — всё ещё в силе)

- `api/vacancy/services/credit-service.ts` — `dailyBoosts` (Map)
- `api/vacancy/controllers/vacancy.ts` — `viewedIPs` (Map, **растёт неограниченно** — утечка памяти)
- `api/application/services/apply-credit-service.ts` — `dailyApplies` (Map)
- `middlewares/rate-limit.ts` — memory driver
- `services/moderation-utils.ts` — `lastSubmitted` (Map)

Последствия на проде: сброс лимитов при каждом рестарте/деплое; при запуске в кластере (pm2 cluster / несколько инстансов) лимиты и uniqueViews считаются некорректно; кредитные лимиты без атомарных транзакций (race condition). Планировались к исправлению в Sprint 6 — не исправлены.

### 8. Дефолт TELEGRAM_BOT_USERNAME = `GramJobBot`, реальный бот — `gramjob_bot`

`telegram-bot.ts:129` и `bot-commands.ts:27`: `process.env.TELEGRAM_BOT_USERNAME ?? 'GramJobBot'`. Если на прод-сервере env не задан, все deep links (`t.me/GramJobBot/app?startapp=...`) из уведомлений и команд бота ведут **на чужого бота**. Проверить `.env` на проде; аналогично `TELEGRAM_WEBHOOK_SECRET` не должен остаться `changeme`.

---

## 🟡 Средние

### 9. Favicon и иконки отсутствуют полностью

`https://gramjob.com/favicon.ico` → 404. В `frontend/public/` только два логотипа; нет `app/icon.png`, `apple-touch-icon`, `manifest.json`. В Telegram/соцсетях и вкладках браузера сайт без иконки, PWA-метаданных нет.

### 10. Нет кастомных страниц ошибок

В `frontend/src/app/` отсутствуют `not-found.tsx`, `error.tsx`, `global-error.tsx` — пользователи видят дефолтную английскую «404 This page could not be found» (воспроизведено на проде).

### 11. Rate limit 100 req/min на IP — общий бюджет для SSR и NAT

`global::api-rate-limit`: 100/мин на IP на всё `/api/*`. Все SSR/ISR-фетчи Next.js идут с одного серверного IP и делят этот бюджет; офисы/кампусы за NAT тоже. При росте трафика SSR начнёт получать 429, а `fetchJson` в `server-api.ts`/`home-data.ts` молча вернёт `null` → пустые списки в выдаче. Рекомендация: исключить IP frontend-сервера или поднять лимит/перейти на Redis-driver.

### 12. Публичная вакансия может существовать без компании

`vacancy.ts:134` — `companyId` опционален. На проде опубликованы 4 вакансии, все с `company: null`, опубликованных компаний 0. Карточка вакансии отображается без работодателя. Если это задумано для физлиц — ок, но стоит явно зафиксировать бизнес-правило (сейчас `docs/business-logic.md` подразумевает вакансию от компании) и продумать отображение «частный работодатель».

### 13. SEO: метаданные захардкожены на русском, нет hreflang

`title: 'Вакансии | GramJob'` и т.п. заданы статично по-русски; локализованных URL и `hreflang` нет, хотя платформа заявлена как международная (RU/EN). Для EN-аудитории SEO не работает.

### 14. ISR-кэширование стоит проверить после деплоя Sprint 10

`/vacancies` — `revalidate = 3600`: новые вакансии попадают в SSR-выдачу (и sitemap-переобход) с задержкой до часа; главная — 300с. Для job-борды час — много; рекомендация: 300–600с или on-demand revalidation при публикации.

### 15. Frontend отдаётся без security-заголовков

На `gramjob.com` нет `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, CSP (на API они есть). `X-Frame-Options` сознательно не ставить — сломает Mini App в web.telegram.org, но остальные добавить в nginx/next.config. Также наружу торчат `Server: nginx/1.24.0` и `X-Powered-By: Next.js`.

---

## 🟢 Низкие / косметика

16. Неавторизованные запросы к защищённым endpoint'ам возвращают 403 вместо 401 (дефолт Strapi, ломает семантику обработки ошибок на клиенте).
17. `frontend/.env.production` содержит только `NEXT_PUBLIC_BOT_USERNAME` — остальные `NEXT_PUBLIC_*` обязаны приходить из окружения при сборке; при сборке без них клиент молча соберётся с `localhost:1337`. Рекомендация: прописать прод-значения в `.env.production` (они не секретные).
18. Предупреждение в консоли на `/login`: preload `logo-vertical.png` не используется в течение нескольких секунд после load.
19. Не закоммичены: `docs/ui-ux-bugs.md`, `docs/superpowers/plans/2026-07-05-ui-ux-bug-fixes.md`, `docs/superpowers/plans/2026-07-06-sprint10-seo-performance.md`.

---

## ❓ Требуют деталей от пользователя / доступа

- **Ошибки в админке Strapi**: страница логина чистая; ошибки внутри (после логина) удалённо не воспроизвести. Наиболее вероятные причины — п. 4 (CSP/медиа) и п. 5 (битые URL файлов). Нужны: текст ошибок из консоли браузера в админке и/или `pm2 logs`/journalctl бэкенда.
- **Авторизованные сценарии на проде** (dashboard, отклики, оплата Stars, Mini App внутри Telegram) не проверялись — нужен тестовый аккаунт или согласие на регистрацию тестового пользователя.
- **Прод-env бэкенда**: проверить `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `S3_*`, `FRONTEND_URL` (наличие и не-dev значения).

---

## Рекомендуемый порядок исправления

1. Подключить cron (п. 1) — одна строка конфига, разблокирует истечение вакансий/подписок и аналитику.
2. Задеплоить актуальный main на frontend (п. 2) — закрывает sitemap/robots/OG/SSR-выдачу.
3. DNS для www (п. 3).
4. Медиа-цепочка: публичный домен бакета + baseUrl + CSP + next.config (пп. 4–5).
5. Прод-env бэкенда (п. 8) и файл `.env.production` фронта (п. 17).
6. Favicon + страницы ошибок (пп. 9–10).
7. Redis для rate limit / кредитов / uniqueViews (пп. 7, 11) — до роста трафика.
