function pad(value) {
  return String(value).padStart(2, '0')
}

function valid(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return { year, month, day }
}

/** ISO strings, MM/DD/YYYY text, and Jackson LocalDate arrays [year, month, day]. */
export function dateParts(value) {
  if (value == null || value === '') return null
  if (Array.isArray(value) && value.length >= 3) {
    return valid(Number(value[0]), Number(value[1]), Number(value[2]))
  }
  const text = String(value).trim()
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) return valid(Number(match[1]), Number(match[2]), Number(match[3]))
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) return valid(Number(match[3]), Number(match[1]), Number(match[2]))
  match = text.match(/^(\d{4}),\s*(\d{1,2}),\s*(\d{1,2})$/)
  if (match) return valid(Number(match[1]), Number(match[2]), Number(match[3]))
  return null
}

export function formatUsDate(value) {
  const parts = dateParts(value)
  if (!parts) {
    if (value == null || Array.isArray(value)) return ''
    return String(value).trim()
  }
  return `${pad(parts.month)}/${pad(parts.day)}/${parts.year}`
}

export function toIsoDate(value) {
  const parts = dateParts(value)
  if (!parts) return null
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

export function todayUsDate() {
  const now = new Date()
  return formatUsDate([now.getFullYear(), now.getMonth() + 1, now.getDate()])
}

/** Move a calendar date by whole days and return MM/DD/YYYY. */
export function shiftUsDate(value, days) {
  const parts = dateParts(value)
  if (!parts || !Number.isInteger(days)) return ''
  const date = new Date(parts.year, parts.month - 1, parts.day)
  date.setDate(date.getDate() + days)
  return formatUsDate([date.getFullYear(), date.getMonth() + 1, date.getDate()])
}
