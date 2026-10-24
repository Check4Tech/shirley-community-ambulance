/** Board seats, in About-page order. A blank selection means no seat. */
export const BOARD_POSITIONS = [
  'Chief',
  '1st Assistant Chief',
  '2nd Assistant Chief',
  'Secretary',
  'Treasurer',
]

/** Keep filled seats only, in board order. Ignores anything except position and full name. */
export function boardSeatsFrom(payload) {
  const rows = Array.isArray(payload) ? payload : []
  const names = new Map()
  rows.forEach((row) => {
    const position = typeof row?.position === 'string' ? row.position.trim() : ''
    const fullName = typeof row?.fullName === 'string' ? row.fullName.trim() : ''
    if (!BOARD_POSITIONS.includes(position) || !fullName || names.has(position)) return
    names.set(position, fullName)
  })
  return BOARD_POSITIONS.filter((position) => names.has(position)).map((position) => ({
    position,
    fullName: names.get(position),
  }))
}
