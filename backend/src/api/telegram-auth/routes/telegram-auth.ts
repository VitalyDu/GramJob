export default {
  routes: [
    {
      method: 'POST',
      path: '/auth/telegram',
      handler: 'telegram-auth.telegram',
      config: {
        auth: false,
        middlewares: [],
      },
    },
  ],
}
