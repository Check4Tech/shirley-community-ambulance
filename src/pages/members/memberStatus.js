/** Stored on users.member_status. Labels are what the members area shows. */
export const MEMBER_STATUSES = [
  { value: 'ACTIVE', label: 'Active', locksOut: false },
  { value: 'INACTIVE', label: 'Inactive', locksOut: true },
  { value: 'INACTIVE_LIFE', label: 'Inactive life', locksOut: false },
  { value: 'ACTIVE_LIFE', label: 'Active life', locksOut: false },
  { value: 'PRESTIGIOUS_LIFE', label: 'Prestigious life', locksOut: false },
  { value: 'CLINICAL', label: 'Clinical', locksOut: false },
  { value: 'SUSPENDED', label: 'Suspended', locksOut: true },
  { value: 'EXPELLED', label: 'Expelled', locksOut: true },
  { value: 'STUDENT_LEAVE', label: 'Student leave', locksOut: false },
  { value: 'PERSONAL_LEAVE', label: 'Personal leave', locksOut: false },
  { value: 'MEDICAL_LEAVE', label: 'Medical leave', locksOut: false },
]

function statusKey(value) {
  return String(value).trim().toUpperCase().replace(/[-\s]+/g, '_')
}

export function memberStatusValue(member) {
  const raw = member?.memberStatus
  if (typeof raw === 'string' && raw.trim()) {
    const key = statusKey(raw)
    const match = MEMBER_STATUSES.find(
      (item) => item.value === key || item.label.toUpperCase() === raw.trim().toUpperCase(),
    )
    if (match) return match.value
  }
  const active = member?.isActive ?? member?.active
  if (active === false || active === 'false') return 'INACTIVE'
  if (active === true || active === 'true') return 'ACTIVE'
  return ''
}

export function memberStatusByValue(value) {
  if (value == null || String(value).trim() === '') return null
  const key = statusKey(value)
  return (
    MEMBER_STATUSES.find((item) => item.value === key || item.label.toUpperCase() === String(value).trim().toUpperCase()) ??
    null
  )
}

export function memberStatusLabel(member) {
  const value = typeof member === 'string' ? member : memberStatusValue(member)
  return memberStatusByValue(value)?.label ?? ''
}

export function memberStatusLocksOut(value) {
  return memberStatusByValue(value)?.locksOut === true
}

export function signInLockoutMessage(message) {
  if (typeof message !== 'string') return ''
  if (/suspended/i.test(message)) return 'This account is suspended.'
  if (/expelled/i.test(message)) return 'This account is expelled.'
  if (/inactive/i.test(message)) return 'This account is inactive.'
  return ''
}
