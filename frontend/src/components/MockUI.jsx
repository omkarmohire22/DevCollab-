import { motion } from "framer-motion";
import { useState } from "react";

/* ── tiny reusable progress bar ── */
function Bar({ label, pct, gradient, delay }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[11px] font-medium text-gray-500">{label}</span>
        <span className="text-[11px] font-bold text-gray-700">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className="h-full rounded-full"
          style={{ background: gradient }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay, duration: 1.3, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ── Back card: dark code editor ── */
function CodeCard() {
  const lines = [
    { n: 1, color: "#7dd3fc", code: "const workspace = {" },
    { n: 2, color: "#86efac", code: '  name: "DevCollab",' },
    { n: 3, color: "#86efac", code: '  plan: "Pro",' },
    { n: 4, color: "#fca5a5", code: "  members: 12," },
    { n: 5, color: "#c4b5fd", code: "  tasks: fetchTasks()," },
    { n: 6, color: "#7dd3fc", code: "};" },
    { n: 7, color: "#94a3b8", code: "" },
    { n: 8, color: "#fbbf24", code: "// AI reviewing..." },
  ];

  return (
    <motion.div
      className="absolute bottom-0 left-0 w-64 overflow-hidden rounded-2xl shadow-2xl"
      style={{
        background: "linear-gradient(145deg,#0f172a,#1e293b)",
        border: "1px solid rgba(255,255,255,0.07)",
        zIndex: 1,
      }}
      initial={{ opacity: 0, x: -30, rotate: -7 }}
      animate={{ opacity: 1, x: 0, rotate: -7 }}
      transition={{ delay: 0.6, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ rotate: -4, scale: 1.03 }}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        <span className="ml-2 font-mono text-[10px] text-slate-400">workspace.js</span>
      </div>

      {/* Code lines */}
      <div className="space-y-1.5 px-4 py-3 font-mono text-[11px]">
        {lines.map((l, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 + i * 0.07 }}
          >
            <span className="w-3 text-right text-[9px] text-slate-600">{l.n}</span>
            <span style={{ color: l.color }}>{l.code}</span>
            {i === lines.length - 1 && (
              <motion.span
                className="ml-0.5 inline-block h-3 w-1.5 rounded-sm bg-indigo-400"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* AI badge */}
      <motion.div
        className="mx-3 mb-3 flex items-center gap-2 rounded-lg bg-indigo-900/60 px-3 py-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.9 }}
      >
        <motion.span
          animate={{ rotate: [0, 20, -20, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
          className="text-sm"
        >
          🤖
        </motion.span>
        <div>
          <p className="text-[10px] font-semibold text-indigo-300">AI Review</p>
          <p className="text-[9px] text-slate-400">Score: 8.5/10 · 2 suggestions</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Front card: dashboard ── */
function DashCard() {
  const [checked, setChecked] = useState([true, true, false, false]);

  const tasks = [
    { label: "Design system setup", priority: null },
    { label: "Auth module", priority: null },
    { label: "Kanban board", priority: "P1" },
    { label: "AI integration", priority: "P0" },
  ];

  const toggle = (i) =>
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  return (
    <motion.div
      className="relative z-10 w-72 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
      initial={{ opacity: 0, y: 40, rotate: 3 }}
      animate={{ opacity: 1, y: 0, rotate: 3 }}
      transition={{ delay: 0.35, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ rotate: 1, scale: 1.02 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="white" />
              <rect x="7" y="1" width="4" height="4" rx="1" fill="white" opacity="0.55" />
              <rect x="1" y="7" width="4" height="4" rx="1" fill="white" opacity="0.55" />
              <rect x="7" y="7" width="4" height="4" rx="1" fill="white" opacity="0.25" />
            </svg>
          </div>
          <span className="text-sm font-bold text-gray-800">DevCollab</span>
        </div>
        <div className="flex gap-1">
          {["Tasks", "Docs", "AI"].map((t, i) => (
            <motion.span
              key={t}
              className={`cursor-pointer rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                i === 0
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {t}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-2.5 border-b border-gray-50 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Sprint Progress
        </p>
        <Bar
          label="Frontend"
          pct={72}
          gradient="linear-gradient(90deg,#4f46e5,#7c3aed)"
          delay={0.9}
        />
        <Bar
          label="Backend"
          pct={48}
          gradient="linear-gradient(90deg,#06b6d4,#3b82f6)"
          delay={1.0}
        />
        <Bar
          label="AI Features"
          pct={24}
          gradient="linear-gradient(90deg,#f59e0b,#ef4444)"
          delay={1.1}
        />
      </div>

      {/* Live member */}
      <div className="flex items-center gap-3 border-b border-gray-50 px-5 py-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-bold text-white">
          A
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-800">Ankush is reviewing</p>
          <p className="truncate text-[10px] text-gray-400">auth/login.js · just now</p>
        </div>
        <motion.div
          className="h-2 w-2 flex-shrink-0 rounded-full bg-green-400"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      </div>

      {/* Task list */}
      <div className="px-5 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Milestones
        </p>
        <div className="space-y-2">
          {tasks.map((task, i) => (
            <motion.div
              key={i}
              className="group flex cursor-pointer items-center gap-2.5"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 + i * 0.09 }}
              onClick={() => toggle(i)}
              whileHover={{ x: 3 }}
            >
              <motion.div
                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  checked[i]
                    ? "border-indigo-600 bg-indigo-600"
                    : "border-gray-300 group-hover:border-indigo-400"
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.85 }}
              >
                {checked[i] && (
                  <motion.svg
                    width="8"
                    height="8"
                    viewBox="0 0 8 8"
                    fill="none"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <path
                      d="M1.5 4L3 5.5L6.5 2"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </motion.svg>
                )}
              </motion.div>
              <span
                className={`flex-1 text-xs transition-colors ${
                  checked[i]
                    ? "text-gray-400 line-through"
                    : "text-gray-700 group-hover:text-indigo-600"
                }`}
              >
                {task.label}
              </span>
              {task.priority && !checked[i] && (
                <motion.span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    task.priority === "P0"
                      ? "bg-red-100 text-red-600"
                      : "bg-amber-100 text-amber-600"
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 + i * 0.09 }}
                >
                  {task.priority}
                </motion.span>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Notification strip */}
      <motion.div
        className="mx-4 mb-4 mt-1 flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.85 }}
      >
        <motion.div
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600"
          animate={{ rotate: [0, 18, -18, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3 }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path
              d="M4.5 1v3.5l2 1.2"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>
        <p className="text-[10px] font-medium text-indigo-700">
          Riya moved <span className="font-bold">Auth task</span> to In Review
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ── Big dark background card ── */
function BgCard() {
  return (
    <motion.div
      className="absolute right-0 top-4 h-[430px] w-96 rounded-3xl shadow-2xl"
      style={{
        background:
          "linear-gradient(145deg,#1a3a5c 0%,#0f2744 55%,#111827 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        zIndex: 0,
      }}
      initial={{ opacity: 0, scale: 0.88, rotate: 4 }}
      animate={{ opacity: 1, scale: 1, rotate: 4 }}
      transition={{ delay: 0.15, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ rotate: 2 }}
    >
      {/* Inner glow */}
      <div
        className="absolute inset-0 rounded-3xl"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.35) 0%, transparent 60%)",
        }}
      />

      {/* Dot grid */}
      <div className="absolute right-5 top-5 grid grid-cols-5 gap-1.5 opacity-20">
        {Array.from({ length: 25 }).map((_, i) => (
          <motion.div
            key={i}
            className="h-1 w-1 rounded-full bg-white"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.08 }}
          />
        ))}
      </div>

      {/* Mini stat cards */}
      <div className="absolute bottom-8 left-5 right-5 space-y-2">
        {[
          { label: "Active Users", val: "2,847", trend: "+12%", up: true },
          { label: "Tasks Completed", val: "1,203", trend: "+8%", up: true },
          { label: "AI Reviews", val: "489", trend: "stable", up: null },
        ].map((s, i) => (
          <motion.div
            key={i}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.4 + i * 0.14 }}
          >
            <span className="text-[11px] text-slate-400">{s.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white">{s.val}</span>
              <span
                className={`text-[9px] font-semibold ${
                  s.up === true
                    ? "text-green-400"
                    : s.up === false
                    ? "text-red-400"
                    : "text-amber-400"
                }`}
              >
                {s.trend}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Root export ── */
export default function MockUI() {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ height: 500 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      {/* Radial glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{
          background:
            "radial-gradient(ellipse at 60% 50%, rgba(79,70,229,0.13) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Big dark bg card */}
      <BgCard />

      {/* Code editor card */}
      <CodeCard />

      {/* Main dashboard card */}
      <div className="relative z-10 mr-12 mt-10">
        <DashCard />
      </div>

      {/* "3 online" badge */}
      <motion.div
        className="absolute left-6 top-0 z-20 flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1.5 shadow-lg"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.1, type: "spring", stiffness: 260 }}
        whileHover={{ scale: 1.06 }}
      >
        <motion.div
          className="h-2 w-2 rounded-full bg-green-500"
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 1.3, repeat: Infinity }}
        />
        <span className="text-xs font-semibold text-gray-700">3 online now</span>
      </motion.div>

      {/* "AI Active" badge */}
      <motion.div
        className="absolute bottom-4 right-2 z-20 flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 shadow-lg"
        style={{ boxShadow: "0 4px 20px rgba(79,70,229,0.45)" }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2.35, type: "spring", stiffness: 300 }}
        whileHover={{ scale: 1.1 }}
      >
        <motion.span
          animate={{ rotate: [0, 22, -22, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 2.5 }}
          className="text-sm leading-none"
        >
          ✨
        </motion.span>
        <span className="text-xs font-semibold text-white">AI Active</span>
      </motion.div>

      {/* Task moved notification */}
      <motion.div
        className="absolute right-0 top-16 z-20 flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-xl"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2.6, type: "spring", stiffness: 220 }}
        whileHover={{ scale: 1.04 }}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5h6M5.5 2.5L8 5l-2.5 2.5"
              stroke="#7c3aed"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-800">Task moved</p>
          <p className="text-[9px] text-gray-400">In Progress to Done</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
