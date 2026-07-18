// Users-permissions' updateUserBodySchema uses `yup.string()` without `.nullable()`
// for email/username/password (see plugin server/controllers/validation/user.js).
// Telegram-only users have email=null in DB — Content Manager admin edit sends `email: null`
// back on save, and Yup rejects with "email must be a `string` type, but the final value was: `null`."
//
// Stripping null values mirrors "field not provided" for the Yup layer (which accepts undefined)
// AND for the DB update (undefined key = keep current value). Users editing other fields
// on Telegram accounts no longer hit the validator.
//
// We intentionally do NOT convert null → "" — empty string still fails `.email().min(1)`.
export function stripNullStringFieldsFromBody(body: unknown): void {
  if (!body || typeof body !== 'object') return
  const record = body as Record<string, unknown>
  for (const key of ['email', 'username', 'password'] as const) {
    if (key in record && record[key] === null) {
      delete record[key]
    }
  }
}
