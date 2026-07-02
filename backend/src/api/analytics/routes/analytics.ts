export default {
  routes: [
    {
      method: 'GET',
      path: '/analytics/vacancies/:id',
      handler: 'analytics.vacancyAnalytics',
      config: {},
    },
    {
      method: 'GET',
      path: '/analytics/resumes/:id',
      handler: 'analytics.resumeAnalytics',
      config: {},
    },
  ],
}
