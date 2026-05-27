import { supabase } from "./supabaseClient";

const getRedirectUrl = () => {
  return import.meta.env.VITE_CLIENT_URL || window.location.origin;
};

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email, password, fullName) {
  try {
    // Sign up WITHOUT email verification for development
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // Don't require email verification in development
      },
    });

    if (error && error.message && error.message.includes("Failed to fetch")) {
      console.warn("Signup failed, trying again...");
      const { data: data2, error: error2 } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      return { data: data2, error: error2 };
    }

    return { data, error };
  } catch (err) {
    console.error("Sign up error:", err);
    return { data: null, error: err };
  }
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getRedirectUrl()}/auth/callback`,
    },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getRedirectUrl()}/auth/reset-password`,
  });
}

export async function getSession() {
  return supabase.auth.getSession();
}

export async function getUser() {
  return supabase.auth.getUser();
}

export async function verifyOtp(email, token, type = "email") {
  return supabase.auth.verifyOtp({ email, token, type });
}
