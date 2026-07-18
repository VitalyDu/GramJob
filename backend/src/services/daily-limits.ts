import type { Core } from '@strapi/strapi'

/**
 * Персистентные суточные счётчики (apply, boost).
 *
 * Заменяет in-memory Map, которая сбрасывалась при рестарте и не работала
 * в multi-instance деплое.
 *
 * Атомарность гарантируется одним SQL-запросом:
 *   UPDATE ... WHERE (счётчик ещё не исчерпан) RETURNING new_count
 * Если UPDATE обновил 0 строк — лимит достигнут.
 */

export type DailyLimitKind = 'apply' | 'boost'

const COLUMNS: Record<DailyLimitKind, { count: string; date: string }> = {
  apply: { count: 'daily_apply_count', date: 'daily_apply_date' },
  boost: { count: 'daily_boost_count', date: 'daily_boost_date' },
}

interface UsedTodayRow {
  count: number
}

interface ConsumeRow {
  new_count: number
}

export async function getUsedToday(
  strapi: Core.Strapi,
  kind: DailyLimitKind,
  userId: number
): Promise<number> {
  const c = COLUMNS[kind]
  const res = (await strapi.db.connection.raw(
    `SELECT CASE WHEN ${c.date} = CURRENT_DATE THEN ${c.count} ELSE 0 END AS count
     FROM up_users WHERE id = ?`,
    [userId]
  )) as { rows: UsedTodayRow[] }
  return res.rows[0]?.count ?? 0
}

/**
 * Атомарно: если сегодняшний счётчик < limit, увеличивает и возвращает новый счётчик.
 * Если сегодняшний счётчик >= limit — возвращает null (лимит достигнут).
 * Если date != CURRENT_DATE — сбрасывает на 1 (новый день).
 */
export async function tryConsumeDaily(
  strapi: Core.Strapi,
  kind: DailyLimitKind,
  userId: number,
  limit: number
): Promise<number | null> {
  const c = COLUMNS[kind]
  // ВАЖНО: сначала логика сброса (date != CURRENT_DATE) — тогда count всегда = 1.
  // Иначе сравниваем count < limit.
  const res = (await strapi.db.connection.raw(
    `UPDATE up_users
     SET ${c.date} = CURRENT_DATE,
         ${c.count} = CASE
           WHEN ${c.date} = CURRENT_DATE THEN ${c.count} + 1
           ELSE 1
         END
     WHERE id = ?
       AND (${c.date} IS NULL OR ${c.date} < CURRENT_DATE OR ${c.count} < ?)
     RETURNING ${c.count} AS new_count`,
    [userId, limit]
  )) as { rows: ConsumeRow[] }
  if (res.rows.length === 0) return null
  return res.rows[0]!.new_count
}

/**
 * Откат ранее заявленного расхода. Уменьшает счётчик на 1 (не ниже нуля).
 * Работает только если date == CURRENT_DATE — иначе откат не имеет смысла.
 */
export async function refundDaily(
  strapi: Core.Strapi,
  kind: DailyLimitKind,
  userId: number
): Promise<void> {
  const c = COLUMNS[kind]
  await strapi.db.connection.raw(
    `UPDATE up_users
     SET ${c.count} = GREATEST(${c.count} - 1, 0)
     WHERE id = ? AND ${c.date} = CURRENT_DATE`,
    [userId]
  )
}
