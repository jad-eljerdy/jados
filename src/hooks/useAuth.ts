"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getAuthToken, setAuthToken, removeAuthToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export function useAuth() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setToken(getAuthToken());
    setIsLoading(false);
  }, []);

  const user = useQuery(
    api.auth.validateSession,
    token ? { token } : "skip"
  );

  const loginMutation = useMutation(api.auth.login);
  const logoutMutation = useMutation(api.auth.logout);
  const registerMutation = useMutation(api.auth.register);
  const changePasswordMutation = useMutation(api.auth.changePassword);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation({ email, password });
      setAuthToken(result.token);
      setToken(result.token);
      router.push("/");
      return result;
    },
    [loginMutation, router]
  );

  const logout = useCallback(async () => {
    if (token) {
      await logoutMutation({ token });
    }
    removeAuthToken();
    setToken(null);
    router.push("/login");
  }, [token, logoutMutation, router]);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const result = await registerMutation({ email, password, name });
      setAuthToken(result.token);
      setToken(result.token);
      router.push("/");
      return result;
    },
    [registerMutation, router]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!token) throw new Error("Not authenticated");
      return await changePasswordMutation({
        token,
        currentPassword,
        newPassword,
      });
    },
    [token, changePasswordMutation]
  );

  return {
    user: user as User | null | undefined,
    token,
    isLoading: isLoading || (token && user === undefined),
    isAuthenticated: !!user,
    login,
    logout,
    register,
    changePassword,
  };
}
