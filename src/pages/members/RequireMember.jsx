import { Navigate, useLocation } from 'react-router-dom'
import { readSession } from '../../auth/session'

export default function RequireMember({ children }) {
  const location = useLocation()
  if (!readSession()) {
    return <Navigate to="/members" replace state={{ from: location.pathname }} />
  }
  return children
}
