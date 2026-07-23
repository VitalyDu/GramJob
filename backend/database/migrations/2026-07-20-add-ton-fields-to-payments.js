'use strict'

module.exports = {
  async up(knex) {
    // Fresh install: Strapi schema sync will create the table with all columns already
    // defined in schema.json — nothing to migrate.
    const hasTable = await knex.schema.hasTable('payments')
    if (!hasTable) return

    // Make telegram_charge_id nullable for TON payments (no telegram charge)
    const hasChargeIdColumn = await knex.schema.hasColumn('payments', 'telegram_charge_id')
    if (hasChargeIdColumn) {
      await knex.schema.alterTable('payments', (t) => {
        t.string('telegram_charge_id').nullable().alter()
      })
    }

    // Add columns if they don't exist
    const hasProvider = await knex.schema.hasColumn('payments', 'provider')
    if (!hasProvider) {
      await knex.schema.alterTable('payments', (t) => {
        t.string('provider').notNullable().defaultTo('telegram')
        t.string('ton_tx_hash')
        t.string('intent_id')
        t.double('usdt_amount')
      })
    }

    // Backfill existing rows
    await knex('payments').whereNull('provider').update({ provider: 'telegram' })

    // Unique indexes (Strapi may create these too, but idempotent guard)
    const idx = async (name, cols) => {
      const exists = await knex.raw(`SELECT 1 FROM pg_indexes WHERE indexname = ?`, [name])
      if (exists.rows.length === 0) {
        await knex.raw(`CREATE UNIQUE INDEX ${name} ON payments (${cols.join(', ')})`)
      }
    }
    await idx('payments_ton_tx_hash_unique', ['ton_tx_hash'])
    await idx('payments_intent_id_unique', ['intent_id'])
  },

  async down(knex) {
    // Revert telegram_charge_id to not nullable (note: may fail if NULL rows exist)
    await knex.schema.alterTable('payments', (t) => {
      t.string('telegram_charge_id').notNullable().alter()
    })

    await knex.schema.alterTable('payments', (t) => {
      t.dropColumn('provider')
      t.dropColumn('ton_tx_hash')
      t.dropColumn('intent_id')
      t.dropColumn('usdt_amount')
    })
  },
}
