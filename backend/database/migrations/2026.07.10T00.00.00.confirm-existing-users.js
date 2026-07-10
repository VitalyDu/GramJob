'use strict'

// Одноразово подтверждаем всех существующих пользователей при включении
// обязательной email-верификации — иначе они не смогут войти.
// НЕ в bootstrap: bootstrap выполняется на каждом старте и автоподтверждал бы
// новых незавершивших верификацию пользователей.
module.exports = {
  async up(knex) {
    await knex('up_users').where({ confirmed: false }).update({ confirmed: true })
  },
}
