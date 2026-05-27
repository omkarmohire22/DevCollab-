
// ============================================
// IMPORTS
// ============================================

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import axios from "axios";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { workspaceApi, projectApi } from "../services/api";

// ============================================
// EMAILJS CONFIG
// ============================================

const SERVICE_ID = "service_tw93lki";

const TEMPLATE_ID = "template_yhixi7k";
const PUBLIC_KEY = "MTTo_2cnJMG8CFxia";

// ============================================
// CONSTANTS
// ============================================

const STEPS = [
  "Workspace",
  "Invite Team",
  "First Project",
];

const AVATARS = [
  "from-pink-400 to-rose-500",
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-violet-400 to-purple-500",
];

const slideVariants = {
  enter: (dir) => ({
    opacity: 0,
    x: dir > 0 ? 60 : -60,
  }),

  center: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
    },
  },

  exit: (dir) => ({
    opacity: 0,
    x: dir > 0 ? -60 : 60,
    transition: {
      duration: 0.25,
    },
  }),
};

// ============================================
// STEP 1
// ============================================

function StepWorkspace({
  data,
  onChange,
}) {

  const icons = [
    "💻",
    "🚀",
    "🎯",
    "⚡",
    "🔥",
    "🌟",
  ];

  return (
    <div className="space-y-5">

      {/* NAME */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Workspace Name
        </label>

        <input
          autoFocus
          value={data.name}
          onChange={(e) =>
            onChange({
              ...data,
              name: e.target.value,
            })
          }
          placeholder="DevFusion Team"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* DESCRIPTION */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Description
        </label>

        <textarea
          rows={3}
          value={data.desc}
          onChange={(e) =>
            onChange({
              ...data,
              desc: e.target.value,
            })
          }
          placeholder="What does your team build?"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* ICONS */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Workspace Icon
        </label>

        <div className="flex flex-wrap gap-2">

          {icons.map((icon) => (

            <motion.button
              key={icon}
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() =>
                onChange({
                  ...data,
                  icon,
                })
              }
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${data.icon === icon
                ? "bg-indigo-600 text-white"
                : "bg-gray-100"
                }`}
            >
              {icon}
            </motion.button>

          ))}
        </div>
      </div>

      {/* SLUG */}
      <div>

        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Workspace URL
        </label>

        <div className="flex overflow-hidden rounded-xl border border-gray-200">

          <span className="bg-gray-50 px-3 py-3 text-sm text-gray-400">
            devcollab.io/
          </span>

          <input
            value={data.slug}
            onChange={(e) =>
              onChange({
                ...data,
                slug: e.target.value
                  .toLowerCase()
                  .replace(/\s+/g, "-"),
              })
            }
            placeholder="your-team"
            className="flex-1 px-3 py-3 outline-none"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// STEP 2
// ============================================

function StepInvite({
  data,
  onChange,
  workspaceData,
}) {

  const [email, setEmail] =
    useState("");

  const [role, setRole] =
    useState("Member");

  const [sending, setSending] =
    useState(false);

  const ROLES = [
    "Owner",
    "Admin",
    "Member",
    "Viewer",
  ];

  const ROLE_COLORS = {
    Owner:
      "bg-red-100 text-red-700",

    Admin:
      "bg-amber-100 text-amber-700",

    Member:
      "bg-indigo-100 text-indigo-700",

    Viewer:
      "bg-gray-100 text-gray-700",
  };

  // ============================================
  // SEND INVITE
  // ============================================

  const addInvite = async () => {

    if (!email.trim()) {

      alert("Enter email");

      return;
    }

    try {

      setSending(true);

      const cleanEmail =
        email.trim().toLowerCase();

      // DUPLICATE CHECK
      if (
        data.invites.some(
          (i) => i.email === cleanEmail
        )
      ) {

        alert("Already invited");

        return;
      }

      const token =
        crypto.randomUUID();

      // EMAILJS
      await emailjs.send(

        SERVICE_ID,

        TEMPLATE_ID,

        {
          email: cleanEmail,

          workspace_name:
            workspaceData.name,

          invited_by:
            "Shravani Hajare",

          role,

          invite_link:
            `http://localhost:5173/join-workspace/${token}`,
        },

        PUBLIC_KEY
      );

      // UPDATE UI
      onChange({
        ...data,

        invites: [
          ...data.invites,

          {
            email: cleanEmail,
            role,
            token,
          },
        ],
      });

      setEmail("");

      alert(
        "Invitation sent 🚀"
      );

    } catch (err) {

      console.error(err);

      alert(
        err.text ||
        err.message
      );

    } finally {

      setSending(false);
    }
  };

  // ============================================
  // REMOVE INVITE
  // ============================================

  const removeInvite = (i) => {

    onChange({
      ...data,

      invites:
        data.invites.filter(
          (_, idx) => idx !== i
        ),
    });
  };

  return (
    <div className="space-y-5">

      {/* ROLES */}
      <div className="grid grid-cols-2 gap-2">

        {ROLES.map((r) => (

          <motion.button
            key={r}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRole(r)}
            className={`rounded-xl border p-3 text-left ${role === r
              ? "border-indigo-400 bg-indigo-50"
              : "border-gray-100"
              }`}
          >

            <span
              className={`rounded-full px-2 py-1 text-xs font-bold ${ROLE_COLORS[r]}`}
            >
              {r}
            </span>

          </motion.button>

        ))}
      </div>

      {/* EMAIL */}
      <div>

        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Invite by Email
        </label>

        <div className="flex gap-2">

          <input
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="teammate@gmail.com"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />

          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addInvite}
            disabled={sending}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
          >
            {sending
              ? "Sending..."
              : "Invite"}
          </motion.button>
        </div>
      </div>

      {/* INVITES */}
      <AnimatePresence>

        {data.invites.length > 0 ? (

          <div className="space-y-2">

            {data.invites.map(
              (inv, i) => (

                <motion.div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
                >

                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${AVATARS[
                      i %
                      AVATARS.length
                    ]
                      } text-xs font-bold text-white`}
                  >
                    {inv.email[0].toUpperCase()}
                  </div>

                  <div className="flex-1">

                    <p className="text-sm font-medium">
                      {inv.email}
                    </p>

                  </div>

                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${ROLE_COLORS[inv.role]}`}
                  >
                    {inv.role}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      removeInvite(i)
                    }
                    className="text-red-400"
                  >
                    ✕
                  </button>

                </motion.div>
              )
            )}

          </div>

        ) : (

          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-8 text-center">

            <p className="text-sm text-gray-500">
              No invites yet
            </p>

          </div>

        )}

      </AnimatePresence>
    </div>
  );
}

