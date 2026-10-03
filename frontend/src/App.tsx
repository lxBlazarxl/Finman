import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { DashboardView } from './views/DashboardView';
import { AppShellLayout, type ActiveTab } from './components/layout/AppShellLayout';
import { authApi, householdApi } from './api/client';
import { Center, Loader } from '@mantine/core';
import { TransactionsView } from './views/TransactionsView';
import { AnalyticsView } from './views/AnalyticsView';
import { HouseholdView } from './views/HouseholdView';

export const App: React.FC = () => {
  const { isAuthenticated, user, setAuth, setHousehold, logout } = useAuthStore();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isInitialized, setIsInitialized] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('finman_token');
    if (token && !user) {
      setValidating(true);
      authApi
        .getMe()
        .then((userData) => {
          setAuth(token, userData);
          return householdApi.getHousehold();
        })
        .then((hhData) => {
          setHousehold(hhData);
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setValidating(false);
        });
    } else if (!token) {
      authApi
        .getStatus()
        .then((status) => {
          setIsInitialized(status.initialized);
          if (!status.initialized) {
            setAuthMode('register');
          }
        })
        .catch(() => {
          setIsInitialized(true);
        });
    }
  }, []);

  if (validating) {
    return (
      <Center h="100vh">
        <Loader size="lg" color="emerald" />
      </Center>
    );
  }

  if (!isAuthenticated) {
    if (authMode === 'register') {
      return <RegisterView onNavigateToLogin={() => setAuthMode('login')} />;
    }
    return (
      <LoginView
        onNavigateToSetup={() => setAuthMode('register')}
        showSetupLink={!isInitialized}
      />
    );
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigateToTransactions={() => setActiveTab('transactions')} />;
      case 'transactions':
        return <TransactionsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'household':
        return <HouseholdView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <AppShellLayout activeTab={activeTab} onSelectTab={setActiveTab}>
      {renderActiveScreen()}
    </AppShellLayout>
  );
};

export default App;
