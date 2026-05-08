import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import ImportXml from './pages/ImportXml';
import Branches from './pages/Branches';
import Suppliers from './pages/Suppliers';
import MateriaPrima from './pages/MateriaPrima';
import GestaodeCompras from './pages/GestaodeCompras';
import GestaodeFrota from './pages/GestaodeFrota';
import Controladoria from './pages/Controladoria';
import NF from './pages/NF';
import UsersPage from './pages/Users';
import { useLocation } from 'react-router-dom';
import AppHeaderLayout from './components/layout/AppHeaderLayout';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderPage = () => {
    switch (location.pathname) {
      case '/':
        return <Dashboard />;
      case '/nf':
        return <NF />;
      case '/notas':
        return <Invoices />;
      case '/materia-prima':
        return <MateriaPrima />;
      case '/gestao-compras':
        return <GestaodeCompras />;
      case '/gestao-frota':
        return <GestaodeFrota />;
      case '/controladoria':
        return <Controladoria />;
      case '/importar':
        return <ImportXml />;
      case '/filiais':
        return <Branches />;
      case '/usuarios':
        return <UsersPage />;
      case '/fornecedores':
        return <Suppliers />;
      default:
        return <PageNotFound />;
    }
  };

  return (
    <AppHeaderLayout currentPath={location.pathname}>
      {renderPage()}
    </AppHeaderLayout>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App