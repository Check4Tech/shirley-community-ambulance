import { useEffect, useMemo, useState } from 'react'
import { readSession } from '../../auth/session'
import { authorizedFetch } from './memberApi'
import { profileIsBls } from './userDetailsOptions'
import {
  grantPermissionKey,
  parsePermissionList,
  permissionStorageKey,
  visiblePermissionModules,
} from './userPermissionModules'

const COLUMN_LABELS = {
  noAccess: 'No Access',
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  sign: 'Sign',
  fullAccess: 'Full Access',
}

const STANDARD_COLUMNS = ['noAccess', 'view', 'create', 'edit', 'delete', 'fullAccess']
const LOG_COLUMNS = ['noAccess', 'view', 'sign', 'edit', 'delete', 'fullAccess']
const MAINTENANCE_COLUMNS = ['sign']
const CALENDAR_COLUMNS = ['noAccess', 'view', 'create', 'edit', 'delete', 'fullAccess']
const MIXED_COLUMNS = ['noAccess', 'view', 'create', 'edit', 'delete', 'sign', 'fullAccess']

function rowsFor(module, hideStandard) {
  const rows = []
  if (!hideStandard) {
    module.standardEntities.forEach((label) => rows.push({ label, key: label.toLowerCase(), kind: 'standard' }))
  }
  ;(module.alwaysEntities ?? []).forEach((label) => rows.push({ label, key: label.toLowerCase(), kind: 'standard' }))
  module.logEntities.forEach((label) => rows.push({ label, key: label.toLowerCase(), kind: 'log' }))
  module.maintenanceEntities.forEach((label) => rows.push({ label, key: label.toLowerCase(), kind: 'maintenance' }))
  module.singleGrantEntities.forEach((label) => rows.push({ label, key: label.toLowerCase(), kind: 'grant' }))
  ;(module.calendarEntities ?? []).forEach((label) => rows.push({ label, key: 'calendar', kind: 'calendar' }))
  ;(module.boardEntities ?? []).forEach((label) => rows.push({ label, key: 'messageboard', kind: 'calendar' }))
  return rows
}

function columnsFor(rows) {
  const kinds = new Set(rows.map((row) => row.kind).filter((kind) => kind !== 'grant'))
  if (kinds.size === 0) return ['noAccess', 'fullAccess']
  if (kinds.size === 1 && kinds.has('calendar')) return CALENDAR_COLUMNS
  if (kinds.size > 1) return MIXED_COLUMNS
  if (kinds.has('log')) return LOG_COLUMNS
  if (kinds.has('maintenance')) return MAINTENANCE_COLUMNS
  return STANDARD_COLUMNS
}

function columnApplies(column, kind) {
  if (kind === 'grant') return column === 'noAccess' || column === 'fullAccess'
  if (kind === 'calendar') return ['noAccess', 'view', 'create', 'edit', 'delete', 'fullAccess'].includes(column)
  if (column === 'noAccess' || column === 'fullAccess') return true
  if (kind === 'standard') return ['view', 'create', 'edit', 'delete'].includes(column)
  if (kind === 'log') return ['view', 'sign', 'edit', 'delete'].includes(column)
  return column === 'sign'
}

