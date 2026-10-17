import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Role } from '../../types';
import { getHomeRouteForRole, getLoginRouteForRoles } from '../../config/authPortals';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

/**
 * Frontend UX Route Guard.
 * NOTE: This is client-side route protection for UX navigation only.
 * It does not replace real server-side access control, token verification, or backend authorization.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    // Redirect unauthenticated visitors to the portal for this area, preserving the target location
    return <Navigate to={getLoginRouteForRoles(allowedRoles)} state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Authenticated users with the wrong role are routed back to their own area
    return <Navigate to={getHomeRouteForRole(user.role)} replace />;
  }

  return <>{children}</>;
};
