
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { projectApi } from "../services/api";

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 20,
  },

  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const COLORS = [
  "from-indigo-500 to-violet-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-purple-500 to-indigo-600",
];

const AVATAR_COLORS_LIST = [
  "from-pink-400 to-rose-500",
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-violet-400 to-purple-500",
  "from-cyan-400 to-blue-500",
];

function getAvatarColor(name) {
  if (!name) return "from-gray-300 to-gray-400";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS_LIST[Math.abs(hash) % AVATAR_COLORS_LIST.length];
}

function StatCard({ stat }) {
  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
      whileHover={{
        y: -4,
        boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
      }}
    >
      <div className="flex items-start justify-between">

        <div>
          <p className="text-sm text-gray-500">
            {stat.label}
          </p>

          <p className="mt-1 text-3xl font-extrabold text-gray-900">
            {stat.value}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {stat.sub}
          </p>
        </div>

        <span
          className={`rounded-xl p-2.5 text-xl ${stat.color}`}
        >
          {stat.icon}
        </span>

      </div>
    </motion.div>
  );
}

function ProjectCard({ project, i }) {

  const navigate = useNavigate();

  const pct = project.tasks > 0
    ? Math.round((project.done / project.tasks) * 100)
    : 0;

  return (
    <motion.div
      variants={fadeUp}
      className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all"
      whileHover={{
        y: -5,
        boxShadow:
          "0 16px 48px rgba(79,70,229,0.12)",
      }}
      onClick={() => {
        localStorage.setItem("projectId", project.id);
        navigate("/kanban");
      }}
    >

      {/* TOP */}
      <div className="flex items-start justify-between">

        <div
          className={`h-10 w-10 rounded-xl bg-gradient-to-br ${project.color} flex items-center justify-center text-white font-bold text-sm shadow-md`}
        >
          {project.name?.[0]}
        </div>

        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
          Active
        </span>

      </div>

      {/* NAME */}
      <h3 className="mt-3 font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
        {project.name}
      </h3>

      {/* DESC */}
      <p className="mt-0.5 text-xs text-gray-400">
        {project.description || "No description"}
      </p>

      {/* PROGRESS */}
      <div className="mt-4 space-y-1.5">

        <div className="flex justify-between text-xs text-gray-400">

          <span>
            {project.done}/{project.tasks} tasks
          </span>

          <span className="font-semibold text-gray-600">
            {pct}%
          </span>

        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">

          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${project.color}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{
              delay: 0.4 + i * 0.07,
              duration: 1,
              ease: "easeOut",
            }}
          />

        </div>
      </div>

      {/* MEMBERS */}
      <div className="mt-4 flex items-center justify-between">

        <div className="flex -space-x-1.5">

          {Array.from({
            length: Math.min(project.members, 4),
          }).map((_, j) => (

            <div
              key={j}
              className="h-6 w-6 rounded-full border-2 border-white bg-gradient-to-br from-indigo-400 to-violet-500 text-[9px] font-bold text-white flex items-center justify-center"
            >
              {String.fromCharCode(65 + j)}
            </div>

          ))}

        </div>

        <span className="text-xs font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
          Open →
        </span>

      </div>
    </motion.div>
  );
}

