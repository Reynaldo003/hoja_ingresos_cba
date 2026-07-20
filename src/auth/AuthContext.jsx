// src/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { getAccessToken, getStoredUser } from "../lib/apiClient";
import { login as loginRequest, logout as logoutRequest } from "../lib/apiAuth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();
    if (token && storedUser) setUser(storedUser);
    setReady(true);
  }, []);

  async function login(credentials) {
    const loggedUser = await loginRequest(credentials);
    setUser(loggedUser);
    return loggedUser;
  }

  function logout() {
    logoutRequest();
    setUser(null);
  }

  const value = {
    user,
    isAuthenticated: !!user && !!getAccessToken(),
    ready,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}