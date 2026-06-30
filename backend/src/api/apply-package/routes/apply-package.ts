export default {
  routes: [
    {
      method: 'GET',
      path: '/apply-packages',
      handler: 'apply-package.findAll',
      config: { auth: false },
    },
  ],
}
