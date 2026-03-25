import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { rpcCall, setAuthToken } from "../api/rpc";

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

interface SignupResult {
  user: User;
  message: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<string>;
  verifyEmail: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleAuthResult = useCallback((result: AuthResult) => {
    setUser(result.user);
    setAuthToken(result.tokens.accessToken);
    localStorage.setItem("refreshToken", result.tokens.refreshToken);
  }, []);

  useEffect(() => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      rpcCall<AuthResult>("auth.refresh", { refreshToken })
        .then(handleAuthResult)
        .catch(() => localStorage.removeItem("refreshToken"))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [handleAuthResult]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await rpcCall<AuthResult>("auth.login", { email, password });
      handleAuthResult(result);
    },
    [handleAuthResult]
  );

  const signup = useCallback(
    async (email: string, password: string, name: string): Promise<string> => {
      const result = await rpcCall<SignupResult>("auth.signup", { email, password, name });
      return result.message;
    },
    []
  );

  const verifyEmail = useCallback(
    async (token: string) => {
      const result = await rpcCall<AuthResult>("auth.verifyEmail", { token });
      handleAuthResult(result);
    },
    [handleAuthResult]
  );

  const logout = useCallback(() => {
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem("refreshToken");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, verifyEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
