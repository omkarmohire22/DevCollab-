import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { workspaceApi, invitationApi } from "../services/api";

const ROLE_COLORS = {
  Owner:  { badge: "bg-red-100 text-red-700",    dot: "bg-red-500"    },
  Admin:  { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500"  },
  Member: { badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  Viewer: { badge: "bg-gray-100 text-gray-600",   dot: "bg-gray-400"   },
};

const ROLE_PERMS = {
  Owner:  ["Manage billing", "Delete workspace", "Manage members", "Create projects", "Edit all content", "View all content"],
  Admin:  ["Manage members", "Create projects", "Edit all content", "View all content"],
  Member: ["Create tasks & docs", "Edit own content", "Comment & mention", "View all content"],
  Viewer: ["View all content"],
};

const TABS = ["Members", "Invites", "Roles & Permissions", "General"];

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-pink-400 to-rose-500",
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-violet-400 to-purple-500",
  "from-cyan-400 to-blue-500",
  "from-rose-400 to-pink-500",
  "from-teal-400 to-emerald-500",
  "from-orange-400 to-red-500",
];

function getAvatarGradient(name, index) {
  if (!name) return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function RoleDropdown({ current, memberId, onChange }) {
  const [open, setOpen] = useState(false);
  const roles = ["Admin", "Member", "Viewer"];

  return (
    <div className="relative">
      <motion.button
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${ROLE_COLORS[current]?.badge || "bg-gray-100 text-gray-600"}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        disabled={current === "Owner"}
      >
        {current}
        {current !== "Owner" && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 3.5L5 6.5L8 3.5" strokeLinecap="round" />
          </svg>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-gray-100 bg-white shadow-xl"
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            {roles.map((r) => (
              <motion.button
                key={r}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold transition-colors first:rounded-t-xl last:rounded-b-xl ${
                  r === current ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                }`}
                whileHover={{ x: 2 }}
                onClick={() => { onChange(memberId, r); setOpen(false); }}
              >
                <span className={`h-2 w-2 rounded-full ${ROLE_COLORS[r].dot}`} />
                {r}
                {r === current && <span className="ml-auto text-indigo-500">✓</span>}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WorkspaceSettingsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const workspaceId = localStorage.getItem("workspaceId");

  const [tab, setTab] = useState("Members");
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [pendingInvites, setPendingInvites] = useState([]);
  const [inviteSent, setInviteSent] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  // Workspace details state for General tab
  const [workspace, setWorkspace] = useState(null);
  const [wsName, setWsName] = useState("");
  const [wsSlug, setWsSlug] = useState("");
  const [wsDescription, setWsDescription] = useState("");

  const [editingHeader, setEditingHeader] = useState(false);
  const [editName, setEditName] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [resendSuccess, setResendSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);

  // Fetch all data on mount
  const fetchData = useCallback(async () => {
    if (!workspaceId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const [membersRes, invitesRes, detailsRes] = await Promise.all([
        workspaceApi.members(workspaceId, token),
        workspaceApi.invites(workspaceId, token),
        workspaceApi.details(workspaceId, token),
      ]);

      const fetchedMembers = (membersRes?.members || membersRes || []).map((m, i) => ({
        ...m,
        avatar: getAvatarGradient(m.name, i),
        joined: formatDate(m.joined || m.joined_at || m.created_at),
        role: m.role ? m.role.charAt(0).toUpperCase() + m.role.slice(1) : "Member",
      }));
      setMembers(fetchedMembers);

      const fetchedInvites = (invitesRes?.invites || invitesRes || []).map((inv) => ({
        ...inv,
        role: inv.role ? inv.role.charAt(0).toUpperCase() + inv.role.slice(1) : "Member",
        sent: timeAgo(inv.created_at),
      }));
      setPendingInvites(fetchedInvites);

      const ws = detailsRes?.workspace || detailsRes || {};
      setWorkspace(ws);
      setWsName(ws.name || "");
      setWsSlug(ws.slug || "");
      setWsDescription(ws.description || "");
    } catch (err) {
      console.error("Failed to fetch workspace settings:", err);
      setError(err?.response?.data?.message || err.message || "Failed to load workspace settings");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, token]);

  useEffect(() => {
    if (!workspaceId) {
      navigate("/create-workspace");
      return;
    }
    fetchData();
  }, [fetchData, workspaceId, navigate]);

  const changeRole = async (id, newRole) => {
    const prev = members.map((m) => ({ ...m }));
    setMembers((m) => m.map((mem) => mem.id === id ? { ...mem, role: newRole } : mem));
    try {
      await workspaceApi.updateMember(workspaceId, id, { role: newRole.toLowerCase() }, token);
    } catch (err) {
      console.error("Failed to update role:", err);
      setMembers(prev);
      setError(err?.response?.data?.message || "Failed to update member role");
    }
  };

  const removeMember = async (id) => {
    setRemovingId(id);
    try {
      await workspaceApi.removeMember(workspaceId, id, token);
      setTimeout(() => {
        setMembers((m) => m.filter((mem) => mem.id !== id));
        setRemovingId(null);
      }, 400);
    } catch (err) {
      console.error("Failed to remove member:", err);
      setRemovingId(null);
      setError(err?.response?.data?.message || "Failed to remove member");
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) return;
    setInviteSending(true);
    try {
      const res = await invitationApi.create(
        { workspace_id: workspaceId, email: inviteEmail.trim(), role: inviteRole.toLowerCase() },
        token
      );
      const newInvite = res?.invitation || res?.invite || {};
      setPendingInvites((p) => [
        {
          id: newInvite.id || Date.now(),
          email: inviteEmail.trim(),
          role: inviteRole,
          token: newInvite.token,
          sent: "just now",
          created_at: new Date().toISOString(),
        },
        ...p,
      ]);
      setInviteEmail("");
      setInviteSent(true);
      setTimeout(() => setInviteSent(false), 2500);
    } catch (err) {
      console.error("Failed to send invite:", err);
      setError(err?.response?.data?.message || "Failed to send invite");
    } finally {
      setInviteSending(false);
    }
  };

  const resendInvite = async (id) => {
    setResendingId(id);
    setResendSuccess(null);
    try {
      await invitationApi.resend(id, token);
      setResendSuccess(id);
      setTimeout(() => setResendSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to resend invite:", err);
      setError(err?.response?.data?.message || "Failed to resend invite");
    } finally {
      setResendingId(null);
    }
  };

  const revokeInvite = async (id) => {
    const prev = [...pendingInvites];
    setPendingInvites((p) => p.filter((i) => i.id !== id));
    try {
      await invitationApi.delete(id, token);
    } catch (err) {
      console.error("Failed to revoke invite:", err);
      setPendingInvites(prev);
      setError(err?.response?.data?.message || "Failed to revoke invite");
    }
  };

  const saveWorkspaceDetails = async () => {
    setSaving(true);
    try {
      const res = await workspaceApi.update(workspaceId, { name: wsName, description: wsDescription, slug: wsSlug }, token);
      const updated = res?.workspace || res || {};
      setWorkspace((prev) => ({ ...prev, ...updated, name: wsName, slug: wsSlug, description: wsDescription }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save workspace:", err);
      setError(err?.response?.data?.message || "Failed to save workspace details");
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkspace = async () => {
    if (!window.confirm("Are you sure you want to delete this workspace? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      await workspaceApi.delete(workspaceId, token);
      localStorage.removeItem("workspaceId");
      navigate("/create-workspace");
    } catch (err) {
      console.error("Failed to delete workspace:", err);
      setError(err?.response?.data?.message || "Failed to delete workspace");
      setDeleting(false);
    }
  };

  const workspaceName = workspace?.name || "Workspace";
  const workspacePlan = workspace?.plan || "Free";
  const workspaceSlugDisplay = workspace?.slug || "";

  return (
    <AppShell
      title="Workspace Settings"
      subtitle={`${workspaceName} · devcollab.io/${workspaceSlugDisplay}`}
    >
      <div className="mx-auto max-w-4xl space-y-5">

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <p className="text-sm font-medium text-red-600">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg font-bold">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workspace header card */}
        <motion.div
          className="flex items-center gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl shadow-lg shadow-indigo-200"
            animate={{ rotate: [0, 4, -4, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            💻
          </motion.div>
          <div className="flex-1">
            {editingHeader ? (
              <input
                className="w-full max-w-xs rounded-xl border border-indigo-300 px-3 py-1.5 text-lg font-extrabold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setWsName(editName);
                    setWorkspace((prev) => ({ ...prev, name: editName }));
                    workspaceApi.update(workspaceId, { name: editName, description: wsDescription, slug: wsSlug }, token)
                      .catch((err) => setError(err?.response?.data?.message || "Failed to update name"));
                    setEditingHeader(false);
                  }
                  if (e.key === "Escape") setEditingHeader(false);
                }}
                autoFocus
              />
            ) : (
              <h2 className="text-xl font-extrabold text-gray-900">{loading ? "Loading..." : workspaceName}</h2>
            )}
            <p className="text-sm text-gray-400">
              {loading ? "Loading workspace details..." : `devcollab.io/${workspaceSlugDisplay} · ${workspacePlan} Plan · ${members.length} members`}
            </p>
            {editingHeader && <p className="mt-1 text-xs text-indigo-500">Press Enter to save · Esc to cancel</p>}
          </div>
          <div className="flex gap-2">
            {editingHeader ? (
              <>
                <motion.button
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setWsName(editName);
                    setWorkspace((prev) => ({ ...prev, name: editName }));
                    workspaceApi.update(workspaceId, { name: editName, description: wsDescription, slug: wsSlug }, token)
                      .catch((err) => setError(err?.response?.data?.message || "Failed to update name"));
                    setEditingHeader(false);
                  }}
                >
                  Save
                </motion.button>
                <motion.button
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setEditingHeader(false)}
                >
                  Cancel
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setEditName(workspaceName); setEditingHeader(true); }}
                >
                  Edit
                </motion.button>
                <motion.button
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate("/payments")}
                >
                  Upgrade Plan
                </motion.button>
              </>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
          {TABS.map((t) => (
            <motion.button
              key={t}
              className={`relative flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                tab === t ? "text-white" : "text-gray-500 hover:text-gray-700"
              }`}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(t)}
            >
              {tab === t && (
                <motion.div
                  layoutId="settings-tab"
                  className="absolute inset-0 rounded-xl bg-indigo-600 shadow-md shadow-indigo-200"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t}</span>
            </motion.button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="mt-4 text-sm text-gray-400">Loading workspace settings...</p>
          </div>
        )}

        {/* Tab content */}
        {!loading && (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >

              {/* ── MEMBERS TAB ── */}
              {tab === "Members" && (
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div>
                      <h3 className="font-bold text-gray-900">Team Members</h3>
                      <p className="text-xs text-gray-400">{members.length} members · {members.filter(m => m.online).length} online now</p>
                    </div>
                    <motion.button
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setTab("Invites")}
                    >
                      + Invite Member
                    </motion.button>
                  </div>

                  <div className="divide-y divide-gray-50">
                    <AnimatePresence>
                      {members.map((member, i) => (
                        <motion.div
                          key={member.id}
                          className="flex items-center gap-4 px-6 py-4"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: removingId === member.id ? 0 : 1, x: 0, scale: removingId === member.id ? 0.95 : 1 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          {/* Avatar */}
                          <div className="relative">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${member.avatar || getAvatarGradient(member.name, i)} text-sm font-bold text-white shadow-md`}>
                              {member.name ? member.name[0].toUpperCase() : "?"}
                            </div>
                            {member.online && (
                              <motion.div
                                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500"
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{member.name || member.email?.split("@")[0] || "Unknown"}</p>
                              {member.role === "Owner" && <span className="text-xs">👑</span>}
                            </div>
                            <p className="text-xs text-gray-400">{member.email} · Joined {member.joined || "recently"}</p>
                          </div>

                          {/* Role */}
                          <RoleDropdown current={member.role} memberId={member.id} onChange={changeRole} />

                          {/* Remove */}
                          {member.role !== "Owner" && (
                            <motion.button
                              className="ml-2 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removeMember(member.id)}
                              title="Remove member"
                            >
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                <path d="M2 2l10 10M12 2L2 12" />
                              </svg>
                            </motion.button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {members.length === 0 && (
                      <div className="flex flex-col items-center py-10 text-center">
                        <span className="text-3xl mb-2">👥</span>
                        <p className="text-sm text-gray-500">No members found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── INVITES TAB ── */}
              {tab === "Invites" && (
                <div className="space-y-4">
                  {/* Send invite card */}
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 font-bold text-gray-900">Invite New Member</h3>

                    <div className="flex gap-3">
                      <input
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        placeholder="Enter email address..."
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                      />

                      {/* Role selector */}
                      <select
                        className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-indigo-400 bg-white"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                      >
                        {["Admin", "Member", "Viewer"].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>

                      <motion.button
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={sendInvite}
                        disabled={inviteSending}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                        </svg>
                        {inviteSending ? "Sending..." : "Send Invite"}
                      </motion.button>
                    </div>

                    <AnimatePresence>
                      {inviteSent && (
                        <motion.div
                          className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 border border-green-100 px-4 py-2.5"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                        >
                          <span className="text-green-500">✓</span>
                          <p className="text-sm font-medium text-green-700">Invite sent! They'll receive an email link to join.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <p className="mt-3 text-xs text-gray-400">
                      💡 Invite links expire after 7 days. Members can also join via the workspace URL.
                    </p>
                  </div>

                  {/* Pending invites */}
                  <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-gray-100 px-6 py-4">
                      <h3 className="font-bold text-gray-900">Pending Invites</h3>
                      <p className="text-xs text-gray-400">{pendingInvites.length} invites waiting</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      <AnimatePresence>
                        {pendingInvites.map((inv, i) => (
                          <motion.div
                            key={inv.id || inv.email}
                            className="flex items-center gap-4 px-6 py-4"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-500">
                              {inv.email[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">{inv.email}</p>
                              <p className="text-xs text-gray-400">Sent {inv.sent || timeAgo(inv.created_at)}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${ROLE_COLORS[inv.role]?.badge || "bg-gray-100 text-gray-600"}`}>
                              {inv.role}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <motion.button
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  const acceptUrl = `${window.location.origin}/invite/${inv.token}`;
                                  navigator.clipboard.writeText(acceptUrl);
                                  alert(`Copied invitation link for ${inv.email} to clipboard!`);
                                }}
                              >
                                📋 Copy Link
                              </motion.button>
                              <motion.button
                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => resendInvite(inv.id)}
                                disabled={resendingId === inv.id}
                              >
                                {resendingId === inv.id ? "Sending..." : resendSuccess === inv.id ? "✓ Sent!" : "Resend"}
                              </motion.button>
                              <motion.button
                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-50 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => revokeInvite(inv.id)}
                              >
                                Revoke
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {pendingInvites.length === 0 && (
                        <div className="flex flex-col items-center py-10 text-center">
                          <span className="text-3xl mb-2">📭</span>
                          <p className="text-sm text-gray-500">No pending invites</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ROLES & PERMISSIONS TAB ── */}
              {tab === "Roles & Permissions" && (
                <div className="space-y-3">
                  {Object.entries(ROLE_PERMS).map(([role, perms], i) => (
                    <motion.div
                      key={role}
                      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`h-3 w-3 rounded-full ${ROLE_COLORS[role].dot}`} />
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_COLORS[role].badge}`}>{role}</span>
                        <span className="text-xs text-gray-400">
                          {members.filter((m) => m.role === role).length} member{members.filter((m) => m.role === role).length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((perm) => (
                          <motion.span
                            key={perm}
                            className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700"
                            whileHover={{ scale: 1.05, backgroundColor: "#eef2ff", color: "#4f46e5" }}
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5L3.5 7L8.5 2.5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            {perm}
                          </motion.span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* ── GENERAL TAB ── */}
              {tab === "General" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-gray-900">Workspace Details</h3>
                    {/* Workspace Name */}
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">Workspace Name</label>
                      <input
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        value={wsName}
                        onChange={(e) => setWsName(e.target.value)}
                      />
                    </div>
                    {/* Workspace URL */}
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">Workspace URL</label>
                      <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                        <span className="bg-gray-50 px-3 py-3 text-sm text-gray-400 border-r border-gray-200">devcollab.io/</span>
                        <input
                          className="flex-1 px-3 py-3 text-sm outline-none"
                          value={wsSlug}
                          onChange={(e) => setWsSlug(e.target.value)}
                        />
                      </div>
                    </div>
                    {/* Description */}
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">Description</label>
                      <textarea
                        className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        rows={3}
                        value={wsDescription}
                        onChange={(e) => setWsDescription(e.target.value)}
                      />
                    </div>
                    <AnimatePresence>
                      {saveSuccess && (
                        <motion.div
                          className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-100 px-4 py-2.5"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                        >
                          <span className="text-green-500">✓</span>
                          <p className="text-sm font-medium text-green-700">Workspace details saved successfully!</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.button
                      className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 disabled:opacity-50"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={saveWorkspaceDetails}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </motion.button>
                  </div>

                  {/* Danger zone */}
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
                    <h3 className="mb-1 font-bold text-red-700">Danger Zone</h3>
                    <p className="mb-4 text-xs text-red-400">These actions are irreversible. Please be certain.</p>
                    <div className="flex gap-3">
                      <motion.button
                        className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setShowTransferModal(true)}
                      >
                        Transfer Ownership
                      </motion.button>
                      <motion.button
                        className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-red-200 disabled:opacity-50"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={deleteWorkspace}
                        disabled={deleting}
                      >
                        {deleting ? "Deleting..." : "Delete Workspace"}
                      </motion.button>
                    </div>
                  </div>

                  {/* Transfer Ownership Modal */}
                  <AnimatePresence>
                    {showTransferModal && (
                      <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowTransferModal(false)}
                      >
                        <motion.div
                          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                          initial={{ scale: 0.9, opacity: 0, y: 24 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 0.9, opacity: 0, y: 24 }}
                          transition={{ type: "spring", stiffness: 300, damping: 26 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <h3 className="text-lg font-bold text-gray-900 mb-1">Transfer Ownership</h3>
                          <p className="text-sm text-gray-500 mb-4">Enter the email of the member you want to transfer ownership to. They must already be a member of this workspace.</p>
                          <input
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 mb-4"
                            placeholder="member@email.com"
                            value={transferEmail}
                            onChange={(e) => setTransferEmail(e.target.value)}
                          />
                          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 mb-4">
                            <p className="text-xs text-amber-700 font-medium">⚠️ You will lose owner access after transfer. This cannot be undone.</p>
                          </div>
                          <div className="flex gap-3">
                            <motion.button
                              className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              disabled={!transferEmail.includes("@") || transferring}
                              onClick={async () => {
                                setTransferring(true);
                                try {
                                  const member = members.find((m) => m.email === transferEmail.trim());
                                  if (!member) {
                                    setError("That email is not a member of this workspace.");
                                    setShowTransferModal(false);
                                    setTransferring(false);
                                    return;
                                  }
                                  await workspaceApi.update(workspaceId, { owner_id: member.id }, token);
                                  setShowTransferModal(false);
                                  navigate("/create-workspace");
                                } catch (err) {
                                  setError(err?.response?.data?.message || "Transfer failed");
                                  setShowTransferModal(false);
                                } finally {
                                  setTransferring(false);
                                }
                              }}
                            >
                              {transferring ? "Transferring..." : "Confirm Transfer"}
                            </motion.button>
                            <motion.button
                              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => { setShowTransferModal(false); setTransferEmail(""); }}
                            >
                              Cancel
                            </motion.button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </AppShell>
  );
}