export default function DashboardPage() {

  const navigate = useNavigate();
  const { token } = useAuth();

  const [projects, setProjects] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  const [stats, setStats] = useState([
    {
      label: "Total Projects",
      value: "0",
      sub: "Live from database",
      icon: "📁",
      color: "bg-indigo-50 text-indigo-600",
    },

    {
      label: "Open Tasks",
      value: "0",
      sub: "Tasks module pending",
      icon: "✅",
      color: "bg-amber-50 text-amber-600",
    },

    {
      label: "Team Members",
      value: "0",
      sub: "Realtime members",
      icon: "👥",
      color: "bg-emerald-50 text-emerald-600",
    },

    {
      label: "AI Reviews",
      value: "0",
      sub: "Coming soon",
      icon: "🤖",
      color: "bg-violet-50 text-violet-600",
    },
  ]);

  useEffect(() => {
    fetchProjects();
    // Refresh activity every 30 seconds
    const interval = setInterval(fetchProjects, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchProjects = async () => {

    try {

      // AUTH USER
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // PROFILE
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (profileError || !profile) {
        console.error(profileError);
        return;
      }

      // WORKSPACE ID
      let workspaceId = localStorage.getItem("workspaceId");

      if (!workspaceId) {
        // Try to find a workspace owned by this user
        const { data: ws } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_id", profile.id)
          .limit(1)
          .single();

        if (ws) {
          workspaceId = ws.id;
          localStorage.setItem("workspaceId", workspaceId);
        } else {
          return;
        }
      }

      // PROJECTS (Using backend REST API to bypass RLS cache policies)
      let projectDataList = [];
      try {
        const res = await projectApi.list(token);
        projectDataList = (res?.projects || res || []).filter(p => p.workspace_id === workspaceId);
      } catch (err) {
        console.error("Failed to fetch projects from REST API, falling back to direct DB client...", err);
        const { data: dbData, error: dbError } = await supabase
          .from("projects")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false });
        if (!dbError && dbData) {
          projectDataList = dbData;
        }
      }
      // FORMAT PROJECTS — fetch real task counts
      const projectIds = projectDataList.map((p) => p.id);

      // Fetch all tasks for these projects in one query
      const { data: allTasks } = await supabase
        .from("tasks")
        .select("id, project_id, status")
        .in("project_id", projectIds);

      const tasksByProject = {};
      const doneByProject = {};
      (allTasks || []).forEach((t) => {
        tasksByProject[t.project_id] = (tasksByProject[t.project_id] || 0) + 1;
        if (t.status === "done") {
          doneByProject[t.project_id] = (doneByProject[t.project_id] || 0) + 1;
        }
      });

      const formattedProjects = projectDataList.map(
        (project, index) => ({
          ...project,
          tasks: tasksByProject[project.id] || 0,
          done: doneByProject[project.id] || 0,
          members: Math.floor(Math.random() * 6) + 1,
          color: COLORS[index % COLORS.length],
        })
      );

      setProjects(formattedProjects);

      // AUTO-SET PROJECT ID
      if (formattedProjects.length > 0 && !localStorage.getItem("projectId")) {
        localStorage.setItem("projectId", formattedProjects[0].id);
      }

      // FETCH REAL ACTIVITY
      if (projectIds.length > 0) {
        const { data: activityData } = await supabase
          .from("activity_feed")
          .select("*, actor:profiles(full_name)")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
          .limit(5);

        if (activityData) {
          const timeAgo = (d) => {
            const s = Math.floor((new Date() - new Date(d)) / 1000);
            if (s < 60) return "just now";
            if (s < 3600) return `${Math.floor(s/60)}m ago`;
            if (s < 86400) return `${Math.floor(s/3600)}h ago`;
            return `${Math.floor(s/86400)}d ago`;
          };
          setRecentActivity(activityData.map(a => ({
            user: a.actor?.full_name || "Someone",
            action: a.action,
            target: a.target,
            time: timeAgo(a.created_at),
          })));
        }
      }

      const openTaskCount = (allTasks || []).filter(
        (t) => t.status !== "done"
      ).length;

      // UPDATE STATS
      setStats([
        {
          label: "Total Projects",
          value: projectDataList.length.toString(),
          sub: "Live from database",
          icon: "📁",
          color: "bg-indigo-50 text-indigo-600",
        },

        {
          label: "Open Tasks",
          value: openTaskCount.toString(),
          sub: "Across all projects",
          icon: "✅",
          color: "bg-amber-50 text-amber-600",
        },

        {
          label: "Team Members",
          value: projectDataList.length.toString(),
          sub: "Project collaborators",
          icon: "👥",
          color: "bg-emerald-50 text-emerald-600",
        },

        {
          label: "AI Reviews",
          value: "0",
          sub: "Coming soon",
          icon: "🤖",
          color: "bg-violet-50 text-violet-600",
        },
      ]);

    } catch (err) {

      console.error(err);

    }
  };

  return (
    <AppShell
      title="Dashboard"
      subtitle={`${projects.length} projects`}
      actions={
        <div className="flex gap-2">

          {/* SETTINGS */}
          <motion.button
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() =>
              navigate("/workspace/settings")
            }
          >
            ⚙️ Settings
          </motion.button>

          {/* NEW PROJECT */}
          <motion.button
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200"
            whileHover={{
              scale: 1.05,
              boxShadow:
                "0 8px 24px rgba(79,70,229,0.4)",
            }}
            whileTap={{ scale: 0.95 }}
            onClick={() =>
              navigate("/new-project")
            }
          >
            + New Project
          </motion.button>

        </div>
      }
    >
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >

        {/* STATS */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

          {stats.map((s, i) => (
            <StatCard
              key={i}
              stat={s}
            />
          ))}

        </div>

        {/* PROJECTS */}
        <div>

          <div className="mb-4 flex items-center justify-between">

            <h2 className="text-base font-bold text-gray-900">
              Projects
            </h2>

          </div>

          {/* GRID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

            {projects.map((p, i) => (

              <ProjectCard
                key={p.id}
                project={p}
                i={i}
              />

            ))}

          </div>

          {/* EMPTY */}
          {projects.length === 0 && (

            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">

              <p className="text-gray-500">
                No projects created yet.
              </p>

              <button
                onClick={() =>
                  navigate("/new-project")
                }
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Create First Project
              </button>

            </div>

          )}
        </div>

        {/* BOTTOM */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* ACTIVITY */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">

            <div className="mb-4 flex items-center justify-between">

              <h2 className="font-bold text-gray-900">
                Recent Activity
              </h2>

              <motion.button
                className="text-xs font-medium text-indigo-600 hover:underline"
                whileHover={{ x: 2 }}
              >
                View all →
              </motion.button>

            </div>

            <div className="space-y-3">

              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No activity yet. Create tasks and snippets to see activity here.</p>
              ) : recentActivity.map((a, i) => (

                <motion.div
                  key={i}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >

                  <div
                    className={`h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br ${getAvatarColor(a.user)} flex items-center justify-center text-xs font-bold text-white`}
                  >
                    {a.user[0]}
                  </div>

                  <div className="flex-1 min-w-0">

                    <p className="text-sm text-gray-700">

                      <span className="font-semibold">
                        {a.user}
                      </span>{" "}

                      {a.action}{" "}

                      <span className="font-medium text-indigo-600">
                        {a.target}
                      </span>

                    </p>

                  </div>

                  <span className="flex-shrink-0 text-xs text-gray-400">
                    {a.time}
                  </span>

                </motion.div>

              ))}

            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">

            <h2 className="mb-4 font-bold text-gray-900">
              Quick Actions
            </h2>

            <div className="space-y-2">

              {[
                {
                  label: "Open Kanban Board",
                  path: "/kanban",
                  icon: "📋",
                },

                {
                  label: "Browse Snippets",
                  path: "/snippets",
                  icon: "💻",
                },

                {
                  label: "Open Wiki",
                  path: "/wiki",
                  icon: "📄",
                },
              ].map((action, i) => (

                <motion.button
                  key={action.label}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                  onClick={() =>
                    navigate(action.path)
                  }
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.97 }}
                >

                  <span className="text-base">
                    {action.icon}
                  </span>

                  {action.label}

                </motion.button>

              ))}

            </div>
          </div>
        </div>
      </motion.div>
    </AppShell>
  );
}