import { Navigate } from 'react-router-dom'
import { PROBATIONARY_PERMISSION, useCohortAccess } from './cohortAccess'

export default function RequireCohort({ permission, children }) {
  const access = useCohortAccess()
  if (access.loading) return null
  const allowed = permission === PROBATIONARY_PERMISSION ? access.probationary : access.students
  if (!allowed) return <Navigate to="/members/home" replace />
  return children
}
