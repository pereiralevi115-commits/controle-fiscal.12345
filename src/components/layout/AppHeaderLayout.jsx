import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, FileText, Layers, ShoppingCart, Truck, BarChart2, Upload, Users, Building2, LayoutDashboard, UserCog, Archive } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

const APP_NAME = 'Controle Fiscal';
const APP_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/697370b851ff4a130adcda27/17b9d331c_Designsemnome57.png';

const navItems = [
  { key: 'dashboard', name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { key: 'nf', name: 'NF', path: '/nf', icon: FileText },
  { key: 'notas', name: 'Notas Fiscais', path: '/notas', icon: FileText },
  { key: 'materia-prima', name: 'Matéria Prima', path: '/materia-prima', icon: Layers },
  { key: 'gestao-compras', name: 'Gestão de Compras', path: '/gestao-compras', icon: ShoppingCart },
  { key: 'gestao-frota', name: 'Gestão de Frota', path: '/gestao-frota', icon: Truck },
  { key: 'controladoria', name: 'Controladoria', path: '/controladoria', icon: BarChart2 },
  { key: 'arquivadas', name: 'Arquivadas', path: '/arquivadas', icon: Archive },
  { key: 'importar', name: 'Importar XML', path: '/importar', icon: Upload },
  { key: 'fornecedores', name: 'Fornecedores', path: '/fornecedores', icon: Users },
  { key: 'filiais', name: 'Filiais', path: '/filiais', icon: Building2 },
  { key: 'usuarios', name: 'Usuários', path: '/usuarios', icon: UserCog },
];

export default function AppHeaderLayout({ children, currentPath }) {
  const { canAccessPage, isLoadingAuth } = useAuth();

  const visibleNavItems = navItems.filter(item => canAccessPage(item.key));

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-full mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Nome */}
            <Link to="/" className="flex items-center gap-3">
              <div className="rounded-xl overflow-hidden">
                <img src={APP_LOGO} alt={APP_NAME} className="h-10 w-10 object-cover" />
              </div>
              <span className="font-bold text-xl text-slate-800 hidden sm:block">
                {APP_NAME}
              </span>
            </Link>

            {/* Nav + Sair */}
            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-1">
                {visibleNavItems.map(item => {
                  const isActive = currentPath === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#FDB913] text-slate-900'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {Icon && <Icon className="w-4 h-4 shrink-0" />}
                      <span className="hidden sm:block">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => { await base44.auth.logout('/'); }}
                className="flex items-center gap-2 text-slate-600 hover:text-red-600 hover:border-red-300"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── CONTEÚDO ─── */}
      <main>{children}</main>
    </div>
  );
}