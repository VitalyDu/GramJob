export default {
  routes: [
    {
      method: 'GET',
      path: '/subscription-plans',
      handler: 'subscription-plan.findAll',
      config: { auth: false },
    },
  ],
}
