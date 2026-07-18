export default {
  routes: [
    {
      method: 'POST',
      path: '/payments/subscribe',
      handler: 'payment.subscribe',
      config: {},
    },
    {
      method: 'POST',
      path: '/payments/vacancy-pack',
      handler: 'payment.vacancyPack',
      config: {},
    },
    {
      method: 'POST',
      path: '/payments/apply-pack',
      handler: 'payment.applyPack',
      config: {},
    },
    {
      method: 'POST',
      path: '/payments/urgent',
      handler: 'payment.urgent',
      config: {},
    },
    {
      method: 'POST',
      path: '/payments/top-placement',
      handler: 'payment.topPlacement',
      config: {},
    },
  ],
}
