export default {
  routes: [
    // Public — no auth
    {
      method: 'GET',
      path: '/vacancies',
      handler: 'vacancy.findPublished',
      config: { auth: false },
    },

    // Authenticated — no :id param — MUST come before /:id
    {
      method: 'GET',
      path: '/vacancies/my',
      handler: 'vacancy.findMine',
      config: {},
    },
    {
      method: 'POST',
      path: '/vacancies',
      handler: 'vacancy.create',
      config: {},
    },

    // Public by id
    {
      method: 'GET',
      path: '/vacancies/:id',
      handler: 'vacancy.findOne',
      config: { auth: false },
    },

    // Owner-only actions via policy
    {
      method: 'POST',
      path: '/vacancies/:id/publish',
      handler: 'vacancy.publish',
      config: {
        policies: ['api::vacancy.is-vacancy-owner'],
      },
    },
    {
      method: 'POST',
      path: '/vacancies/:id/boost',
      handler: 'vacancy.boost',
      config: {
        policies: ['api::vacancy.is-vacancy-owner'],
      },
    },
    {
      method: 'POST',
      path: '/vacancies/:id/archive',
      handler: 'vacancy.archive',
      config: {
        policies: ['api::vacancy.is-vacancy-owner'],
      },
    },
    {
      method: 'PUT',
      path: '/vacancies/:id',
      handler: 'vacancy.update',
      config: {
        policies: ['api::vacancy.is-vacancy-owner'],
      },
    },
  ],
}
