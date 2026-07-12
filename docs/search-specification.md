# GramJob — Search Specification

---

## Поиск вакансий

### Full-text Search

Реализуется через PostgreSQL `tsvector` (встроен в Strapi/Knex).

**Индексируемые поля:**

- `title` — вес A (самый высокий)
- `description` — вес B
- `responsibilities` — вес C
- `requirements` — вес C

**Миграция (raw SQL):**

```sql
ALTER TABLE vacancies
  ADD COLUMN search_vector tsvector;

UPDATE vacancies SET search_vector =
  setweight(to_tsvector('russian', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('russian', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('russian', coalesce(responsibilities, '')), 'C');

CREATE INDEX vacancies_search_idx ON vacancies USING GIN(search_vector);
```

**Поиск-запрос:**

```sql
WHERE search_vector @@ plainto_tsquery('russian', :query)
ORDER BY ts_rank(search_vector, plainto_tsquery('russian', :query)) DESC
```

**Обновление вектора** — через Strapi lifecycle hook `afterCreate` + `afterUpdate`:

```typescript
await strapi.db.connection.raw(
  `
  UPDATE vacancies SET search_vector =
    setweight(to_tsvector('russian', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(description, '')), 'B')
  WHERE id = ?
`,
  [result.id]
)
```

### Сортировка результатов

| Значение sort         | SQL ORDER BY                                                                    |
| --------------------- | ------------------------------------------------------------------------------- |
| `relevance` (default) | `ts_rank DESC, top_placement DESC, boosted_at DESC NULLS LAST, created_at DESC` |
| `newest`              | `created_at DESC`                                                               |
| `salary_asc`          | `salary_from ASC NULLS LAST`                                                    |
| `salary_desc`         | `salary_from DESC NULLS LAST`                                                   |

### Фильтры (SQL условия)

| Фильтр           | Условие                                                    |
| ---------------- | ---------------------------------------------------------- |
| `industry`       | `industry_id = :id`                                        |
| `specialization` | `specialization_id = :id`                                  |
| `country`        | `country = :country`                                       |
| `city`           | `city ILIKE :city`                                         |
| `workFormat`     | `work_format = :format`                                    |
| `employmentType` | `employment_type = :type`                                  |
| `seniority`      | `seniority = :seniority`                                   |
| `salaryFrom`     | `salary_to >= :salaryFrom OR salary_from >= :salaryFrom`   |
| `salaryTo`       | `salary_from <= :salaryTo`                                 |
| `salaryCurrency` | `salary_currency = :currency`                              |
| `skills`         | `skills @> :skills` (JSON containment, требует GIN индекс) |
| `languages`      | `languages @> :langs` (JSON containment)                   |
| `urgent`         | `urgent = true`                                            |
| `topPlacement`   | `top_placement = true`                                     |
| `sourceType`     | `source_type = :type`                                      |

### Обязательные условия (всегда)

```sql
WHERE moderation_status = 'published'
  AND expires_at > NOW()
```

Дополнительно из результатов исключаются вакансии заблокированных пользователей (block filter, `getBlockedUserIds`).

### Пагинация

Offset-based пагинация (достаточно для v1):

```sql
LIMIT :pageSize OFFSET (:page - 1) * :pageSize
```

Default: `pageSize = 20`, max: `pageSize = 50`.

### GIN-индексы для JSON полей

```sql
CREATE INDEX vacancies_skills_idx ON vacancies USING GIN(skills jsonb_path_ops);
CREATE INDEX vacancies_languages_idx ON vacancies USING GIN(languages jsonb_path_ops);
```

---

## Поиск резюме

Аналогично поиску вакансий. Только для Max-плана.

**Индексируемые поля:**

- `title` — вес A (желаемая должность)
- `about` — вес B

**Обязательные условия:**

```sql
WHERE moderation_status = 'published'
```

**Фильтры:**

- `industry` — через specialization
- `specialization_id`
- `country`, `city`
- `workFormat`, `employmentType`
- `experienceYears` — `experience_years >= :min AND experience_years <= :max`
- `skills`, `languages` — GIN JSON containment
- `salaryTo` — `desired_salary <= :salaryTo` (что кандидат хочет ≤ бюджет работодателя)

---

## Поиск компаний

Full-text search по `name` + `description`. Только published компании.

---

## Производительность

- Full-text search: GIN индекс — запрос < 50ms при 100k вакансиях
- Фильтрация: покрывающие индексы на `moderation_status + expires_at` (обязательно)
- JSON-фильтры (skills): медленнее, использовать GIN или перейти на отдельную таблицу при > 500k записей
- Caching: результаты популярных поисков кешировать в Next.js ISR (revalidate = 300s)
