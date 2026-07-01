# GramJob — Subscription System

---

## Планы подписки

### Таблица планов

| Параметр              | Free      | Pro                 | Max                  | VIP (надстройка)      |
| --------------------- | --------- | ------------------- | -------------------- | --------------------- |
| Вакансий в месяц      | 3         | 10                  | 50                   | как Max               |
| Активных вакансий     | 3         | 10                  | 50                   | как Max               |
| Буст вакансии / день  | 3         | 10                  | 50                   | как Max               |
| Откликов в день       | 3         | 10                  | 50                   | как Max               |
| Резюме                | 1         | 5                   | 20                   | как Max               |
| База резюме           | ✗         | ✗                   | ✓                    | ✓                     |
| Поиск кандидатов      | ✗         | ✗                   | ✓                    | ✓                     |
| Избранные кандидаты   | ✗         | ✗                   | ✓                    | ✓                     |
| Подсветка карточек    | —         | Синяя               | Золотая              | Золотая + VIP-бейдж   |
| Цена (Telegram Stars) | Бесплатно | 299 Stars (~$6/мес) | 999 Stars (~$20/мес) | +499 Stars (~$10/мес) |

### Описание ограничений

**Вакансии в месяц** — сколько новых вакансий можно опубликовать за расчётный период. Сбрасывается в начале каждого периода подписки.

**Активные вакансии** — максимум одновременно опубликованных вакансий в статусе `published`. При достижении лимита новые нельзя публиковать, пока старые не архивируются или не истекут.

**Буст вакансии** — количество поднятий вакансии в топ выдачи за сутки. Сбрасывается в 00:00 UTC.

**Отклики в день** — количество откликов, которые кандидат может отправить за сутки. Сбрасывается в 00:00 UTC. Также может расходоваться из `applyCredits` (пакет).

**Резюме** — максимум активных (не archived) резюме у одного пользователя.

---

## Дополнительные пакеты

### Vacancy Pack

| Пакет   | Вакансии | Бусты | Цена (Stars) | ~USD |
| ------- | -------- | ----- | ------------ | ---- |
| Starter | 10       | 10    | 199 Stars    | ~$4  |
| Basic   | 20       | 20    | 349 Stars    | ~$7  |
| Pro     | 50       | 50    | 749 Stars    | ~$15 |
| Ultra   | 100      | 100   | 1299 Stars   | ~$26 |

Кредиты из пакета хранятся в `User.vacancyCredits` и тратятся до плановых лимитов.
Кредиты вакансий **не сгорают** при смене подписки.

### Apply Pack

| Пакет   | Отклики | Цена (Stars) | ~USD |
| ------- | ------- | ------------ | ---- |
| Starter | 50      | 149 Stars    | ~$3  |
| Pro     | 100     | 249 Stars    | ~$5  |
| Ultra   | 500     | 999 Stars    | ~$20 |

Кредиты хранятся в `User.applyCredits`. Тратятся когда исчерпан дневной лимит плана.

---

## Платёжный флоу (Telegram Stars)

```
1. Пользователь выбирает план/пакет на странице /subscription
2. Frontend вызывает POST /payments/subscribe (или /vacancy-pack, /apply-pack)
3. Backend создаёт Telegram Stars invoice и возвращает { invoiceUrl }
4. Frontend открывает invoice:
   - Mini App: WebApp.openInvoice(url, callback)  [хук useTelegramPayment]
   - Web: window.open(url, '_blank') + кнопка "Обновить статус"
5. Пользователь подтверждает оплату в Telegram
6. Telegram отправляет POST /telegram/webhook (проверка X-Telegram-Bot-Api-Secret-Token):
   a. pre_checkout_query → answerPreCheckoutQuery(ok=true)
   b. message.successful_payment → activateSubscription / addCredits
7. Backend обновляет User: subscriptionPlan, subscriptionExpiresAt, isVip / vacancyCredits / applyCredits
8. Frontend: callback в Mini App или ручное fetchMe() в web
```

**Реализованные API endpoints (Sprint 6):**

- `POST /payments/subscribe` — создать invoice для подписки (pro/max/vip)
- `POST /payments/vacancy-pack` — создать invoice для пакета вакансий
- `POST /payments/apply-pack` — создать invoice для пакета откликов
- `POST /telegram/webhook` — обработчик событий Telegram Bot API
- `GET /subscription-plans` — публичный список планов
- `GET /vacancy-packages` — публичный список пакетов вакансий
- `GET /apply-packages` — публичный список пакетов откликов

**Важно:** Telegram Stars возвраты невозможны (как NFT). Указывать это в UI.

---

## Логика списания кредитов

### Публикация вакансии

```
if user.vacancyCredits > 0:
    user.vacancyCredits -= 1
elif monthlyVacanciesUsed < plan.vacanciesPerMonth:
    monthlyVacanciesUsed += 1
else:
    ERROR: LimitReached
```

### Отклик на вакансию

```
if user.applyCredits > 0:
    user.applyCredits -= 1
elif dailyApplications < plan.applicationsPerDay:
    dailyApplications += 1
else:
    ERROR: LimitReached
```

### Буст вакансии

```
if daily boosts used < plan.vacancyBoostsPerDay:
    allow boost
else:
    ERROR: LimitReached
```

---

## Монетизация размещений

### Vacancy Boost

- Поднимает вакансию в топ общей выдачи
- Добавляет в блок «Рекомендуемые вакансии»
- Эффект: на период показа (24 часа или до нового буста)
- Лимит: `vacancyBoostsPerDay` из плана

### TOP Vacancy (topPlacement)

- Вакансия закреплена в специальной зоне над обычной выдачей
- Оплачивается через VacancyPackage или отдельно
- Флаг: `Vacancy.topPlacement = true`

### Urgent Vacancy (urgent)

- Отображается маркер 🔥 Urgent
- Выделяется в выдаче
- Флаг: `Vacancy.urgent = true`

### VIP Employer

Премиум-надстройка над Max-планом. Покупается ежемесячно поверх основной подписки.

**Цена:** 499 Stars/мес (~$10) поверх Max (999 Stars).

**Что включает:**

| Преимущество         | Описание                                                |
| -------------------- | ------------------------------------------------------- |
| VIP-бейдж            | Золотой значок на карточке компании и всех вакансиях    |
| Приоритет в выдаче   | Вакансии показываются выше Max-конкурентов в поиске     |
| Блок «Рекомендуем»   | Компания попадает в featured-блок на главной и в поиске |
| Ускоренная модерация | SLA < 4 часов (vs стандартные 24 ч)                     |

**Флаги в модели:**

- `User.isVip = true` — признак активного VIP (или через `subscriptionPlan = 'vip'`)
- `Vacancy.highlighted = true` — проставляется автоматически для всех вакансий VIP-работодателя

**Требование:** VIP доступен только пользователям с активным Max-планом. При истечении Max — VIP автоматически деактивируется.

---

## Сброс лимитов

| Лимит            | Сбрасывается                          |
| ---------------- | ------------------------------------- |
| Вакансии в месяц | В дату начала нового периода подписки |
| Отклики в день   | В 00:00 UTC ежедневно                 |
| Бусты в день     | В 00:00 UTC ежедневно                 |

При истечении подписки пользователь откатывается на Free план.
Активные вакансии и резюме, превышающие лимит Free, остаются published до истечения срока.

---

## Уведомления

- За 7 дней до истечения подписки → Telegram уведомление
- При исчерпании лимитов → уведомление + подсказка о пакете/апгрейде
- После успешной оплаты → подтверждение
