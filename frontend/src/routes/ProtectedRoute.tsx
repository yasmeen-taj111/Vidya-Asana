import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Role } from '../api/types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their respective dashboards
    if (user.role === 'SITE_OWNER') {
      return <Navigate to="/owner" replace />;
    } else if (user.role === 'LIBRARY_ADMIN') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/app" replace />;
    }
  }

  return children;
};
