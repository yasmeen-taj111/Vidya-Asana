import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { OwnerLayout } from '../layouts/OwnerLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { UserLayout } from '../layouts/UserLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Public pages
import { Landing } from '../pages/public/Landing';
import { Login } from '../pages/public/Login';
import { Register } from '../pages/public/Register';
import { RegisterLibrary } from '../pages/public/RegisterLibrary';

// Owner pages
import { OwnerDashboard } from '../pages/owner/Dashboard';

// Admin pages
import { Overview } from '../pages/admin/Overview';
import { Profile } from '../pages/admin/Profile';
import { SeatsAndGrid } from '../pages/admin/SeatsAndGrid';
import { Slots } from '../pages/admin/Slots';
import { Bookings } from '../pages/admin/Bookings';
import { Scan } from '../pages/admin/Scan';
import { WalkIn } from '../pages/admin/WalkIn';
import { Analytics } from '../pages/admin/Analytics';

// User pages
import { Home } from '../pages/user/Home';
import { Discover } from '../pages/user/Discover';
import { Book } from '../pages/user/Book';
import { MyBookings } from '../pages/user/MyBookings';
import { Waitlist } from '../pages/user/Waitlist';
import { Study } from '../pages/user/Study';
import { Leaderboard } from '../pages/user/Leaderboard';
import { Reports } from '../pages/user/Reports';
import { Preferences } from '../pages/user/Preferences';

export const router = createBrowserRouter([
  // Public Routes
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'register-library', element: <RegisterLibrary /> },
    ],
  },

  // Site Owner Routes
  {
    path: '/owner',
    element: (
      <ProtectedRoute allowedRoles={['SITE_OWNER']}>
        <OwnerLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <OwnerDashboard /> },
    ],
  },

  // Library Admin Routes
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['LIBRARY_ADMIN']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Overview /> },
      { path: 'profile', element: <Profile /> },
      { path: 'seats', element: <SeatsAndGrid /> },
      { path: 'slots', element: <Slots /> },
      { path: 'bookings', element: <Bookings /> },
      { path: 'scan', element: <Scan /> },
      { path: 'walk-in', element: <WalkIn /> },
      { path: 'analytics', element: <Analytics /> },
    ],
  },

  // Student / User Routes
  {
    path: '/app',
    element: (
      <ProtectedRoute allowedRoles={['USER']}>
        <UserLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'discover', element: <Discover /> },
      { path: 'libraries/:libraryId/book', element: <Book /> },
      { path: 'bookings', element: <MyBookings /> },
      { path: 'waitlist', element: <Waitlist /> },
      { path: 'study', element: <Study /> },
      { path: 'leaderboard', element: <Leaderboard /> },
      { path: 'reports', element: <Reports /> },
      { path: 'preferences', element: <Preferences /> },
    ],
  },

  // Catch-all
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
