import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import {
  login as loginService,
  signup as signupService,
  logout as logoutService,
  getCurrentUser,
  type Profile,
} from "../services/authService";

interface AuthContextType {
  user: Profile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Load user session on first mount
  useEffect(() => {
    (async () => {
      const profile = await getCurrentUser();
      if (profile) setUser(profile);
      setLoading(false);
    })();
  }, []);

  // ✅ Use the actual profile document returned by authService.login
  const login = async (email: string, password: string) => {
    const profile = await loginService(email, password);
    setUser(profile);
  };

  // ✅ Same for signup: use backend response
  const signup = async (
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    const profile = await signupService(username, email, password, firstName, lastName);
    setUser(profile);
  };

  const logout = async () => {
    await logoutService();
    setUser(null);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Checking authentication...
      </div>
    );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
