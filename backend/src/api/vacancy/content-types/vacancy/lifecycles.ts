type VacancyEvent = {
  result: { documentId?: string; id?: number; status?: string; expiresAt?: string | null }
  params: unknown
}

export default {
  async afterCreate(event: VacancyEvent) {
    await updateSearchVector(event.result.id)
  },

  async afterUpdate(event: VacancyEvent) {
    await updateSearchVector(event.result.id)

    if (event.result.status === 'published') {
      const s = globalThis.strapi
      s.log.info(`[vacancy] Vacancy ${event.result.documentId} published`)
      // TODO Sprint 7: send Telegram notification to postedBy user
    }
  },
}

async function updateSearchVector(vacancyId: number | undefined) {
  if (!vacancyId) return
  const s = globalThis.strapi
  try {
    await s.db.connection.raw(
      `UPDATE vacancies
       SET search_vector =
         setweight(to_tsvector('russian', coalesce(title, '')), 'A') ||
         setweight(to_tsvector('russian', coalesce(description, '')), 'B') ||
         setweight(to_tsvector('russian', coalesce(responsibilities, '')), 'C') ||
         setweight(to_tsvector('russian', coalesce(requirements, '')), 'C')
       WHERE id = ?`,
      [vacancyId]
    )
  } catch {
    s.log.warn(`[vacancy] Failed to update search_vector for id=${vacancyId}`)
  }
}
