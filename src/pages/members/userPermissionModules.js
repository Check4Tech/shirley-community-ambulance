/** EMS permission modules from Check4Tech-Client user details. Shirley is EMS. */

export const GRANT_PERMISSION_BY_ENTITY = {
  bylaws: 'PERMISSION_BYLAWS',
  'training library': 'PERMISSION_TRAINING',
  students: 'PERMISSION_STUDENTS',
  probationary: 'PERMISSION_PROBATIONARY',
}

export const EMS_PERMISSION_MODULES = [
  {
    id: 'rig-checks',
    title: 'Rig Checks',
    standardEntities: ['Create Rig Checks', 'View Finalized Rig Checks', 'Vehicles', 'Compartments'],
  },
  {
    id: 'building-checks',
    title: 'Building Checks',
    standardEntities: ['Create Building Checks', 'View Finalized Building Checks', 'Substations'],
  },
  {
    id: 'assets',
    title: 'Assets',
    standardEntities: ['Communications', 'Devices'],
  },
  {
    id: 'supplies',
    title: 'Supplies',
    standardEntities: [
      'Uniforms',
      'Medications',
      'Equipment',
      'Blood',
      'Lot Numbers',
      'Scba',
      'Scba History',
      'Cylinders',
      'Decontamination',
    ],
  },
  {
    id: 'narcotics',
    title: 'Narcotics',
    standardEntities: ['Controlled Substances', 'Pouches', 'Safes', 'Seals'],
    logEntities: ['Narcotics Logs'],
  },
  {
    id: 'losap',
    title: 'LOSAP',
    standardEntities: ['LOSAP', 'Training', 'Standby', 'Meetings'],
  },
  {
    id: 'logs',
    title: 'Logs',
    standardEntities: ['Schedule Maintenance'],
    maintenanceEntities: ['Maintenance Logs'],
  },
  {
    id: 'organization',
    title: 'Organization',
    standardEntities: ['Users'],
    alwaysEntities: ['Permissions'],
    singleGrantEntities: ['Bylaws', 'Training library', 'Students', 'Probationary'],
    calendarEntities: ['Calendar'],
    boardEntities: ['Message Board'],
  },
]

const ALS_ONLY = new Set(['Controlled Substances', 'Pouches', 'Safes', 'Seals'])

export function visiblePermissionModules({ suppliesSubscribed, bls }) {
  return EMS_PERMISSION_MODULES.map((mod) => {
    let standardEntities = mod.standardEntities.filter((entity) => suppliesSubscribed || entity !== 'Blood')
    let logEntities = mod.logEntities ?? []
    if (bls) {
      standardEntities = standardEntities.filter((entity) => !ALS_ONLY.has(entity))
      logEntities = logEntities.filter((entity) => entity !== 'Narcotics Logs')
    }
    return {
      ...mod,
      standardEntities,
      logEntities,
      alwaysEntities: mod.alwaysEntities ?? [],
      maintenanceEntities: mod.maintenanceEntities ?? [],
      singleGrantEntities: mod.singleGrantEntities ?? [],
      calendarEntities: mod.calendarEntities ?? [],
      boardEntities: mod.boardEntities ?? [],
    }
  }).filter(
    (mod) =>
      mod.standardEntities.length > 0 ||
      (mod.alwaysEntities ?? []).length > 0 ||
      mod.logEntities.length > 0 ||
      mod.maintenanceEntities.length > 0 ||
      mod.singleGrantEntities.length > 0 ||
      (mod.calendarEntities ?? []).length > 0 ||
      (mod.boardEntities ?? []).length > 0,
  )
}

export function grantPermissionKey(entityKey) {
  return GRANT_PERMISSION_BY_ENTITY[entityKey] ?? `PERMISSION_${entityKey.toUpperCase()}`
}

export function grantEntityKeyForPermission(permission) {
  const match = Object.entries(GRANT_PERMISSION_BY_ENTITY).find(([, value]) => value === permission)
  return match ? match[0] : null
}

export function parsePermissionList(list) {
  const data = {}
  if (!Array.isArray(list)) return data
  for (const permission of list) {
    if (typeof permission !== 'string') continue
    const grantEntity = grantEntityKeyForPermission(permission)
    if (grantEntity) {
      if (!data[grantEntity]) data[grantEntity] = new Set()
      data[grantEntity].add('grant')
      continue
    }
    const parts = permission.split('_')
    if (parts.length < 3 || parts[0] !== 'PERMISSION') continue
    const entity = parts[1].toLowerCase()
    const permType = parts[2].toLowerCase()
    if (!data[entity]) data[entity] = new Set()
    data[entity].add(permType)
  }
  return data
}

export function permissionStorageKey(entity, permission) {
  return `PERMISSION_${entity.toUpperCase()}_${permission.toUpperCase()}`
}
