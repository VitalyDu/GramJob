export default {
  routes: [
    {
      method: 'GET',
      path: '/analytics/vacancies/:id',
      handler: 'analytics.vacancyAnalytics',
      config: { middlewares: ['plugin::users-permissions.isAuthenticated'] },
    },
    {
      method: 'GET',
      path: '/analytics/resumes/:id',
      handler: 'analytics.resumeAnalytics',
      config: { middlewares: ['plugin::users-permissions.isAuthenticated'] },
    },
  ],
}
