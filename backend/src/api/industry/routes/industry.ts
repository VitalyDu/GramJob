export default {
  routes: [
    {
      method: 'GET',
      path: '/industries',
      handler: 'industry.find',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/industries/:id',
      handler: 'industry.findOne',
      config: { auth: false },
    },
  ],
}
