import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AuthPage } from './pages/AuthPage';
import { GamingGroups } from './components/GamingGroups';
import { Campaigns } from './components/Campaigns';
import { Missions } from './components/Missions';
import { ArmyManagement } from './components/ArmyManagement';
import { ArmyDetailView } from './components/ArmyDetailView';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/groups" replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/auth" element={
        <PublicRoute>
          <AuthPage />
        </PublicRoute>
      } />
      <Route path="/groups" element={
        <ProtectedRoute>
          <GamingGroups />
        </ProtectedRoute>
      } />
      <Route path="/groups/:groupId/campaigns" element={
        <ProtectedRoute>
          <Campaigns />
        </ProtectedRoute>
      } />
      <Route path="/campaigns/:campaignId/missions" element={
        <ProtectedRoute>
          <Missions />
        </ProtectedRoute>
      } />
      <Route path="/armies" element={
        <ProtectedRoute>
          <ArmyManagement />
        </ProtectedRoute>
      } />
      <Route path="/armies/:armyId" element={
        <ProtectedRoute>
          <ArmyDetailView />
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/groups" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;