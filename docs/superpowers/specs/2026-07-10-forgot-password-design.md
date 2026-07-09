# Восстановление пароля (Forgot Password) — Design

**Дата:** 2026-07-10
**Статус:** утверждено

## Цель

Дать email-пользователям возможность восстановить пароль. Полный флоу: страница запроса письма (`/forgot-password`) + страница установки нового пароля (`/reset-password`) + ссылка «Забыли пароль?» на логине.

## Подход

Используем штатные endpoint-ы Strapi users-permissions — `POST /auth/forgot-password` и `POST /auth/reset-password`. Оба уже открыты в `seed-permissions.ts` (PUBLIC_PERMISSIONS). Кастомный бэкенд-код не нужен — только конфигурация email-провайдера.

Отклонённая альтернатива: кастомные endpoint-ы с собственными токенами — дублирование проверенного механизма Strapi без выигрыша (YAGNI).

## Флоу

```
/login → ссылка «Забыли пароль?»
   ↓
/forgot-password: ввод email → POST /auth/forgot-password → экран «Письмо отправлено»
   ↓ (письмо со ссылкой)
/reset-password?code=XXX: новый пароль + подтверждение → POST /auth/reset-password
   ↓ успех: Strapi возвращает { jwt, user } → авто-логин через AuthStore → редирект на /
```

### Правила

- Strapi всегда отвечает 200 на forgot-password (в т.ч. для несуществующего email) — success-экран показывается безусловно, информация о наличии аккаунта не утекает.
- Telegram-only пользователи (provider ≠ local) письмо не получают — штатное корректное поведение.
- Rate limiting: `/api/auth/*` уже покрыт `global::auth-rate-limit`, отдельная работа не нужна.
- Просроченный/использованный код: Strapi возвращает ошибку «Incorrect code provided» → понятное сообщение + ссылка «Запросить новую ссылку» на /forgot-password.
- Открытие /reset-password без `code` в query → сообщение об ошибке со ссылкой на /forgot-password (форма не показывается).

## Изменения

### Backend (только конфигурация)

| Файл                                | Изменение                                                                                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/config/plugins.ts`         | Провайдер `@strapi/provider-email-nodemailer`: SMTP host/port/auth из env, `defaultFrom`/`defaultReplyTo`                                             |
| `backend/.env.example`              | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`                                                                                      |
| Advanced settings users-permissions | URL страницы сброса: `{FRONTEND_URL}/reset-password` — задать программно в bootstrap (idempotent), чтобы не зависеть от ручной настройки admin-панели |
| `docker-compose.yml`                | Сервис Mailpit для локальной разработки (SMTP :1025, web UI :8025)                                                                                    |

Зависимости: `@strapi/provider-email-nodemailer` (+ nodemailer).

### Frontend (по образцу login/register)

| Файл                                                             | Содержание                                                                                                                                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/(auth)/forgot-password/page.tsx` + `ForgotPasswordCard.tsx` | Форма: email (RHF + Zod). После submit — success-state «Письмо отправлено, проверьте почту» (безусловно). Ссылка «Вернуться ко входу»                                                                              |
| `app/(auth)/reset-password/page.tsx` + `ResetPasswordCard.tsx`   | `code` из `useSearchParams`. Форма: password + passwordConfirmation (RHF + Zod, min 6, совпадение). Успех → `AuthStore` сохраняет jwt/user → редирект на `/`. Ошибка кода → сообщение + ссылка на /forgot-password |
| `components/auth/EmailLoginForm.tsx`                             | Ссылка «Забыли пароль?» рядом с полем пароля → `/forgot-password`                                                                                                                                                  |
| `locales/ru/common.json`, `locales/en/common.json`               | Ключи `auth.forgotPassword*`, `auth.resetPassword*`                                                                                                                                                                |

Паттерны: conditional spread для опциональных полей (`exactOptionalPropertyTypes`), семантические токены Tailwind (тёмная тема Telegram), Card-компоненты как в LoginCard.

## Тестирование

- Unit-тесты компонентов (Vitest + Testing Library, по образцу тестов форм): валидация, success-state, обработка ошибки кода, отсутствие code в query.
- Ручная проверка полного флоу через Mailpit (запрос → письмо → сброс → авто-логин).

## Вне охвата

- Сброс пароля через Telegram-бота.
- Email-подтверждение при регистрации (отдельная задача; email-провайдер, настроенный здесь, для неё пригодится).
- Кастомизация HTML-шаблона письма (используем шаблон Strapi по умолчанию с переопределённым URL).
