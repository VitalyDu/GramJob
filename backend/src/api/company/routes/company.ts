export default {
  routes: [
    // Public (no auth required)
    {
      method: 'GET',
      path: '/companies',
      handler: 'company.findPublished',
      config: { auth: false },
    },

    // Authenticated — no :id param — MUST come before /:id
    {
      method: 'GET',
      path: '/companies/my',
      handler: 'company.findMine',
      config: {},
    },
    {
      method: 'POST',
      path: '/companies',
      handler: 'company.create',
      config: {},
    },

    // Public by slug — MUST come before /:id
    {
      method: 'GET',
      path: '/companies/slug/:slug',
      handler: 'company.findBySlug',
      config: { auth: false },
    },

    // By id — public
    {
      method: 'GET',
      path: '/companies/:id',
      handler: 'company.findOne',
      config: { auth: false },
    },

    // By id — owner only (policy)
    {
      method: 'POST',
      path: '/companies/:id/submit',
      handler: 'company.submit',
      config: {
        policies: ['api::company.is-company-owner'],
      },
    },

    // By id — owner only (policy)
    {
      method: 'PUT',
      path: '/companies/:id',
      handler: 'company.update',
      config: {
        policies: ['api::company.is-company-owner'],
      },
    },
    {
      method: 'DELETE',
      path: '/companies/:id',
      handler: 'company.delete',
      config: {
        policies: ['api::company.is-company-owner'],
      },
    },
  ],
}
