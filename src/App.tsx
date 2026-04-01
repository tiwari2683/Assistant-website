import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './controllers/store';
import { useAppSelector, useAppDispatch } from './controllers/hooks';
import { setAuthSuccess, clearAuth } from './controllers/slices/authSlice';
import { LoginScreen } from './views/pages/auth/LoginScreen';
import { SignupScreen } from './views/pages/auth/SignupScreen';
import { ForgotPasswordScreen } from './views/pages/auth/ForgotPasswordScreen';
import { Layout } from './views/components/Layout/Layout';
import Dashboard from './views/pages/dashboard/Dashboard';
import AppointmentsList from './views/pages/appointments/AppointmentsList';
import PatientsDirectory from './views/pages/patients/PatientsDirectory';
import { NewPatientForm } from './views/pages/visit/NewPatientForm';
import { SettingsScreen } from './views/pages/Settings/SettingsScreen';
import { PendingFilesProvider } from './contexts/PendingFilesContext';
import './index.css';

// Require Auth Wrapper
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Main Routing Component
const AppRouter = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { fetchUserAttributes, signOut } = await import('aws-amplify/auth');
        const attributes = await fetchUserAttributes();
        const role = (attributes['custom:role'] as 'Assistant' | 'Doctor') || 'Assistant';

        if (role !== 'Assistant') {
            await signOut();
            dispatch(clearAuth());
            return;
        }

        dispatch(setAuthSuccess({
          email: attributes.email || 'user@clinic.com',
          name: attributes.name || 'Assistant User',
          role: role
        }));
      } catch (err) {
        // Not authenticated
      } finally {
        setIsInitializing(false);
      }
    };
    checkAuthStatus();
  }, [dispatch]);

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center bg-appBg"><div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={
            authMode === 'login'
              ? <LoginScreen onNavigateToSignup={() => setAuthMode('signup')} onNavigateToForgotPassword={() => setAuthMode('forgot-password')} />
              : authMode === 'signup'
                ? <SignupScreen onNavigateToLogin={() => setAuthMode('login')} />
                : <ForgotPasswordScreen onNavigateToLogin={() => setAuthMode('login')} />
          } />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }>
          <Route index element={<Dashboard />} />
          <Route path="appointments" element={<AppointmentsList />} />
          <Route path="patients" element={<PatientsDirectory />} />
          <Route path="visit/new" element={<NewPatientForm />} />
          <Route path="visit/:patientId" element={<NewPatientForm />} />
          <Route path="settings" element={<SettingsScreen />} />
          {/* Default redirect for unknown routes inside layout */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

function App() {
  return (
    <Provider store={store}>
      <PendingFilesProvider>
        <AppRouter />
      </PendingFilesProvider>
    </Provider>
  );
}

export default App;
