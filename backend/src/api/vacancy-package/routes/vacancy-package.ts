export default {
  routes: [
    {
      method: 'GET',
      path: '/vacancy-packages',
      handler: 'vacancy-package.findAll',
      config: { auth: false },
    },
  ],
}
