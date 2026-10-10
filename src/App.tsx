import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ToastContainer } from '@/components/Toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { ReactNode } from 'react';

import { LoginPage } from '@/pages/auth/Login';
import { RegisterPage } from '@/pages/auth/Register';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPassword';
import { UnauthorizedPage } from '@/pages/Unauthorized';

import { HouseholdDashboard } from '@/pages/household/HouseholdDashboard';
import { PlaceRequestPage } from '@/pages/household/PlaceRequest';
import { MyRequestsPage } from '@/pages/household/MyRequests';
import { CollectionHistoryPage } from '@/pages/household/CollectionHistory';
import { RewardsPage } from '@/pages/household/Rewards';
import { ProfilePage } from '@/pages/household/Profile';

import { ManagementDashboard } from '@/pages/management/ManagementDashboard';
import { CollectionManagementPage } from '@/pages/management/CollectionManagement';
import { WasteReceivingPage } from '@/pages/management/WasteReceiving';
import { AIDetectionPage } from '@/pages/management/AIDetection';
import { ManualReviewPage } from '@/pages/management/ManualReview';
import { SmartBinsPage } from '@/pages/management/SmartBins';
import { InventoryPage } from '@/pages/management/Inventory';
import { RequirementsPage } from '@/pages/management/Requirements';
import { DispatchPage } from '@/pages/management/Dispatch';
import { AlertsPage } from '@/pages/management/Alerts';
import { AnalyticsPage } from '@/pages/management/Analytics';
import { ReportsPage } from '@/pages/management/Reports';
import { HistoryPage } from '@/pages/management/History';
import { SettingsPage } from '@/pages/management/Settings';
import { ManagementUsersPage } from '@/pages/management/ManagementUsers';

function RequireAuth({ children, role }: { children: ReactNode; role?: 'household' | 'management' }) {
  const { user, loading, isHousehold, isManagement } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (role === 'household' && !isHousehold) return <Navigate to="/unauthorized" replace />;
  if (role === 'management' && !isManagement) return <Navigate to="/unauthorized" replace />;

  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { user, loading, isHousehold, isManagement } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (isHousehold) return <Navigate to="/household/dashboard" replace />;
  if (isManagement) return <Navigate to="/management/dashboard" replace />;
  // Authenticated user with no valid role (e.g., deactivated management)
  return <Navigate to="/unauthorized" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Household routes */}
          <Route path="/household/dashboard" element={<RequireAuth role="household"><HouseholdDashboard /></RequireAuth>} />
          <Route path="/household/new-request" element={<RequireAuth role="household"><PlaceRequestPage /></RequireAuth>} />
          <Route path="/household/requests" element={<RequireAuth role="household"><MyRequestsPage /></RequireAuth>} />
          <Route path="/household/history" element={<RequireAuth role="household"><CollectionHistoryPage /></RequireAuth>} />
          <Route path="/household/rewards" element={<RequireAuth role="household"><RewardsPage /></RequireAuth>} />
          <Route path="/household/profile" element={<RequireAuth role="household"><ProfilePage /></RequireAuth>} />

          {/* Management routes */}
          <Route path="/management/dashboard" element={<RequireAuth role="management"><ManagementDashboard /></RequireAuth>} />
          <Route path="/management/collection" element={<RequireAuth role="management"><CollectionManagementPage /></RequireAuth>} />
          <Route path="/management/receiving" element={<RequireAuth role="management"><WasteReceivingPage /></RequireAuth>} />
          <Route path="/management/ai-detection" element={<RequireAuth role="management"><AIDetectionPage /></RequireAuth>} />
          <Route path="/management/manual-review" element={<RequireAuth role="management"><ManualReviewPage /></RequireAuth>} />
          <Route path="/management/smart-bins" element={<RequireAuth role="management"><SmartBinsPage /></RequireAuth>} />
          <Route path="/management/inventory" element={<RequireAuth role="management"><InventoryPage /></RequireAuth>} />
          <Route path="/management/requirements" element={<RequireAuth role="management"><RequirementsPage /></RequireAuth>} />
          <Route path="/management/dispatch" element={<RequireAuth role="management"><DispatchPage /></RequireAuth>} />
          <Route path="/management/alerts" element={<RequireAuth role="management"><AlertsPage /></RequireAuth>} />
          <Route path="/management/analytics" element={<RequireAuth role="management"><AnalyticsPage /></RequireAuth>} />
          <Route path="/management/reports" element={<RequireAuth role="management"><ReportsPage /></RequireAuth>} />
          <Route path="/management/history" element={<RequireAuth role="management"><HistoryPage /></RequireAuth>} />
          <Route path="/management/settings" element={<RequireAuth role="management"><SettingsPage /></RequireAuth>} />
          <Route path="/management/users" element={<RequireAuth role="management"><RequireAdmin><ManagementUsersPage /></RequireAdmin></RequireAuth>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </AuthProvider>
  );
}
