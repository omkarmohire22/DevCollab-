import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const TYPE_COLORS = {
  task:    "bg-green-100 text-green-700 border border-green-200",
  comment: "bg-blue-100 text-blue-700 border border-blue-200",
  snippet: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  wiki:    "bg-teal-100 text-teal-700 border border-teal-200",
  member:  "bg-pink-100 text-pink-700 border border-pink-200",
  code:    "bg-amber-100 text-amber-700 border border-amber-200",
  ai:      "bg-violet-100 text-violet-700 border border-violet-200",
  whiteboard: "bg-orange-100 text-orange-700 border border-orange-200",
};

const TYPE_ICONS = {
  task:    "📋",
  comment: "💬",
  snippet: "💻",
  wiki:    "📄",
  member:  "👋",
  code:    "🔀",
  ai:      "🤖",
  whiteboard: "🎨",
};

const AVATAR_COLORS = [
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
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ActivityPage() {
  const [projectId, setProjectId] = useState(localStorage.getItem("projectId"));
  const { token, user } = useAuth();

  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);

  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [memberFilter, setMemberFilter] = useState("All Members");
  const [typeFilter, setTypeFilter] = useState("all");

  const profileMapRef = useRef(new Map());
  const projMapRef = useRef(new Map());

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // AUTO RESOLUTION OF PROJECT / WORKSPACE ID
  useEffect(() => {
    const resolveProject = async () => {
      let activeProjectId = projectId;
      if (!activeProjectId && token) {
        let workspaceId = localStorage.getItem("workspaceId");
        if (!workspaceId && user) {
          try {
            const { data: profile } = await supabase.from("profiles").select("id").eq("auth_id", user.id || user.auth_id).single();
            if (profile) {
              const { data: ws } = await supabase.from("workspaces").select("id").eq("owner_id", profile.id).limit(1).single();
              if (ws) { workspaceId = ws.id; localStorage.setItem("workspaceId", workspaceId); }
            }
          } catch (e) { console.error("Activity resolve workspace:", e); }
        }
        if (workspaceId) {
          try {
            const { data: proj } = await supabase.from("projects").select("id").eq("workspace_id", workspaceId).limit(1).single();
            if (proj) { activeProjectId = proj.id; localStorage.setItem("projectId", activeProjectId); setProjectId(activeProjectId); }
          } catch (e) { console.error("Activity resolve project:", e); }
        }
      }
    };
    resolveProject();
  }, [projectId, token, user]);

  // FETCH ALL ACTIVITY DATA
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const workspaceId = localStorage.getItem("workspaceId");

        // 1. Fetch all projects in workspace
        let allProjectIds = [];
        if (workspaceId) {
          const { data: projs } = await supabase.from("projects").select("id, name").eq("workspace_id", workspaceId);
          setProjects(projs || []);
          allProjectIds = (projs || []).map(p => p.id);
          (projs || []).forEach(p => projMapRef.current.set(p.id, p));
        }

        // 2. Fetch all profiles
        const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url, email");
        setMembers(profs || []);
        (profs || []).forEach(p => profileMapRef.current.set(p.id, p));

        // 3. Fetch activity feed for ALL projects in workspace
        let feedQuery = supabase.from("activity_feed").select("*").order("created_at", { ascending: false }).limit(200);

        if (allProjectIds.length > 0) {
          feedQuery = feedQuery.in("project_id", allProjectIds);
        }

        const { data: events, error } = await feedQuery;
        if (error) throw error;

        const enriched = (events || []).map(e => ({
          ...e,
          actor: profileMapRef.current.get(e.actor_id) || null,
          project: projMapRef.current.get(e.project_id) || null,
        }));

        setActivities(enriched);
      } catch (err) {
        console.error("Failed to load activity feed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, token]);

  // REAL-TIME SUBSCRIPTION — auto-append new events
  useEffect(() => {
    const workspaceId = localStorage.getItem("workspaceId");
    if (!workspaceId) return;

    const channel = supabase
      .channel("activity_feed_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" }, (payload) => {
        const newEvent = payload.new;
        const enriched = {
          ...newEvent,
          actor: profileMapRef.current.get(newEvent.actor_id) || null,
          project: projMapRef.current.get(newEvent.project_id) || null,
        };
        setActivities(prev => [enriched, ...prev]);
        setNewCount(c => c + 1);
        setTimeout(() => setNewCount(0), 3000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = activities.filter((a) => {
    const actorName = a.actor?.full_name || "System";
    const matchMember = memberFilter === "All Members" || actorName === memberFilter;
    const eventType = a.metadata?.type || "task";
    const matchType = typeFilter === "all" || eventType === typeFilter;
    // Project filter
    const matchProject = projectFilter === "All Projects" || a.project?.name === projectFilter;
    return matchMember && matchType && matchProject;
  });

  return (
    <AppShell
      title="Activity Feed"
      subtitle="All workspace actions · Live"
      actions={
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {newCount > 0 && (
              <motion.span
                className="rounded-full bg-green-500 px-2.5 py-0.5 text-[11px] font-bold text-white"
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
              >
                +{newCount} new
              </motion.span>
            )}
          </AnimatePresence>
          <motion.div className="h-2 w-2 rounded-full bg-green-500"
            animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.3, repeat: Infinity }} />
          <span className="text-xs text-gray-500 font-medium">Live Sync</span>
        </div>
      }
    >
      <div className="flex gap-5">
        {/* Filters sidebar */}
        <div className="w-52 flex-shrink-0 space-y-4">
          {/* Project filter */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Project</p>
            <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
              {["All Projects", ...projects.map(p => p.name)].map((p) => (
                <motion.button
                  key={p}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                    projectFilter === p ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                  whileHover={{ x: projectFilter === p ? 0 : 2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setProjectFilter(p)}
                >
                  {p}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Member filter */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Member</p>
            <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
              {["All Members", ...members.map(m => m.full_name)].map((m) => (
                <motion.button
                  key={m}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                    memberFilter === m ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                  whileHover={{ x: memberFilter === m ? 0 : 2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setMemberFilter(m)}
                >
                  {m}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Type filter */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Type</p>
            <div className="space-y-0.5">
              {[
                ["all",        "All Types"],
                ["task",       "Tasks"],
                ["comment",    "Comments"],
                ["snippet",    "Snippets"],
                ["wiki",       "Wiki"],
                ["whiteboard", "Whiteboard"],
                ["ai",         "AI Actions"],
                ["member",     "Members"],
              ].map(([val, label]) => (
                <motion.button
                  key={val}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                    typeFilter === val ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                  whileHover={{ x: typeFilter === val ? 0 : 2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setTypeFilter(val)}
                >
                  {label}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-600">
              {loading ? "Loading..." : `${filtered.length} events`}
            </p>
            {!loading && activities.length > 0 && (
              <span className="text-xs text-gray-400">{activities.length} total logged</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map((event, i) => {
                const actorName = event.actor?.full_name || "System";
                const eventType = event.metadata?.type || "task";
                const eventIcon = TYPE_ICONS[eventType] || "📋";
                const avatarBg = getAvatarColor(actorName);
                
                return (
                  <motion.div
                    key={event.id}
                    layout
                    className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16, scale: 0.95 }}
                    transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ x: 3, boxShadow: "0 6px 24px rgba(79,70,229,0.08)" }}
                  >
                    {/* Avatar */}
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarBg} text-xs font-bold text-white shadow-md`}>
                      {actorName[0]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-gray-700">
                          <span className="font-bold text-gray-900">{actorName}</span>{" "}
                          {event.action}{" "}
                          <span className="font-semibold text-indigo-600">{event.target}</span>
                        </p>
                        <span className="flex-shrink-0 text-xs text-gray-400">{timeAgo(event.created_at)}</span>
                      </div>
                      {event.metadata?.detail && (
                        <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">{event.metadata.detail}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[eventType] || "bg-gray-100 text-gray-500"}`}>
                          {eventIcon} {eventType}
                        </span>
                        {event.project?.name && (
                          <span className="text-[10px] text-gray-400">in {event.project.name}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {!loading && filtered.length === 0 && (
            <motion.div
              className="flex h-40 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 text-center p-6 text-gray-400"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <span className="text-3xl mb-2">📋</span>
              <p className="text-sm font-semibold">
                {activities.length === 0 ? "No activity yet" : "No activity matches your filters"}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                {activities.length === 0
                  ? "Start creating tasks, snippets, wiki pages, or comments — every action will appear here in real-time."
                  : "Try adjusting your filters or selecting a different project/member."}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
