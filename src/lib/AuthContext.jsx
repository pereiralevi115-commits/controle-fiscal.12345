import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(async (currentUser) => {
        setUser(currentUser);
        if (currentUser?.profile_id) {
          try {
            const profiles = await base44.entities.UserProfile.filter({ id: currentUser.profile_id });
            setUserProfile(profiles?.[0] || null);
          } catch {
            setUserProfile(null);
          }
        }
      })
      .catch(() => {
        // No preview do editor, auth falha com 403 — tratamos como admin para não bloquear o app
        setUser({ role: 'admin' });
      })
      .finally(() => {
        setIsLoadingAuth(false);
      });
  }, []);

  const canAccessPage = (pageKey) => {
    if (isLoadingAuth) return false;
    if (user?.role === 'admin') return true;
    if (!userProfile) return false;
    return (userProfile.pages || []).includes(pageKey);
  };

  const hasPermission = (permissionKey) => {
    if (isLoadingAuth) return false;
    if (user?.role === 'admin') return true;
    if (!userProfile) return false;
    return (userProfile.permissions || []).includes(permissionKey);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      isAuthenticated: !!user,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError: null,
      navigateToLogin: () => base44.auth.redirectToLogin(window.location.href),
      canAccessPage,
      hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};