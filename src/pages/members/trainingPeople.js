export function completionUserIds(assignment) {
  const ids = []
  const seen = new Set()
  ;(assignment?.completions || []).forEach((row) => {
    if (row?.userId == null) return
    const key = String(row.userId)
    if (seen.has(key)) return
    seen.add(key)
    ids.push(row.userId)
  })
  return ids
}

/** People on any give-out of this training file. */
export function userIdsOnTraining(resource, assignmentRows) {
  const ids = []
  const seen = new Set()
  if (resource?.id == null) return ids
  ;(assignmentRows || []).forEach((assignment) => {
    const onFile = (assignment?.resources || []).some((item) => String(item?.id) === String(resource.id))
    if (!onFile) return
    completionUserIds(assignment).forEach((id) => {
      const key = String(id)
      if (seen.has(key)) return
      seen.add(key)
      ids.push(id)
    })
  })
  return ids
}

/** Select all checks every visible person. Clearing it checks nobody, including people who started checked. */
export function selectionAfterToggleAll(checked, people) {
  if (!checked) return []
  return (people || []).filter((person) => person?.id != null).map((person) => person.id)
}

/** Ids the people list can show, using each row's own id. */
export function idsInPicker(ids, people) {
  const wanted = new Set((ids || []).filter((id) => id != null).map((id) => String(id)))
  return (people || [])
    .filter((person) => person?.id != null && wanted.has(String(person.id)))
    .map((person) => person.id)
}
