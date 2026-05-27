import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { invitationApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, token: authToken, loading: authLoading } = useAuth();

  const [invitation, setInvitation] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | accepting | accepted | error | already
  const [message, setMessage] = useState("");

  // Fetch invitation details
  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid invitation link.");
      return;
    }

    invitationApi
      .get(token)
      .then((res) => {
        const inv = res?.invitation;
        if (!inv) {
          setStatus("error");
          setMessage("Invitation not found.");
          return;
        }
        if (inv.status !== "pending") {
          setStatus("already");
          setMessage("This invitation has already been used or revoked.");
          return;
        }
        setInvitation(inv);
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
        setMessage("This invitation link is invalid or has expired.");
      });
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      // Save token to redirect back after login
      localStorage.setItem("pendingInviteToken", token);
      navigate("/");
      return;
    }

    setStatus("accepting");
    try {
      const res = await invitationApi.accept(token, authToken);
      if (res?.workspace_id) {
        localStorage.setItem("workspaceId", res.workspace_id);
      }
      setStatus("accepted");
      setTimeout(() => navigate("/dashboard"), 2500);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to accept invitation. Please try again.";
      setStatus("error");
      setMessage(msg);
    }
  };

  const workspaceName = invitation?.workspaces?.name || "the workspace";
  const role = invitation?.role
    ? invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)
    : "Member";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Card */}
        <div className="rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl">
              💻
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">DevCollab</h1>
            <p className="mt-1 text-sm text-indigo-200">Real-Time Project Collaboration</p>
          </div>

          {/* Body */}
          <div className="px-8 py-8 text-center">

            {/* Loading */}
            {(status === "loading" || authLoading) && (
              <>
                <motion.div
                  className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-indigo-100 border-t-indigo-600"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <p className="text-gray-500 text-sm">Loading your invitation...</p>
              </>
            )}

            {/* Ready to accept */}
            {status === "ready" && !authLoading && (
              <>
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
                  🎉
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">You're invited!</h2>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  You've been invited to join{" "}
                  <span className="font-semibold text-indigo-600">{workspaceName}</span>{" "}
                  as a{" "}
                  <span className="inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                    {role}
                  </span>
                </p>

                {!user && (
                  <div className="mb-5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
                    You need to sign in or create an account to accept this invitation.
                  </div>
                )}

                <motion.button
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-shadow"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAccept}
                >
                  {user ? "Accept Invitation" : "Sign In to Accept"}
                </motion.button>

                <p className="mt-4 text-xs text-gray-400">
                  By accepting, you agree to collaborate within this workspace.
                </p>
              </>
            )}

            {/* Accepting */}
            {status === "accepting" && (
              <>
                <motion.div
                  className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-indigo-100 border-t-indigo-600"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <p className="text-gray-600 font-medium">Joining workspace...</p>
              </>
            )}

            {/* Accepted */}
            {status === "accepted" && (
              <>
                <motion.div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-3xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                >
                  ✅
                </motion.div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome aboard!</h2>
                <p className="text-gray-500 text-sm">
                  You've joined <span className="font-semibold text-indigo-600">{workspaceName}</span>.
                  Redirecting to dashboard...
                </p>
                <motion.div
                  className="mt-4 h-1 rounded-full bg-indigo-100 overflow-hidden"
                >
                  <motion.div
                    className="h-full bg-indigo-600 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5, ease: "linear" }}
                  />
                </motion.div>
              </>
            )}

            {/* Already used */}
            {status === "already" && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">
                  ⚠️
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Already Used</h2>
                <p className="text-gray-500 text-sm mb-6">{message}</p>
                <motion.button
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/dashboard")}
                >
                  Go to Dashboard
                </motion.button>
              </>
            )}

            {/* Error */}
            {status === "error" && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
                  ❌
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
                <p className="text-gray-500 text-sm mb-6">{message}</p>
                <motion.button
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/")}
                >
                  Go to Home
                </motion.button>
              </>
            )}

          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} DevCollab · Built for developers
        </p>
      </motion.div>
    </div>
  );
}
