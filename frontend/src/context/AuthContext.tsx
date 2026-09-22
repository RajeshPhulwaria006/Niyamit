'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'CONSUMER' | 'OFFICER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organization?: string;
  badgeNumber?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: UserRole;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginAsDemo: (role: UserRole) => Promise<void>;
  logout: () => void;
  switchRoleLocally: (role: UserRole) => void;
}

const DEMO_ACCOUNTS: Record<UserRole, { email: string; pass: string; user: AuthUser }> = {
  CONSUMER: {
    email: 'consumer@smartconsumer.gov.in',
    pass: 'Consumer@123',
    user: {
      id: 'usr-consumer-01',
      email: 'consumer@smartconsumer.gov.in',
      fullName: 'Rahul Sharma (Citizen Buyer)',
      role: 'CONSUMER',
      organization: 'Smart Consumer Forum',
    },
  },
  OFFICER: {
    email: 'officer.delhi@lmpc.gov.in',
    pass: 'Officer@123',
    user: {
      id: 'usr-officer-01',
      email: 'officer.delhi@lmpc.gov.in',
      fullName: 'Inspector S. K. Verma',
      role: 'OFFICER',
      organization: 'Legal Metrology Department, Delhi NCT',
      badgeNumber: 'DL-LMPC-402',
    },
  },
  ADMIN: {
    email: 'admin@doca.gov.in',
    pass: 'Admin@123',
    user: {
      id: 'usr-admin-01',
      email: 'admin@doca.gov.in',
      fullName: 'Director (Legal Metrology)',
      role: 'ADMIN',
      organization: 'Department of Consumer Affairs, GoI',
      badgeNumber: 'GOI-DOCA-HQ',
    },
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(DEMO_ACCOUNTS.CONSUMER.user);
  const [token, setToken] = useState<string | null>('demo-consumer-token');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('lmpc_user');
      const savedToken = localStorage.getItem('lmpc_token');
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      }
    } catch {
      // Fallback
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const authedUser: AuthUser = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName ?? data.user.full_name,
          role: data.user.role,
          organization: data.user.organization,
          badgeNumber: data.user.badgeNumber ?? data.user.badge_number,
        };
        setUser(authedUser);
        setToken(data.access_token);
        localStorage.setItem('lmpc_user', JSON.stringify(authedUser));
        localStorage.setItem('lmpc_token', data.access_token);
        setIsLoading(false);
        return true;
      }
    } catch {
      // If backend is offline, check demo accounts
      for (const roleKey of Object.keys(DEMO_ACCOUNTS) as UserRole[]) {
        const demo = DEMO_ACCOUNTS[roleKey];
        if (demo.email.toLowerCase() === email.toLowerCase()) {
          setUser(demo.user);
          setToken(`local-${roleKey.toLowerCase()}-token`);
          localStorage.setItem('lmpc_user', JSON.stringify(demo.user));
          localStorage.setItem('lmpc_token', `local-${roleKey.toLowerCase()}-token`);
          setIsLoading(false);
          return true;
        }
      }
    }
    setIsLoading(false);
    return false;
  };

  const loginAsDemo = async (targetRole: UserRole) => {
    setIsLoading(true);
    const demo = DEMO_ACCOUNTS[targetRole];
    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demo.email, password: demo.pass }),
      });
      if (res.ok) {
        const data = await res.json();
        const authedUser: AuthUser = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName ?? data.user.full_name,
          role: data.user.role,
          organization: data.user.organization,
          badgeNumber: data.user.badgeNumber ?? data.user.badge_number,
        };
        setUser(authedUser);
        setToken(data.access_token);
        localStorage.setItem('lmpc_user', JSON.stringify(authedUser));
        localStorage.setItem('lmpc_token', data.access_token);
        setIsLoading(false);
        return;
      }
    } catch {
      // Local fallback
    }
    setUser(demo.user);
    setToken(`local-${targetRole.toLowerCase()}-token`);
    localStorage.setItem('lmpc_user', JSON.stringify(demo.user));
    localStorage.setItem('lmpc_token', `local-${targetRole.toLowerCase()}-token`);
    setIsLoading(false);
  };

  const switchRoleLocally = (newRole: UserRole) => {
    loginAsDemo(newRole);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('lmpc_user');
    localStorage.removeItem('lmpc_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role ?? 'CONSUMER',
        isLoading,
        login,
        loginAsDemo,
        logout,
        switchRoleLocally,
      }}
    >
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
