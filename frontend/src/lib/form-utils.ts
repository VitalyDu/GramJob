/**
 * Scrolls to the first invalid field in the nearest form.
 * Pass as the `onInvalid` argument of React Hook Form's handleSubmit().
 * Uses requestAnimationFrame so React has time to set aria-invalid on inputs.
 */
export function scrollToFirstFormError(): void {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}
