import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { motion } from "framer-motion";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Completing sign-in...");

  useEffect(() => {
    let isMounted = true;
    let fallbackTimer = null;

    const handleCallback = async () => {
      try {
        // 1. Check for PKCE code in query params (Supabase server-side flow)
        const code = searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("Code exchange error:", error);
            if (isMounted) {
              setStatus("error");
              setMessage("Sign-in failed. Please try again.");
              fallbackTimer = setTimeout(() => navigate("/"), 3000);
            }
            return;
          }
        }

        // 2. Check for hash fragment tokens (implicit OAuth flow)
        //    Supabase JS with detectSessionInUrl:true handles this automatically
        //    but we need to give it a moment to parse the hash and fire the event.

        // 3. Check if we already have a session (hash was auto-parsed or code was exchanged)
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Session retrieval error:", error);
          if (isMounted) {
            setStatus("error");
            setMessage("Verification failed. Please try again.");
            fallbackTimer = setTimeout(() => navigate("/"), 3000);
          }
          return;
        }

        if (data?.session) {
          // Resolve workspace and project IDs
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("auth_id", user.id)
                .single();

              if (profile && !localStorage.getItem("workspaceId")) {
                const { data: ws } = await supabase
                  .from("workspaces")
                  .select("id")
                  .eq("owner_id", profile.id)
                  .limit(1)
                  .single();
                if (ws) {
                  localStorage.setItem("workspaceId", ws.id);

                  if (!localStorage.getItem("projectId")) {
                    const { data: proj } = await supabase
                      .from("projects")
                      .select("id")
                      .eq("workspace_id", ws.id)
                      .limit(1)
                      .single();
                    if (proj) {
                      localStorage.setItem("projectId", proj.id);
                    }
                  }
                }
              }
            }
          } catch (resolveErr) {
            console.warn("Could not resolve workspace/project IDs:", resolveErr);
          }

          if (isMounted) {
            setStatus("success");
            setMessage("Signed in successfully! Redirecting...");
            // Redirect to dashboard, or create-workspace if no workspace
            const destination = localStorage.getItem("workspaceId") ? "/dashboard" : "/create-workspace";
            fallbackTimer = setTimeout(() => navigate(destination), 1500);
          }
          return;
        }

        // 4. No session yet — wait for the auth state change listener
        //    (the hash might still be processing)
        //    Set a timeout so we don't hang forever.
        fallbackTimer = setTimeout(() => {
          if (isMounted && status === "processing") {
            setStatus("error");
            setMessage("No session found. Please sign in again.");
            setTimeout(() => navigate("/"), 2000);
          }
        }, 6000);
      } catch (err) {
        console.error("Auth callback error:", err);
        if (isMounted) {
          setStatus("error");
          setMessage("An error occurred. Please try again.");
          fallbackTimer = setTimeout(() => navigate("/"), 3000);
        }
      }
    };

    // Listen for auth state change (handles hash fragment parsing)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          isMounted &&
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
          session
        ) {
          setStatus("success");
          setMessage("Signed in successfully! Redirecting...");
          clearTimeout(fallbackTimer);
          fallbackTimer = setTimeout(() => navigate("/dashboard"), 1500);
        }
      }
    );

    handleCallback();

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      listener?.subscription?.unsubscribe?.();
    };
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <motion.div
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-center">
          {status === "processing" && (
            <>
              <motion.div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <svg
                  className="h-8 w-8 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900">
                Completing Sign-In
              </h1>
            </>
          )}

          {status === "success" && (
            <>
              <motion.div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome to DevCollab!
              </h1>
            </>
          )}

          {status === "error" && (
            <>
              <motion.div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900">
                Sign-In Failed
              </h1>
            </>
          )}

          <p className="mt-4 text-gray-600">{message}</p>
        </div>
      </motion.div>
    </div>
  );
}