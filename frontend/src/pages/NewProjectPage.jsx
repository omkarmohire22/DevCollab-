import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { projectApi } from "../services/api";

const TEMPLATES = [
  {
    name: "Blank Project",
    desc: "Start from scratch",
    icon: "📄",
  },
  {
    name: "Web App",
    desc: "Frontend + backend sprints",
    icon: "🌐",
  },
  {
    name: "Mobile App",
    desc: "iOS & Android workflow",
    icon: "📱",
  },
  {
    name: "API Service",
    desc: "Backend microservice",
    icon: "⚙️",
  },
  {
    name: "Design Sprint",
    desc: "UI/UX focused workflow",
    icon: "🎨",
  },
  {
    name: "Hackathon",
    desc: "Fast-paced 48h project",
    icon: "⚡",
  },
  {
    name: "ML / AI",
    desc: "Data science pipeline",
    icon: "🤖",
  },
  {
    name: "Open Source",
    desc: "Community-driven project",
    icon: "🌍",
  },
];

const COLORS = [
  "from-indigo-500 to-violet-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-violet-500 to-purple-600",
];

export default function NewProjectPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [form, setForm] = useState({
    name: "",
    desc: "",
    template: "Blank Project",
    color: COLORS[0],
    visibility: "private",
  });

  const [memberEmail, setMemberEmail] = useState("");
  const [invitedMembers, setInvitedMembers] = useState([]);

  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(localStorage.getItem("workspaceId"));

  useEffect(() => {
    const wsId = localStorage.getItem("workspaceId");
    if (!wsId) {
      if (user?.workspaces && user.workspaces.length > 0) {
        localStorage.setItem("workspaceId", user.workspaces[0].id);
        setWorkspaceId(user.workspaces[0].id);
      } else {
        alert("You need a workspace to create a project. Redirecting to workspace creation...");
        navigate("/create-workspace");
      }
    } else {
      setWorkspaceId(wsId);
    }
  }, [user, navigate]);

  // ADD MEMBER
  const addMember = () => {
    if (!memberEmail.trim()) return;

    const email = memberEmail.trim().toLowerCase();

    // EMAIL VALIDATION
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      alert("Enter valid email");
      return;
    }

    // PREVENT DUPLICATES
    if (invitedMembers.includes(email)) {
      alert("Member already added");
      return;
    }

    setInvitedMembers([...invitedMembers, email]);
    setMemberEmail("");
  };

  // REMOVE MEMBER
  const removeMember = (email) => {
    setInvitedMembers(
      invitedMembers.filter((m) => m !== email)
    );
  };

  // CREATE PROJECT
  const handleCreate = async () => {
    if (!form.name.trim()) {
      alert("Project name required");
      return;
    }

    if (!workspaceId) {
      alert("No active workspace found. Please select or create a workspace first.");
      return;
    }

    try {
      setCreating(true);

      // CURRENT USER
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login first");
        return;
      }

      // PROFILE (using backend REST API to auto-heal profile if missing)
      let profile = null;
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
        const res = await axios.get(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        profile = res.data?.profile;
      } catch (err) {
        console.error("Backend profile fetch error:", err);
      }

      if (!profile) {
        alert("User profile not found. Please log in again.");
        return;
      }

      // CREATE PROJECT (Using REST API to avoid client-side RLS and schema color column mismatch)
      let project;
      try {
        const res = await projectApi.create({
          workspace_id: workspaceId,
          name: form.name,
          description: form.desc,
        }, token);
        project = res.project;
      } catch (err) {
        console.error("Project API creation error:", err);
        alert(err?.response?.data?.message || err.message || "Failed to create project");
        return;
      }

      if (!project?.id) {
        alert("Failed to create project: Empty project ID returned.");
        return;
      }

      // SAVE PROJECT ID
      localStorage.setItem("projectId", project.id);

      // SEND INVITATIONS via correct 'invitations' table
      for (const email of invitedMembers) {
        try {
          await supabase
            .from("invitations")
            .insert({
              workspace_id: workspaceId,
              project_id: project.id,
              email,
              role: "member",
              token: crypto.randomUUID(),
              invited_by: profile.id,
            });
        } catch (inviteError) {
          console.error("Invite error:", inviteError);
        }
      }

      setDone(true);

      setTimeout(() => {
        navigate("/dashboard");
      }, 2500);

    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50 px-4">

      {/* BACKGROUND */}
      <div className="pointer-events-none absolute top-0 right-1/4 h-80 w-80 rounded-full bg-indigo-200 opacity-20 blur-3xl" />

      <div className="pointer-events-none absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-violet-200 opacity-20 blur-3xl" />

      <AnimatePresence mode="wait">

        {done ? (

          // SUCCESS
          <motion.div
            key="success"
            className="flex flex-col items-center gap-4 text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className={`flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br ${form.color} text-5xl shadow-2xl`}
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 0.6 }}
            >
              🚀
            </motion.div>

            <h2 className="text-2xl font-extrabold text-gray-900">
              {form.name} created!
            </h2>

            <p className="text-gray-500">
              Invitations sent successfully
            </p>
          </motion.div>

        ) : (

          // FORM
          <motion.div
            key="form"
            className="w-full max-w-3xl rounded-3xl border border-gray-100 bg-white shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >

            {/* HEADER */}
            <div
              className={`bg-gradient-to-r ${form.color} px-8 py-6`}
            >
              <div className="flex items-center gap-3">

                <motion.div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl"
                  animate={{
                    scale: [1, 1.08, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  🚀
                </motion.div>

                <div>
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-widest">
                    New Project
                  </p>

                  <h2 className="text-xl font-extrabold text-white">
                    {form.name || "Untitled Project"}
                  </h2>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="space-y-6 p-8">

              {/* NAME + DESC */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Project Name
                  </label>

                  <input
                    autoFocus
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    placeholder="e.g. DevCollab"
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Description
                  </label>

                  <input
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    placeholder="What are you building?"
                    value={form.desc}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        desc: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* TEMPLATE */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Template
                </label>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

                  {TEMPLATES.map((t) => (

                    <motion.button
                      key={t.name}
                      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${form.template === t.name
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-gray-100 bg-white"
                        }`}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() =>
                        setForm({
                          ...form,
                          template: t.name,
                        })
                      }
                    >
                      <span className="text-lg">
                        {t.icon}
                      </span>

                      <p className="text-xs font-bold text-gray-800">
                        {t.name}
                      </p>

                      <p className="text-[10px] text-gray-400">
                        {t.desc}
                      </p>
                    </motion.button>

                  ))}
                </div>
              </div>

              {/* COLOR + VISIBILITY */}
              <div className="grid grid-cols-2 gap-6">

                {/* COLORS */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Project Color
                  </label>

                  <div className="flex gap-2">

                    {COLORS.map((c) => (

                      <motion.button
                        key={c}
                        className={`h-8 w-8 rounded-full bg-gradient-to-br ${c} ${form.color === c
                          ? "ring-2 ring-offset-2 ring-indigo-400 scale-110"
                          : ""
                          }`}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() =>
                          setForm({
                            ...form,
                            color: c,
                          })
                        }
                      />

                    ))}
                  </div>
                </div>

                {/* VISIBILITY */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Visibility
                  </label>

                  <div className="flex gap-2">

                    {[
                      {
                        val: "private",
                        icon: "🔒",
                        label: "Private",
                      },
                      {
                        val: "public",
                        icon: "🌍",
                        label: "Public",
                      },
                    ].map((v) => (

                      <motion.button
                        key={v.val}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${form.visibility === v.val
                          ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-600"
                          }`}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() =>
                          setForm({
                            ...form,
                            visibility: v.val,
                          })
                        }
                      >
                        {v.icon} {v.label}
                      </motion.button>

                    ))}
                  </div>
                </div>
              </div>

              {/* INVITE MEMBERS */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Invite Members
                </label>

                {/* INPUT */}
                <div className="flex gap-2">

                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={memberEmail}
                    onChange={(e) =>
                      setMemberEmail(e.target.value)
                    }
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />

                  <button
                    type="button"
                    onClick={addMember}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Add
                  </button>

                </div>

                {/* MEMBERS */}
                <div className="mt-4 flex flex-wrap gap-2">

                  {invitedMembers.map((email, index) => (

                    <motion.div
                      key={index}
                      className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >

                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white">
                        {email.charAt(0).toUpperCase()}
                      </div>

                      {email}

                      <button
                        onClick={() =>
                          removeMember(email)
                        }
                        className="text-red-500"
                      >
                        ✕
                      </button>

                    </motion.div>

                  ))}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between border-t border-gray-100 px-8 py-4">

              <motion.button
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </motion.button>

              <motion.button
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white ${form.name.trim()
                  ? `bg-gradient-to-r ${form.color}`
                  : "bg-gray-300"
                  }`}
                whileHover={
                  form.name.trim()
                    ? { scale: 1.05 }
                    : {}
                }
                whileTap={
                  form.name.trim()
                    ? { scale: 0.95 }
                    : {}
                }
                onClick={
                  form.name.trim()
                    ? handleCreate
                    : undefined
                }
                disabled={creating}
              >

                {creating ? (

                  <>
                    <motion.div
                      className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />

                    Creating...

                  </>

                ) : (

                  "🚀 Create Project"

                )}

              </motion.button>
            </div>
          </motion.div>

        )}
      </AnimatePresence>
    </div>
  );
}