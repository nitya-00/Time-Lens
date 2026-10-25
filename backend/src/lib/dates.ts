/** A calendar date is stored as midnight UTC, while its meaning is in a user's IANA timezone. */
export function dateKeyInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value)
  const item = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value
  return `${item('year')}-${item('month')}-${item('day')}`
}

export function calendarDate(value: string) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) throw new Error('Invalid calendar date.')
  return new Date(`${value}T00:00:00.000Z`)
}

export function todayInTimeZone(timeZone: string, now = new Date()) {
  return calendarDate(dateKeyInTimeZone(now, timeZone))
}

export function validTimeZone(value: string) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return true } catch { return false }
}