// ============================================
// STEP 3
// ============================================

function StepProject({
  data,
  onChange,
}) {

  const templates = [
    "Blank Project",
    "Web App",
    "Mobile App",
    "API Service",
    "Hackathon",
  ];

  return (
    <div className="space-y-5">

      <div>

        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Project Name
        </label>

        <input
          value={data.projectName}
          onChange={(e) =>
            onChange({
              ...data,
              projectName:
                e.target.value,
            })
          }
          placeholder="DevCollab Platform"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div>

        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Template
        </label>

        <div className="grid grid-cols-2 gap-2">

          {templates.map((t) => (

            <motion.button
              key={t}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() =>
                onChange({
                  ...data,
                  template: t,
                })
              }
              className={`rounded-xl border p-3 text-left ${data.template === t
                ? "border-indigo-400 bg-indigo-50"
                : "border-gray-100"
                }`}
            >
              {t}
            </motion.button>

          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function CreateWorkspacePage() {

  const navigate = useNavigate();
  const { token } = useAuth();

  const [step, setStep] =
    useState(0);

  const [dir, setDir] =
    useState(1);

  const [workspace, setWorkspace] =
    useState({
      name: "",
      desc: "",
      icon: "💻",
      slug: "",
    });

  const [invite, setInvite] =
    useState({
      invites: [],
    });

  const [project, setProject] =
    useState({
      projectName: "",
      template: "Blank Project",
    });

  const [creating, setCreating] =
    useState(false);

  // ============================================
  // NEXT
  // ============================================

  const goNext = async () => {

    // MOVE BETWEEN STEPS
    if (step < STEPS.length - 1) {

      setDir(1);

      setStep((s) => s + 1);

      return;
    }

    try {

      setCreating(true);

      // CURRENT USER
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login");
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

      // CREATE WORKSPACE (Using REST API to execute under service_role to avoid client-side RLS constraints)
      let workspaceData;
      try {
        const res = await workspaceApi.create({
          name: workspace.name,
          slug: workspace.slug || workspace.name.toLowerCase().replace(/\s+/g, "-"),
          plan: "Pro"
        }, token);
        workspaceData = res.workspace;
      } catch (err) {
        console.error("Workspace API creation error:", err);
        alert(err?.response?.data?.message || err.message || "Failed to create workspace");
        return;
      }

      if (!workspaceData?.id) {
        alert("Failed to create workspace: Empty workspace ID returned.");
        return;
      }

      // SAVE WORKSPACE ID
      localStorage.setItem("workspaceId", workspaceData.id);

      // CREATE PROJECT (Using REST API to avoid client-side RLS constraints)
      let projectData;
      try {
        const res = await projectApi.create({
          workspace_id: workspaceData.id,
          name: project.projectName || "Untitled Project"
        }, token);
        projectData = res.project;
      } catch (err) {
        console.error("Project API creation error:", err);
        alert(err?.response?.data?.message || err.message || "Failed to create project");
        return;
      }

      // SAVE PROJECT ID
      localStorage.setItem(
        "projectId",
        projectData.id
      );

      alert(
        "Workspace created successfully 🚀"
      );

      navigate("/dashboard");

    } catch (err) {

      console.error(err);

      alert(
        err.message
      );

    } finally {

      setCreating(false);
    }
  };

  const goBack = () => {

    setDir(-1);

    setStep((s) => s - 1);
  };

  const stepContent = [

    <StepWorkspace
      data={workspace}
      onChange={setWorkspace}
    />,

    <StepInvite
      data={invite}
      onChange={setInvite}
      workspaceData={workspace}
    />,

    <StepProject
      data={project}
      onChange={setProject}
    />,
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4">

      <motion.div
        className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden"
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >

        {/* HEADER */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-6">

          <div className="mb-4 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl">
              {workspace.icon}
            </div>

            <div>

              <p className="text-xs uppercase tracking-widest text-indigo-200">
                Step {step + 1} of {STEPS.length}
              </p>

              <h2 className="text-2xl font-bold text-white">
                {STEPS[step]}
              </h2>

            </div>
          </div>

          {/* PROGRESS */}
          <div className="h-2 rounded-full bg-white/20">

            <motion.div
              className="h-full rounded-full bg-white"
              animate={{
                width: `${((step + 1) /
                  STEPS.length) *
                  100}%`,
              }}
            />

          </div>
        </div>

        {/* CONTENT */}
        <div className="min-h-[400px] px-8 py-6">

          <AnimatePresence
            mode="wait"
            custom={dir}
          >

            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {stepContent[step]}
            </motion.div>

          </AnimatePresence>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-gray-100 px-8 py-5">

          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className={`rounded-xl px-5 py-2 font-semibold ${step === 0
              ? "cursor-not-allowed text-gray-300"
              : "text-gray-600 hover:bg-gray-50"
              }`}
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={creating}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-200"
          >
            {creating
              ? "Creating..."
              : step ===
                STEPS.length - 1
                ? "🚀 Create Workspace"
                : "Continue →"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}