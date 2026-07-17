# Production-надёжность GramJob — дизайн

Дата: 2026-07-17
Источник: `docs/improvements.md`, раздел 1 «Инфраструктура и эксплуатация».

## Цель

Закрыть критические production-риски: потеря данных (нет бэкапов БД), слепота к ошибкам (нет мониторинга), незамеченный даунтайм (нет uptime-проверок), деплой без верификации, root-доступ у CI.

## Scope

Входит:

1. Автоматические бэкапы PostgreSQL с offsite-копией и алертами
2. Sentry (SaaS, free Developer план) для frontend и backend
3. Healthcheck-эндпоинт + мониторы UptimeRobot
4. Smoke tests после деплоя в CI
5. Деплой под выделенным пользователем `deploy` вместо root

Не входит:

- Cloudflare R2 (отменено: требует привязку карты)
- Staging-окружение (отдельный проект)
- Telegram-интеграция алертов Sentry (email достаточно на старте)
- Автоматический откат при провале smoke tests (фиксация провала важнее сложной механики)

## Контекст: текущее состояние серверов

|              | Backend VPS `138.226.236.150`                                                      | Frontend VPS `138.226.237.70`            |
| ------------ | ---------------------------------------------------------------------------------- | ---------------------------------------- |
| ОС / ресурсы | Ubuntu 24.04, 1.9 ГБ RAM, 17 ГБ свободно                                           | Ubuntu 24.04, 1.9 ГБ RAM, 20 ГБ свободно |
| Сервисы      | PostgreSQL 16 (systemd, native), MinIO (native), Nginx, PM2 (root) → Strapi        | Nginx, PM2 (root) → Next.js              |
| Код          | Монорепо-checkout в `/opt/gramjob`, деплой-скрипт `/opt/gramjob/deploy-backend.sh` | То же, `deploy-frontend.sh`              |
| Cron         | Пусто                                                                              | Пусто                                    |

Организация работ — «вариант A»: всё версионируется в репо (`infra/`), применяется на серверы по SSH идемпотентными скриптами.

## 1. Бэкапы PostgreSQL

**`infra/backup/pg-backup.sh`** (устанавливается на backend VPS):

- `pg_dump -Fc` (сжатый custom-формат) базы `gramjob` → `/var/backups/gramjob/daily/gramjob-YYYY-MM-DD.dump`
- Проверка целостности каждого дампа: `pg_restore --list` (архив читается без ошибок)
- Ротация: 7 дневных дампов; по воскресеньям копия в `weekly/`, хранится 4
- Offsite: rsync каталога бэкапов на frontend VPS в `/var/backups/gramjob-offsite/` под отдельным SSH-ключом, ограниченным в `authorized_keys` через `command=` (rsync-only, restrict)
- Алерт при любом сбое шага: Telegram-сообщение через существующего бота (`TELEGRAM_BOT_TOKEN` + `ADMIN_TELEGRAM_CHAT_IDS` из `.env` бэкенда)

**`infra/backup/install-backup.sh`** — идемпотентный установщик: каталоги, cron-задание (03:30 UTC ежедневно — не пересекается со Strapi-кронами 02:00/09:00), генерация offsite-ключа при отсутствии.

Полный restore-тест — ручная процедура, шаги документируются в `infra/README.md`.

## 2. Sentry (SaaS free)

- **Frontend**: `@sentry/nextjs` — client/server/edge конфиги; SDK активен только при заданном `NEXT_PUBLIC_SENTRY_DSN`. Без DSN код «спит» — можно мёржить до регистрации аккаунта
- **Backend**: `@sentry/node` — инициализация в `src/index.ts` при наличии `SENTRY_DSN`; `captureException` в глобальном error-middleware Strapi
- Source maps: загружаются при билде, только если задан `SENTRY_AUTH_TOKEN`; иначе шаг пропускается
- Ручные шаги пользователя: регистрация на sentry.io, 2 проекта (nextjs + node), DSN → в `.env` на соответствующих VPS. Free Developer план: 5k событий/мес (активируется после окончания 14-дневного триала)

## 3. Healthcheck + UptimeRobot

- **`GET /healthz`** в Strapi: новый api `health`, публичный маршрут без auth
  - Проверка БД: `SELECT 1` через соединение Strapi → при успехе 200 `{ status: 'ok', db: 'ok', s3: 'ok' | 'fail' }`, при недоступной БД — 503
  - Проверка S3/MinIO — информативное поле, **не** влияет на HTTP-статус (некритичный сервис не должен флапать монитор)
- Frontend: отдельный эндпоинт не нужен — мониторится главная страница
- **UptimeRobot** (регистрирует пользователь, без карты): 2 HTTP-монитора с интервалом 5 мин — `https://gramjob.com/` и `https://api.gramjob.com/healthz`; алерты email + родная Telegram-интеграция UptimeRobot. Пошаговая инструкция — в `infra/README.md`
- Тесты: integration-тест `/healthz` (200, структура ответа)

## 4. Smoke tests после деплоя

В `.github/workflows/deploy.yml` после каждого deploy-шага — проверка с retry (5 попыток × 10 сек):

- backend: `https://api.gramjob.com/healthz` → 200
- frontend: `https://gramjob.com/` → 200 + маркер «GramJob» в HTML; `https://gramjob.com/vacancies` → 200

Провал → красный workflow + стандартное уведомление GitHub.

## 5. Деплой не под root

- **`infra/setup/setup-deploy-user.sh`** — идемпотентный, выполняется на обоих VPS:
  - Пользователь `deploy` без пароля, вход только по новому dedicated SSH-ключу (генерируется для CI)
  - Sudoers-whitelist: `deploy ALL=(root) NOPASSWD: /opt/gramjob/deploy-backend.sh` (frontend — соответственно)
  - Деплой-скрипты: владелец root, права 755 — deploy-пользователь не может их изменить (защита от эскалации)
- `deploy.yml`: `username: deploy`, script через `sudo /opt/gramjob/deploy-*.sh`
- GitHub Secrets: `DEPLOY_SSH_KEY` заменяется на новый приватный ключ (через `gh secret set`, при отсутствии прав — вручную пользователем)
- Финальный ручной шаг пользователя: **смена root-паролей обоих VPS** (текущие скомпрометированы попаданием в чат сессии)

## Структура репозитория

```
infra/
  README.md                     — карта инфраструктуры, процедура restore, ручные шаги
  backup/pg-backup.sh           — бэкап + ротация + offsite + алерт
  backup/install-backup.sh      — идемпотентная установка на backend VPS
  setup/setup-deploy-user.sh    — идемпотентное создание deploy-пользователя
```

Код healthcheck — в `backend/src/api/health/`, Sentry — в конфигах frontend/backend.

## Порядок выполнения

1. Код в репо: healthz + тест, Sentry-интеграция, smoke tests в deploy.yml, infra-скрипты, README
2. Коммит и деплой кода
3. Применение на серверы по SSH: install-backup, setup-deploy-user, обновление GitHub Secrets
4. Ручные шаги пользователя: Sentry DSN, мониторы UptimeRobot, смена root-паролей

## Критерии готовности

- Дамп БД создаётся по cron, проходит `pg_restore --list`, копия появляется на frontend VPS; при искусственном сбое приходит Telegram-алерт
- `/healthz` отвечает 200 в production; UptimeRobot показывает «Up» по обоим мониторам
- Тестовая ошибка (throw) видна в Sentry на обоих проектах
- Деплой из GitHub Actions проходит под `deploy` (не root) и завершается зелёными smoke tests
- Root-пароли сменены