async function postPermission(userId, permission) {
  const session = readSession()
  const { response, message } = await authorizedFetch(session, `/user-permissions/add/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ userId: Number(userId), permissions: permission }),
  })
  if (!response.ok) throw new Error(message || 'That permission could not be saved.')
}

async function deletePermission(userId, permission) {
  const session = readSession()
  const { response, message } = await authorizedFetch(
    session,
    `/user-permissions/${userId}/${encodeURIComponent(permission)}`,
    { method: 'DELETE' },
  )
  if (!response.ok) throw new Error(message || 'That permission could not be saved.')
}

export default function MembersUserPermissions({ userId, user, suppliesSubscribed, locked = false }) {
  const [permissions, setPermissions] = useState({})
  const [error, setError] = useState('')
  const role = typeof user?.role === 'string' ? user.role : ''
  const hideStandard = role === 'ROLE_EMS_ORG_ADMIN' || role === 'ROLE_EMS_SUPERVISOR'
  const modules = useMemo(
    () => visiblePermissionModules({ suppliesSubscribed: suppliesSubscribed === true, bls: profileIsBls(user) }),
    [suppliesSubscribed, user],
  )

  useEffect(() => {
    const session = readSession()
    if (!session || !userId) return undefined
    let cancelled = false
    authorizedFetch(session, `/user-permissions/${userId}`)
      .then(async ({ response }) => {
        const body = response.ok ? await response.json() : []
        if (!cancelled) setPermissions(parsePermissionList(body))
      })
      .catch(() => {
        if (!cancelled) setError('Permissions could not be loaded.')
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  function remember(entity, mutate) {
    setPermissions((prev) => {
      const updated = new Set(prev[entity] || [])
      mutate(updated)
      return { ...prev, [entity]: updated }
    })
  }

  async function changePermission(entity, permission, checked, kinds) {
    if (locked) return
    setError('')
    const before = permissions[entity] || new Set()
    remember(entity, (updated) => {
      if (checked) {
        updated.add(permission)
        if (permission !== 'view' && !updated.has('view')) updated.add('view')
      } else {
        updated.delete(permission)
        if (!kinds.some((item) => updated.has(item))) updated.delete('view')
      }
    })
    try {
      if (checked) {
        await postPermission(userId, permissionStorageKey(entity, permission))
        if (permission !== 'view' && !before.has('view')) {
          await postPermission(userId, permissionStorageKey(entity, 'view'))
        }
      } else {
        await deletePermission(userId, permissionStorageKey(entity, permission))
        if (!kinds.some((item) => before.has(item))) {
          await deletePermission(userId, permissionStorageKey(entity, 'view'))
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That permission could not be saved.')
    }
  }

  async function changeFull(entity, checked, kinds) {
    if (locked) return
    setError('')
    const before = permissions[entity] || new Set()
    remember(entity, (updated) => {
      kinds.forEach((item) => (checked ? updated.add(item) : updated.delete(item)))
      if (!checked) updated.delete('view')
    })
    try {
      for (const permission of kinds) {
        const key = permissionStorageKey(entity, permission)
        if (checked && !before.has(permission)) await postPermission(userId, key)
        if (!checked) await deletePermission(userId, key)
      }
      if (!checked) await deletePermission(userId, permissionStorageKey(entity, 'view'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That permission could not be saved.')
    }
  }

  async function changeGrant(entity, checked) {
    if (locked) return
    setError('')
    remember(entity, (updated) => (checked ? updated.add('grant') : updated.delete('grant')))
    try {
      const key = grantPermissionKey(entity)
      if (checked) await postPermission(userId, key)
      else await deletePermission(userId, key)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That permission could not be saved.')
    }
  }

  const has = (entity, permission) => permissions[entity]?.has(permission) || false
  const hasEvery = (entity, kinds) => kinds.every((permission) => has(entity, permission))
  const hasNone = (entity) => !(permissions[entity] && permissions[entity].size > 0)

  return (
    <div className="c4t-people-permissions">
      <p className="c4t-people-permissions-lead">
        {user?.fullName ? `Access for ${user.fullName}. ` : ''}
        Permissions are grouped by module. Changes save when you check a box.
        {locked ? ' You can look, and only an admin or someone with edit or full access for Permissions can change them.' : ''}
      </p>
      {error ? <p className="c4t-fleet-status is-bad">{error}</p> : null}
      <div className="user-permissions-modules">
        {modules.map((module) => {
          const rows = rowsFor(module, hideStandard)
          if (!rows.length) return null
          const columns = columnsFor(rows)
          return (
            <section className="user-permissions-module" key={module.id}>
              <h2 className="user-permissions-module__title">{module.title}</h2>
              <div className="user-details__table-scroll">
                <table className="user-permissions-module__table">
                  <thead>
                    <tr>
                      <th>Entity</th>
                      {columns.map((column) => (
                        <th key={column}>{COLUMN_LABELS[column]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        {columns.map((column) => {
                          if (!columnApplies(column, row.kind)) {
                            return (
                              <td key={column} className="user-permissions-module__na">
                                —
                              </td>
                            )
                          }
                          if (row.kind === 'grant' && column === 'noAccess') {
                            return (
                              <td key={column}>
                                <input
                                  type="checkbox"
                                  checked={hasNone(row.key)}
                                  disabled={locked}
                                  onChange={(event) => changeGrant(row.key, !event.target.checked)}
                                />
                              </td>
                            )
                          }
                          if (row.kind === 'grant' && column === 'fullAccess') {
                            return (
                              <td key={column}>
                                <input
                                  type="checkbox"
                                  checked={has(row.key, 'grant')}
                                  disabled={locked}
                                  onChange={(event) => changeGrant(row.key, event.target.checked)}
                                />
                              </td>
                            )
                          }
                          if (row.kind === 'calendar' && column === 'view') {
                            return (
                              <td key={column}>
                                <input
                                  type="checkbox"
                                  checked
                                  disabled
                                  title="Everyone can view the calendar"
                                  aria-label="Everyone can view the calendar"
                                />
                              </td>
                            )
                          }
                          const kinds =
                            row.kind === 'log'
                              ? ['view', 'sign', 'edit', 'delete']
                              : row.kind === 'maintenance'
                                ? ['sign']
                                : row.kind === 'calendar'
                                  ? ['create', 'edit', 'delete']
                                  : ['view', 'create', 'edit', 'delete']
                          if (column === 'noAccess') {
                            return (
                              <td key={column}>
                                <input
                                  type="checkbox"
                                  checked={hasNone(row.key)}
                                  disabled={locked}
                                  onChange={(event) => changeFull(row.key, !event.target.checked, kinds)}
                                />
                              </td>
                            )
                          }
                          if (column === 'fullAccess') {
                            const checked = row.kind === 'maintenance' ? has(row.key, 'sign') : hasEvery(row.key, kinds)
                            return (
                              <td key={column}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={locked}
                                  onChange={(event) =>
                                    row.kind === 'maintenance'
                                      ? changePermission(row.key, 'sign', event.target.checked, [])
                                      : changeFull(row.key, event.target.checked, kinds)
                                  }
                                />
                              </td>
                            )
                          }
                          return (
                            <td key={column}>
                              <input
                                type="checkbox"
                                checked={has(row.key, column)}
                                disabled={locked}
                                onChange={(event) =>
                                  changePermission(
                                    row.key,
                                    column,
                                    event.target.checked,
                                    kinds.filter((item) => item !== 'view'),
                                  )
                                }
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
