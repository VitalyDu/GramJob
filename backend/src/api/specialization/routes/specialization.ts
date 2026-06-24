export default {
  routes: [
    {
      method: 'GET',
      path: '/specializations',
      handler: 'specialization.find',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/specializations/:id',
      handler: 'specialization.findOne',
      config: { auth: false },
    },
  ],
}
