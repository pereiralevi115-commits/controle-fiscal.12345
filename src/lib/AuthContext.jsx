import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings] = useState(null);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);

      // Carrega o perfil de acesso do usuário, se tiver
      if (currentUser?.profile_id) {
        try {
          const profiles = await base44.entities.UserProfile.filter({ id: currentUser.profile_id });
          setUserProfile(profiles?.[0] || null);
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      setUserProfile(null);
      setAuthError(null);
    }
    setIsLoadingAuth(false);
    setAuthChecked(true);
  };

  const logout = () => {
    setUser(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    base44.auth.logout(window.location.href);
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  // Verifica se o usuário tem acesso a uma página específica
  // Admins têm acesso total. Usuários com perfil respeitam as páginas do perfil.
  const canAccessPage = (pageKey) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!userProfile) return true; // sem perfil = acesso total (comportamento legado)
    return (userProfile.pages || []).includes(pageKey);
  };

  // Verifica se o usuário tem uma permissão específica
  const hasPermission = (permissionKey) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!userProfile) return true; // sem perfil = tudo liberado
    return (userProfile.permissions || []).includes(permissionKey);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState: checkUserAuth,
      canAccessPage,
      hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};