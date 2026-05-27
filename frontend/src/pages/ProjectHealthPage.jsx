import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import AppShell from "../components/AppShell";
import { getProjectHealth } from "../services/ai.service.js";
import { AVATAR_COLORS } from "./KanbanPage.jsx";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { taskApi } from "../services/api";

/* ─────────────────────────────────────────────
   MINI BAR CHART
───────────────────────────────────────────── */
function VelocityChart({ data }) {

  const max = Math.max(
    ...data.map((d) => d.tasks),
    1
  );

  return (
    <div className="flex h-20 items-end gap-1.5">

      {data.map((d, i) => (

        <div
          key={i}
          className="flex flex-1 flex-col items-center gap-1"
        >

          <motion.div
            className="w-full rounded-t-md bg-indigo-500"
            style={{
              height: `${(d.tasks / max) * 64}px`,
            }}
            initial={{ height: 0 }}
            animate={{
              height: `${(d.tasks / max) * 64}px`,
            }}
            transition={{
              delay: i * 0.07,
              duration: 0.5,
              ease: "easeOut",
            }}
          />

          <span className="text-[9px] text-gray-400">
            {d.day}
          </span>

        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   HEALTH RING
───────────────────────────────────────────── */
function HealthRing({
  score,
  status,
}) {

  const color =
    status === "Healthy"
      ? "#22c55e"
      : status === "At Risk"
        ? "#f59e0b"
        : "#ef4444";

  const offset =
    100 - score;

  return (
    <div className="relative h-28 w-28">

      <svg
        viewBox="0 0 36 36"
        className="h-28 w-28 -rotate-90"
      >

        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="3"
        />

        <motion.circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray="100"
          strokeLinecap="round"
          initial={{
            strokeDashoffset: 100,
          }}
          animate={{
            strokeDashoffset: offset,
          }}
          transition={{
            duration: 1.4,
            ease: "easeOut",
          }}
        />

      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">

        <span className="text-2xl font-extrabold text-gray-900">
          {score}
        </span>

        <span className="text-[10px] font-semibold text-gray-400">
          / 100
        </span>

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   METRIC CARD
───────────────────────────────────────────── */
function MetricCard({
  label,
  value,
  sub,
  color = "text-gray-900",
}) {

  return (
    <motion.div
      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
    >

      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
        {label}
      </p>

      <p
        className={`mt-1 text-3xl font-extrabold ${color}`}
      >
        {value}
      </p>

      {sub && (

        <p className="mt-0.5 text-xs text-gray-400">
          {sub}
        </p>

      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */

export default function ProjectHealthPage() {
  const { token } = useAuth();
  const [projectId, setProjectId] = useState(localStorage.getItem("projectId"));
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  /* ─────────────────────────────────────────
     FETCH HEALTH
  ───────────────────────────────────────── */

  const fetchHealth = async (targetProjId) => {
    const projId = targetProjId || projectId;
    if (!projId) return;

    setLoading(true);
    setError(null);

    try {
      // FETCH TASKS (via backend API to bypass RLS)
      let tasks = [];
      try {
        const res = await taskApi.list({ projectId: projId }, token);
        tasks = res.tasks || res || [];
      } catch (err) {
        console.error("Failed to fetch tasks via API in health page, falling back to direct db select:", err);
        const { data, error: tasksError } = await supabase
          .from("tasks")
          .select("*")
          .eq("project_id", projId);
        
        if (tasksError) {
          console.error(tasksError);
          setError(tasksError.message);
          return;
        }
        tasks = data || [];
      }

      if (tasks.length === 0) {
        setHealth({
          empty: true,
          healthScore: 100,
          status: "Healthy",
          metrics: {
            total: 0,
            done: 0,
            inProgress: 0,
            inReview: 0,
            todo: 0,
            overdue: 0,
            p0Blocked: 0,
            completionRate: 0,
          },
          insights: [
            { type: "positive", text: "Create and assign tasks in your Kanban board to view real-time AI-powered health insights." }
          ],
          memberStats: [],
          velocity: Array.from({ length: 7 }, (_, i) => ({
            day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
            tasks: 0,
          }))
        });
        setLastRefresh(new Date().toLocaleTimeString());
        return;
      }

      // FORMAT KANBAN
      const kanbanData = {
        todo: [],
        inprogress: [],
        review: [],
        done: [],
      };

      tasks.forEach((task) => {
        const formattedTask = {
          id: task.id,
          title: task.title,
          priority: task.priority || "P2",
          assignee: task.assignee || "Unassigned",
          label: task.label || "General",
          due: task.due_date,
          updated_at: task.updated_at,
          created_at: task.created_at,
        };

        const status = task.status?.toLowerCase()?.replace(/\s/g, "");

        if (kanbanData[status]) {
          kanbanData[status].push(formattedTask);
        } else {
          kanbanData.todo.push(formattedTask);
        }
      });

      // UNIQUE MEMBERS
      const members = [
        ...new Set(
          tasks.map((t) => t.assignee)
        ),
      ].filter(Boolean);

      // AI ANALYSIS
      const data = await getProjectHealth(kanbanData, members);

      setHealth(data);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────
     LOAD
  ───────────────────────────────────────── */

  // AUTO RESOLUTION OF PROJECT / WORKSPACE ID
  useEffect(() => {
    const resolveAndFetch = async () => {
      let activeProjectId = projectId;
      
      if (!activeProjectId) {
        let workspaceId = localStorage.getItem("workspaceId");
        
        // 1. Resolve workspaceId if missing
        if (!workspaceId) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("auth_id", user.id)
                .single();
                
              if (profile) {
                const { data: ws } = await supabase
                  .from("workspaces")
                  .select("id")
                  .eq("owner_id", profile.id)
                  .limit(1)
                  .single();
                if (ws) {
                  workspaceId = ws.id;
                  localStorage.setItem("workspaceId", workspaceId);
                }
              }
            }
          } catch (e) {
            console.error("Health resolve workspace error:", e);
          }
        }

        // 2. Resolve projectId from workspaceId
        if (workspaceId) {
          try {
            const { data: proj } = await supabase
              .from("projects")
              .select("id")
              .eq("workspace_id", workspaceId)
              .limit(1)
              .single();
            if (proj) {
              activeProjectId = proj.id;
              localStorage.setItem("projectId", activeProjectId);
              setProjectId(activeProjectId);
            }
          } catch (e) {
            console.error("Health resolve project error:", e);
          }
        }
      }

      if (activeProjectId) {
        fetchHealth(activeProjectId);
      } else {
        setLoading(false);
      }
    };

    resolveAndFetch();
  }, [projectId]);

  const statusColors = {
    Healthy:
      "bg-green-100 text-green-700 border-green-200",

    "At Risk":
      "bg-amber-100 text-amber-700 border-amber-200",

    Critical:
      "bg-red-100 text-red-700 border-red-200",
  };

  const insightColors = {
    positive:
      "border-green-200 bg-green-50",

    warning:
      "border-amber-200 bg-amber-50",

    critical:
      "border-red-200 bg-red-50",
  };

  const insightIcons = {
    positive: "✅",
    warning: "⚠️",
    critical: "🚨",
  };

  return (
    <AppShell
      title="Project Health"
      subtitle="Live analytics · AI-powered insights"
      actions={
        projectId && (
          <motion.button
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200"
            whileHover={{
              scale: 1.05,
            }}
            whileTap={{
              scale: 0.95,
            }}
            onClick={() => fetchHealth(projectId)}
            disabled={loading}
          >
            {loading ? (
              <>
                <motion.div
                  className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                Refreshing...
              </>
            ) : (
              "↻ Refresh"
            )}
          </motion.button>
        )
      }
    >
      {/* ERROR */}
      {error && (
        <motion.div
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
        >
          ⚠️ {error}
        </motion.div>
      )}

      {!projectId ? (
        <div className="flex flex-col items-center justify-center text-center bg-white border border-gray-100 rounded-2xl shadow-sm h-[350px] p-12">
          <span className="text-4xl mb-3">❤️</span>
          <h2 className="text-xl font-bold text-gray-700">No Active Project</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">Please select or create a project from the Dashboard first to access Project Health analytics.</p>
        </div>
      ) : loading && !health ? (
        <div className="flex flex-col items-center justify-center text-center bg-white border border-gray-100 rounded-2xl shadow-sm h-[350px] p-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-duration-500"></div>
          <p className="mt-4 text-sm text-gray-400">Loading project health analytics...</p>
        </div>
      ) : health?.empty ? (
        <div className="flex flex-col items-center justify-center text-center bg-white border border-gray-100 rounded-2xl shadow-sm h-[350px] p-12">
          <span className="text-4xl mb-3">📋</span>
          <h2 className="text-xl font-bold text-gray-700">No Tasks Found</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">Create and assign some tasks in your Kanban board to view real-time AI-powered health insights!</p>
        </div>
      ) : (
        <AnimatePresence>
          {health && (
            <motion.div
              className="space-y-5"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
            >
              {/* TOP */}
              <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-4 items-stretch">
                {/* HEALTH SCORE */}
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <HealthRing
                    score={health.healthScore}
                    status={health.status}
                  />
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${
                      statusColors[health.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {health.status}
                  </span>
                  {lastRefresh && (
                    <p className="text-[10px] text-gray-400">
                      Updated {lastRefresh}
                    </p>
                  )}
                </div>

                {/* METRICS */}
                <MetricCard
                  label="Completion"
                  value={`${health.metrics.completionRate}%`}
                  sub={`${health.metrics.done} of ${health.metrics.total} tasks done`}
                  color="text-indigo-600"
                />

                <MetricCard
                  label="In Progress"
                  value={health.metrics.inProgress}
                  sub={`${health.metrics.inReview} in review`}
                  color="text-blue-600"
                />

                <MetricCard
                  label="Overdue"
                  value={health.metrics.overdue}
                  sub="tasks past due date"
                  color={health.metrics.overdue > 0 ? "text-red-600" : "text-green-600"}
                />

                <MetricCard
                  label="P0 Blocked"
                  value={health.metrics.p0Blocked}
                  sub="critical tasks in To Do"
                  color={health.metrics.p0Blocked > 0 ? "text-amber-600" : "text-green-600"}
                />
              </div>

              {/* MIDDLE */}
              <div className="grid grid-cols-2 gap-4">
                {/* VELOCITY */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                    Task Velocity — Last 7 Days
                  </p>
                  <VelocityChart data={health.velocity} />
                  <p className="mt-3 text-xs text-gray-400">
                    Avg {(health.velocity.reduce((s, d) => s + d.tasks, 0) / 7).toFixed(1)} tasks/day
                  </p>
                </div>

                {/* AI INSIGHTS */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                    AI Insights
                  </p>
                  <div className="space-y-2.5">
                    {health.insights?.map((insight, i) => (
                      <motion.div
                        key={i}
                        className={`flex items-start gap-2.5 rounded-xl border p-3 ${
                          insightColors[insight.type] ?? "border-gray-200 bg-gray-50"
                        }`}
                        initial={{
                          opacity: 0,
                          x: -8,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        transition={{
                          delay: i * 0.1,
                        }}
                      >
                        <span className="text-sm">
                          {insightIcons[insight.type] ?? "💡"}
                        </span>
                        <p className="text-xs leading-relaxed text-gray-700">
                          {insight.text}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* MEMBERS */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                  Member Contribution
                </p>
                {!health.memberStats || health.memberStats.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No tasks assigned to team members yet.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    {health.memberStats.map((member, i) => (
                      <motion.div
                        key={i}
                        className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-4"
                        initial={{
                          opacity: 0,
                          y: 8,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          delay: i * 0.08,
                        }}
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${
                            AVATAR_COLORS[member.name] ?? "from-gray-300 to-gray-400"
                          } text-sm font-bold text-white shadow-sm`}
                        >
                          {member.name[0]}
                        </div>
                        <p className="text-sm font-bold text-gray-800">
                          {member.name}
                        </p>
                        <div className="w-full">
                          {/* PROGRESS */}
                          <div className="h-1.5 w-full rounded-full bg-gray-200">
                            <motion.div
                              className="h-1.5 rounded-full bg-indigo-500"
                              initial={{
                                width: 0,
                              }}
                              animate={{
                                width: `${member.completion}%`,
                              }}
                              transition={{
                                duration: 0.8,
                                delay: i * 0.1,
                                ease: "easeOut",
                              }}
                            />
                          </div>
                          <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                            <span>
                              {member.done}/{member.total} done
                            </span>
                            <span>
                              {member.completion}%
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </AppShell>
  );
}