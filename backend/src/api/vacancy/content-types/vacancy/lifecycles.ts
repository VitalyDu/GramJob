type VacancyBeforeCreateEvent = {
  params: {
    data: Record<string, unknown>
  }
}

type VacancyBeforeUpdateEvent = {
  params: {
    data: Record<string, unknown>
    documentId?: string
    where?: Record<string, unknown>
  }
}

type VacancyAfterEvent = {
  result: { documentId?: string; id?: number; status?: string; expiresAt?: string | null }
  params: unknown
}

function sanitizeJsonFields(data: Record<string, unknown>) {
  for (const field of ['skills', 'languages']) {
    if (data[field] === '' || data[field] === undefined) {
      data[field] = null
    }
  }
}

export default {
  async beforeCreate(event: VacancyBeforeCreateEvent) {
    const { data } = event.params
    sanitizeJsonFields(data)

    const posterId = typeof data.postedBy === 'number' ? data.postedBy : null
    if (!posterId) return

    const poster = await (globalThis.strapi.db as any)
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: posterId }, select: ['subscriptionPlan'] })

    if (poster?.subscriptionPlan === 'vip') {
      data.highlighted = true
    }
  },

  async beforeUpdate(event: VacancyBeforeUpdateEvent) {
    const { data } = event.params
    sanitizeJsonFields(data)

    if (data?.status === 'published') {
      const expiresAt = new Date()
      expiresAt.setUTCDate(expiresAt.getUTCDate() + 60)
      data.expiresAt = expiresAt.toISOString()
    }
  },

  async afterCreate(event: VacancyAfterEvent) {
    // No await: raw SQL runs after Strapi commits the transaction to avoid lock deadlock
    updateSearchVector(event.result.id)
  },

  async afterUpdate(event: VacancyAfterEvent) {
    // No await: raw SQL runs after Strapi commits the transaction to avoid lock deadlock
    updateSearchVector(event.result.id)

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
