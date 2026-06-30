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
import Arquivadas from './pages/Arquivadas';
import Canceladas from './pages/Canceladas';
import CriciumaInvoices from './pages/CriciumaInvoices';
import NotasParaVerificar from './pages/NotasParaVerificar';
import CTe from './pages/CTe';
import NFSe from './pages/NFSe';
import Conferencia from './pages/Conferencia';
import { useLocation } from 'react-router-dom';
import AppHeaderLayout from './components/layout/AppHeaderLayout';

const AuthenticatedApp = () => {
  const location = useLocation();

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
      case '/arquivadas':
        return <Arquivadas />;
      case '/canceladas':
        return <Canceladas />;
      case '/criciuma':
        return <CriciumaInvoices />;
      case '/notas-para-verificar':
        return <NotasParaVerificar />;
      case '/cte':
        return <CTe />;
      case '/nfse':
        return <NFSe />;
      case '/conferencia':
        return <Conferencia />;
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