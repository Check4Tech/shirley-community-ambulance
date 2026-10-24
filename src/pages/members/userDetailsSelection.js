/** Same idea as Check4Tech's userDetailsId store: the id never goes in the address. */
const KEY = 'sca-user-details-id'

export function readUserDetailsId() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return /^\d+$/.test(raw ?? '') ? raw : ''
  } catch {
    return ''
  }
}

export function writeUserDetailsId(id) {
  if (!/^\d+$/.test(String(id ?? ''))) return
  try {
    sessionStorage.setItem(KEY, String(id))
  } catch {
    // Storage can be blocked. The details page then asks for a member again.
  }
}
