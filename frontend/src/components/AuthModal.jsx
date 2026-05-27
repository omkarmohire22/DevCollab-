import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthModal({ onClose }) {
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("signin"); // "signin" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSignIn = async () => {
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    if (!password.trim()) { setError("Password is required"); return; }

    setLoading(true);
    const { error: authError } = await login(email.trim(), password.trim());
    setLoading(false);

    if (authError) {
      setError(authError.message || "Sign in failed. Please verify your credentials.");
      return;
    }

    // Resolve workspace and project IDs after login
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_id", authUser.id)
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
              if (proj) localStorage.setItem("projectId", proj.id);
            }
          }
        }
      }
    } catch (resolveErr) {
      console.warn("Could not resolve workspace/project IDs:", resolveErr);
    }

    onClose();
    const destination = localStorage.getItem("workspaceId") ? "/dashboard" : "/create-workspace";
    navigate(destination);
  };

  const handleSignUp = async () => {
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    if (!password.trim()) { setError("Password is required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (!fullName.trim()) { setError("Full name is required"); return; }

    setLoading(true);
    try {
      const { data, error: signUpError } = await register(email.trim(), password.trim(), fullName.trim());
      
      if (signUpError) {
        console.error("Sign up error:", signUpError);
        setError(signUpError.message || "Sign up failed. Please try again.");
        setLoading(false);
        return;
      }

      // Check if we got a session back (email verification disabled)
      if (data?.session) {
        console.log("Sign up successful — session established, redirecting!");
        setLoading(false);
        onClose();
        navigate("/dashboard");
        return;
      }

      // No session = email verification is required
      console.log("Sign up successful — email verification required.");
      setLoading(false);
      setVerificationSent(true);
    } catch (err) {
      console.error("Sign up exception:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    const { error: authError } = await loginWithGoogle();
    setLoading(false);

    if (authError) {
      setError(authError.message || "Google sign-in failed.");
      return;
    }

    onClose();
  };

  const handleDemoSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      // 1. Try to login
      const { user: loggedInUser, error: authError } = await login("demo@devcollab.io", "DemoPassword123");
      
      if (authError) {
        // 2. If login fails, try to register the demo account
        console.log("Demo account doesn't exist. Creating one...");
        const { error: signUpError } = await register("demo@devcollab.io", "DemoPassword123", "Demo Guest");
        
        if (signUpError) {
          setError(signUpError.message || "Failed to initialize Demo Guest mode.");
          setLoading(false);
          return;
        }
        
        // 3. Login again after signup
        const { error: retryError } = await login("demo@devcollab.io", "DemoPassword123");
        if (retryError) {
          setError(retryError.message || "Failed to log in as Demo Guest.");
          setLoading(false);
          return;
        }
      }
      
      setLoading(false);
      onClose();
      navigate("/dashboard");
    } catch (err) {
      console.error("Demo login error:", err);
      setError(err.message || "An error occurred starting Demo mode.");
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      style={{ background: "rgba(15,23,42,0.55)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 backdrop-blur-sm" />

      <motion.div
        className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-3xl bg-white shadow-2xl"
        style={{ boxShadow: "0 32px 80px rgba(79,70,229,0.25), 0 8px 32px rgba(0,0,0,0.15)" }}
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 24 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative overflow-hidden px-8 py-8 text-center"
          style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)" }}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -left-4 bottom-0 h-20 w-20 rounded-full bg-white/10" />

          <motion.div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-lg backdrop-blur-sm"
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {mode === "signin" ? "🔐" : "✨"}
          </motion.div>

          <h2 className="text-2xl font-extrabold text-white">
            {verificationSent ? "Check Your Email" : mode === "signin" ? "Welcome back" : "Join DevCollab"}
          </h2>
          <p className="mt-1 text-sm text-indigo-200">
            {verificationSent ? "We sent a verification link to your email" : mode === "signin" ? "Sign in to your DevCollab workspace" : "Create your free account"}
          </p>

          <motion.button
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </motion.button>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-4">

          {/* Verification message */}
          {verificationSent && (
            <motion.div
              className="flex items-start gap-2.5 rounded-xl border border-green-100 bg-green-50 px-4 py-3"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="mt-0.5 text-base">✅</span>
              <div className="text-xs text-green-700">
                <p className="font-bold">Verification email sent!</p>
                <p className="mt-1">Click the link in your email to verify your account and complete sign up.</p>
              </div>
            </motion.div>
          )}

          {/* Email field */}
          {!verificationSent && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <input
                  autoFocus
                  type="email"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (mode === "signin" ? handleSignIn() : handleSignUp())}
                />
              </div>
            </motion.div>
          )}

          {/* Full Name field (Sign Up only) */}
          {mode === "signup" && !verificationSent && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22 }}
            >
              <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wide">
                Full Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSignUp()}
                />
              </div>
            </motion.div>
          )}

          {/* Password field */}
          {!verificationSent && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: mode === "signup" ? 0.24 : 0.25 }}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Password</label>
                {mode === "signin" && (
                  <button className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 hover:underline transition-colors">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  type={showPass ? "text" : "password"}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-11 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (mode === "signin" ? handleSignIn() : handleSignUp())}
                />
                <motion.button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowPass(s => !s)}
                >
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </motion.button>
              </div>
              {mode === "signup" && (
                <p className="mt-1.5 text-[11px] text-gray-500">At least 6 characters</p>
              )}
            </motion.div>
          )}

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-red-500">⚠️</span>
                <p className="text-xs font-semibold text-red-600">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit button */}
          {!verificationSent && (
            <motion.button
              className="relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all"
              style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
              whileHover={{ scale: 1.02, boxShadow: "0 12px 32px rgba(79,70,229,0.45)" }}
              whileTap={{ scale: 0.98 }}
              onClick={mode === "signin" ? handleSignIn : handleSignUp}
              disabled={loading}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <motion.div
                      className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    {mode === "signin" ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  <>
                    {mode === "signin" ? "Sign In" : "Create Account"}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </span>
            </motion.button>
          )}

          {/* Demo Guest button */}
          {!verificationSent && (
            <motion.button
              type="button"
              className="relative w-full overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50/50 py-3 text-sm font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-50 hover:border-indigo-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDemoSignIn}
              disabled={loading}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
            >
              <span className="relative flex items-center justify-center gap-2">
                Try Demo Guest Mode 🚀
              </span>
            </motion.button>
          )}

          {/* Divider */}
          {!verificationSent && (
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[11px] font-medium text-gray-400">or continue with</span>
              <div className="h-px flex-1 bg-gray-200" />
            </motion.div>
          )}

          {/* Social buttons */}
          {!verificationSent && (
            <motion.div
              className="grid grid-cols-2 gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.button
                className="flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-md"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleGoogleSignIn}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </motion.button>

              <motion.button
                className="flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-md"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSignIn}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        {!verificationSent && (
          <div className="border-t border-gray-100 bg-gray-50 px-8 py-4 text-center">
            <p className="text-xs text-gray-500">
              {mode === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <motion.button
                    className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => { setMode("signup"); setError(""); }}
                  >
                    Create one →
                  </motion.button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <motion.button
                    className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => { setMode("signin"); setError(""); }}
                  >
                    Sign in →
                  </motion.button>
                </>
              )}
            </p>
            <p className="mt-2 text-[10px] text-gray-400">
              By continuing you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}