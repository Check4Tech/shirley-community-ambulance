import { Navigate, useLocation } from 'react-router-dom'
import { readSession } from '../../auth/session'

export default function RequireMember({ children }) {
  const location = useLocation()
  const session = readSession()
  if (!session || session.hasDefaultPassword) {
    return <Navigate to="/members" replace state={{ from: location.pathname }} />
  }
  return children
}
