export default {
  routes: [
    {
      method: 'POST',
      path: '/reports',
      handler: 'report.create',
      config: {},
    },
  ],
}
