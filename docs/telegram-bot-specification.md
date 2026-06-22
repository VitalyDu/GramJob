# GramJob — Telegram Bot & Mini App Specification

---

## Обзор

Telegram-интеграция включает три компонента:

1. **Telegram Bot** — уведомления, команды, точка входа в Mini App
2. **Telegram Mini App** — полнофункциональное приложение внутри Telegram
3. **Telegram Stars** — платёжная система для подписок и пакетов

---

## Telegram Bot

### Команды

| Команда | Описание |
|---------|----------|
| `/start` | Приветствие + кнопка открыть Mini App |
| `/help` | Список команд и краткая справка |
| `/profile` | Показать профиль (план, кредиты) |
| `/vacancies` | Ссылка на поиск вакансий в Mini App |
| `/resume` | Ссылка на управление резюме в Mini App |
| `/notifications` | Последние 5 непрочитанных уведомлений |
| `/subscribe` | Информация о планах + ссылка на оплату |

### Авторизация

- При первом `/start` с `initData` — создаётся или привязывается аккаунт GramJob
- Telegram ID сохраняется в `User.telegramId`
- Для Web Platform Telegram Login Widget использует тот же механизм

### initData Validation

```
Алгоритм проверки Telegram initData:
1. Извлечь hash из initData
2. Собрать data-check-string из оставшихся параметров (отсортированных)
3. HMAC-SHA256(data-check-string, SHA256(bot_token))
4. Сравнить с hash
5. Проверить auth_date не старше 24 часов
```

Реализуется на стороне Strapi в custom middleware.

---

## Telegram Mini App

### Технические требования

- Запускается через `WebApp.open()` или кнопку в боте
- URL: `https://app.gramjob.com` (или `t.me/GramJobBot/app`)
- Использует Telegram WebApp SDK (`window.Telegram.WebApp`)
- Цветовая схема: адаптируется под тему Telegram (light/dark)
- UI библиотека: Telegram UI (основа) + Shadcn/UI

### Инициализация

```javascript
const tg = window.Telegram.WebApp
tg.ready()
tg.expand() // Развернуть на полный экран

// Получить данные пользователя
const initData = tg.initData
const user = tg.initDataUnsafe.user
```

### Экраны Mini App

**Главная:**
- Поиск вакансий с фильтрами
- Блок рекомендованных вакансий (для авторизованных)
- Навигация: Вакансии / Резюме / Профиль

**Поиск вакансий:**
- Поле поиска + фильтры (индустрия, формат, зарплата, локация)
- Список карточек вакансий
- Пагинация / бесконечный скролл

**Карточка вакансии:**
- Полная информация
- Кнопка «Откликнуться» (internal) или «Apply on Source» (external)
- Кнопка «Сохранить в избранное»
- Share-кнопка (Telegram share)

**Профиль кандидата:**
- Резюме (список, создание, редактирование)
- Отклики (история статусов)
- Избранное

**Профиль работодателя:**
- Компании (создание, редактирование)
- Вакансии (список, управление)
- База резюме (только Max)

**Оплата:**
- Выбор плана / пакета
- Кнопка запуска Telegram Stars оплаты

### Навигация

```
Bottom navigation:
[Вакансии] [Резюме*] [+ Опубликовать] [Избранное] [Профиль]

* Раздел резюме показывается только авторизованным
```

### Telegram MainButton

Используется для основных действий на каждом экране:
- Список вакансий: нет (или «Создать алерт»)
- Карточка вакансии: «Откликнуться» / «Apply on Source»
- Форма создания: «Опубликовать»
- Форма отклика: «Отправить отклик»

### BackButton

Всегда используется для навигации назад вместо браузерной истории.

---

## Telegram Stars — Платёжный флоу

### Процесс оплаты

```
1. User нажимает «Купить план/пакет»
2. Frontend → POST /api/payments/create-invoice
3. Backend создаёт invoice через Telegram Bot API:
   sendInvoice(
     chat_id,
     title,
     description,
     payload,   // JSON с {userId, plan/packageId, type}
     currency: "XTR",  // Telegram Stars
     prices: [{label, amount}]
   )
4. Telegram показывает payment screen
5. User подтверждает оплату
6. Telegram → Bot webhook: pre_checkout_query
7. Backend проверяет payload, отвечает answerPreCheckoutQuery(ok: true)
8. Telegram → Bot webhook: successful_payment
9. Backend начисляет план/кредиты, отправляет уведомление
```

### Webhook события

| Event | Действие |
|-------|----------|
| `pre_checkout_query` | Валидация, ответ `ok: true/false` |
| `successful_payment` | Начисление плана/кредитов |

### Важные ограничения Telegram Stars

- Минимальная сумма: 1 Star
- Возвраты: только через Telegram (не через платформу)
- Тестирование: через `@TestStore` bot в Telegram

---

## Telegram Уведомления

### Отправка

Backend отправляет сообщения через `sendMessage(chat_id, text, parse_mode: HTML)`.
Все уведомления содержат кнопку-ссылку на соответствующий экран Mini App.

### Шаблоны уведомлений

**Для кандидата:**

| Событие | Текст | Deep link |
|---------|-------|-----------|
| ResumeViewed | «Ваше резюме «{title}» просмотрел работодатель» | /resume/{id}/stats |
| ApplicationApproved | «Ваш отклик на «{vacancy}» одобрен! Теперь вы видите контакты работодателя» | /applications/{id} |
| ApplicationRejected | «Отклик на «{vacancy}» отклонён» | /applications/{id} |
| InterviewInvitation | «Вас приглашают на интервью по вакансии «{vacancy}»» | /applications/{id} |
| OfferReceived | «🎉 Вам сделали оффер по вакансии «{vacancy}»!» | /applications/{id} |
| SubscriptionExpired | «Ваша подписка {plan} истекла. Продлите для продолжения работы» | /subscription |

**Для работодателя:**

| Событие | Текст | Deep link |
|---------|-------|-----------|
| NewApplication | «Новый отклик на вакансию «{vacancy}» от {name}» | /vacancies/{id}/applications |
| VacancyViewed | «Вашу вакансию «{vacancy}» просмотрели {N} раз» (дайджест) | /vacancies/{id}/stats |
| SubscriptionExpired | «Ваша подписка истекла. Продлите для размещения вакансий» | /subscription |
| LimitsReached | «Вы достигли лимита откликов/вакансий. Рассмотрите апгрейд» | /subscription |
| VacancyExpiringSoon | «Вакансия «{vacancy}» истекает через 3 дня» | /vacancies/{id} |

---

## Deep Links

Формат: `https://t.me/GramJobBot/app?startapp={page}`

| Страница | startapp параметр |
|----------|------------------|
| Вакансия | `vacancy_{id}` |
| Резюме | `resume_{id}` |
| Компания | `company_{slug}` |
| Мои отклики | `applications` |
| Подписка | `subscription` |
| Профиль | `profile` |

---

## Saved Searches + Уведомления

1. Пользователь сохраняет поисковый запрос с фильтрами
2. Cron job проверяет новые результаты (каждые 1-6 часов, TBD)
3. При появлении новых вакансий/резюме под критерии → Telegram уведомление со ссылкой на список

---

## Разработка и тестирование

- Для разработки Mini App: `ngrok` / `cloudflared` для HTTPS туннеля
- Тестирование платежей: Telegram Test Environment (`@BotFather` → Test Mode)
- Telegram Bot API тестирование: использовать Webhook Simulator
