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
        setUser(null);
      })
      .finally(() => {
        setIsLoadingAuth(false);
      });
  }, []);

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  const canAccessPage = (pageKey) => {
    if (!user) return true;
    if (user.role === 'admin') return true;
    if (!userProfile) return true;
    return (userProfile.pages || []).includes(pageKey);
  };

  const hasPermission = (permissionKey) => {
    if (!user) return true;
    if (user.role === 'admin') return true;
    if (!userProfile) return true;
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
      navigateToLogin,
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