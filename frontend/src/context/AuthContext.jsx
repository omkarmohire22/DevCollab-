import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../services/supabaseClient";
import { signIn, signInWithGoogle, signOut as signOutService, signUp } from "../services/authService";
import { userApi } from "../services/api";

const AuthContext = createContext(null);

const normalizeProfile = (profile) => {
  if (!profile) return null;

  const email = profile.email || profile.auth_email || "";
  const fullName = profile.full_name || profile.name || email.split("@")[0] || "DevCollab User";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Initialize workspaceId in localStorage if it is not already set
  if (profile.workspaces && profile.workspaces.length > 0) {
    if (!localStorage.getItem("workspaceId")) {
      localStorage.setItem("workspaceId", profile.workspaces[0].id);
    }
  }

  // Initialize projectId in localStorage if it is not already set
  if (profile.projects && profile.projects.length > 0) {
    if (!localStorage.getItem("projectId")) {
      localStorage.setItem("projectId", profile.projects[0].id);
    }
  }

  return {
    ...profile,
    name: fullName,
    email,
    initials,
    avatar: "from-indigo-500 to-violet-600",
    workspace: profile.workspaces?.[0]?.name || profile.workspace || "DevCollab Team",
    plan: profile.plan || "Pro",
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (accessToken) => {
    if (!accessToken) return null;
    try {
      const response = await userApi.current(accessToken);
      return normalizeProfile(response.profile);
    } catch (error) {
      console.warn("Unable to fetch user profile from backend, using auth metadata as fallback.", error?.message);
      // If profile doesn't exist yet (e.g. database tables not created, or trigger hasn't fired)
      // Create a basic profile from auth user metadata
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser(accessToken);
        if (authUser) {
          return normalizeProfile({
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0],
            auth_id: authUser.id,
          });
        }
      } catch (fallbackError) {
        console.error("Fallback profile creation failed", fallbackError);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Failed to load auth session", error);
        }

        const accessToken = data?.session?.access_token;
        if (accessToken && isMounted) {
          setToken(accessToken);
          const profile = await fetchProfile(accessToken);
          setUser(profile);
        } else if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      }
      if (isMounted) setLoading(false);
    };

    initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      const accessToken = session?.access_token;
      if (!accessToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      setToken(accessToken);

      // For SIGNED_IN and TOKEN_REFRESHED events, fetch the profile
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        const profile = await fetchProfile(accessToken);
        if (isMounted) {
          setUser(profile);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, [fetchProfile]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await signIn(email, password);
      const accessToken = data?.session?.access_token;

      if (error || !accessToken) {
        setLoading(false);
        return { user: null, error: error || new Error("No session returned") };
      }

      setToken(accessToken);
      const profile = await fetchProfile(accessToken);
      setUser(profile);
      setLoading(false);

      // Redirect to pending invite if one exists
      const pendingInvite = localStorage.getItem("pendingInviteToken");
      if (pendingInvite) {
        localStorage.removeItem("pendingInviteToken");
        window.location.href = `/invite/${pendingInvite}`;
      }

      return { user: profile, error: null };
    } catch (err) {
      setLoading(false);
      return { user: null, error: err };
    }
  }, [fetchProfile]);

  const register = useCallback(async (email, password, fullName) => {
    setLoading(true);
    try {
      const { data, error } = await signUp(email, password, fullName);

      if (error) {
        setLoading(false);
        return { data, error };
      }

      // If signup returned a session (email verification disabled), auto-login
      const accessToken = data?.session?.access_token;
      if (accessToken) {
        setToken(accessToken);
        const profile = await fetchProfile(accessToken);
        setUser(profile);
        setLoading(false);
        return { data, error: null };
      }

      // No session = email verification required, user needs to confirm
      setLoading(false);
      return { data, error: null };
    } catch (err) {
      setLoading(false);
      return { data: null, error: err };
    }
  }, [fetchProfile]);

  const loginWithGoogle = useCallback(async () => {
    // Google OAuth redirects away from the page, so no session is returned here
    // The session will be picked up by onAuthStateChange when the user returns
    try {
      const { data, error } = await signInWithGoogle();
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  }, []);

  const logout = useCallback(async () => {
    await signOutService();
    localStorage.removeItem("workspaceId");
    localStorage.removeItem("projectId");
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, loginWithGoogle, logout, isLoggedIn: !!user }),
    [user, token, loading, login, register, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
