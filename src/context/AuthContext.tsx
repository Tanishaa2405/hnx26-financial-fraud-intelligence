import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  name?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isSupabaseLive: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  demoLogin: (role?: 'lead_investigator' | 'risk_analyst' | 'fraud_operator') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'hnx26_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // Check current session from Supabase
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || 'user@example.com',
            role: (session.user.user_metadata?.role as string) || 'Fraud Investigator',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          });
        }
        setLoading(false);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || 'user@example.com',
            role: (session.user.user_metadata?.role as string) || 'Fraud Investigator',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    } else {
      // Local Auth Storage Fallback
      const savedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
        }
      } else {
        // Auto-provision initial demo analyst session for quick evaluation
        const defaultAnalyst: UserProfile = {
          id: 'usr_lead_analyst_01',
          email: 'analyst@fraudintel.ai',
          name: 'Sarah Chen',
          role: 'Lead Fraud Investigator',
        };
        setUser(defaultAnalyst);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(defaultAnalyst));
      }
      setLoading(false);
    }
  }, []);

  const signUp = async (email: string, password: string, name?: string): Promise<{ error?: string }> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
            role: 'Risk Analyst',
          },
        },
      });
      if (error) return { error: error.message };
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || email,
          role: 'Risk Analyst',
          name: name || email.split('@')[0],
        });
      }
      return {};
    }

    // Local Auth simulation
    const newUser: UserProfile = {
      id: `usr_local_${Date.now()}`,
      email,
      name: name || email.split('@')[0],
      role: 'Risk Analyst',
    };
    setUser(newUser);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
    return {};
  };

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || email,
          role: (data.user.user_metadata?.role as string) || 'Fraud Investigator',
          name: data.user.user_metadata?.name || email.split('@')[0],
        });
      }
      return {};
    }

    // Local Auth simulation
    if (!email || !password) {
      return { error: 'Email and password are required.' };
    }
    const loggedUser: UserProfile = {
      id: `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email,
      name: email.split('@')[0],
      role: 'Fraud Investigator',
    };
    setUser(loggedUser);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(loggedUser));
    return {};
  };

  const signOut = async (): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  };

  const demoLogin = (role: 'lead_investigator' | 'risk_analyst' | 'fraud_operator' = 'lead_investigator') => {
    const roleLabels = {
      lead_investigator: 'Lead Fraud Investigator',
      risk_analyst: 'Senior Risk Analyst',
      fraud_operator: 'Financial Intelligence Operator',
    };
    const profile: UserProfile = {
      id: `demo_${role}_01`,
      email: `${role}@fraudintel.ai`,
      name: role === 'lead_investigator' ? 'Sarah Chen' : role === 'risk_analyst' ? 'Marcus Vance' : 'Elena Rostova',
      role: roleLabels[role],
    };
    setUser(profile);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSupabaseLive: isSupabaseConfigured,
        signUp,
        signIn,
        signOut,
        demoLogin,
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
