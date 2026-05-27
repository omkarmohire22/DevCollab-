import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { chatWithAI } from "../services/ai.service";
import { AVATAR_COLORS } from "./KanbanPage";
import axios from "axios";

const MOODS = ["😄", "🙂", "😐", "😓", "🚀"];

function Sparkline({ data, color }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 32;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return x + "," + y;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={"0 0 " + w + " " + h}>
      <motion.polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }} />
    </svg>
  );
}

function BurnoutBar({ pct }) {
  const color = pct >= 70 ? "#ef4444" : pct >= 50 ? "#f59e0b" : "#22c55e";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-gray-400">Burnout Risk</span>
        <span className="font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: pct + "%" }}
          transition={{ duration: 1, ease: "easeOut" }} />
      </div>
    </div>
  );
}

function MemberCard({ member, i }) {
  const [mood, setMood] = useState(member.mood);
  const [showMoods, setShowMoods] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => { setMood(member.mood); }, [member.mood]);
  return (
    <motion.div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.08, duration: 0.5 }}
      whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.08)" }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={"flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br " + member.avatar + " text-sm font-bold text-white shadow-md"}>
            {member.name[0]}
          </div>
          <div>
            <p className="font-bold text-gray-900">{member.name}</p>
            <p className="text-xs text-gray-400">{member.role}</p>
          </div>
        </div>
        <div className="relative">
          <motion.button className="text-xl" whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
            onClick={() => setShowMoods(s => !s)}>{mood}</motion.button>
          <AnimatePresence>
            {showMoods && (
              <motion.div className="absolute right-0 top-8 z-10 flex gap-1 rounded-xl border border-gray-100 bg-white p-2 shadow-xl"
                initial={{ opacity: 0, scale: 0.8, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -8 }} transition={{ type: "spring", stiffness: 300 }}>
                {MOODS.map(m => (
                  <motion.button key={m} className="text-xl" whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.9 }}
                    onClick={() => { setMood(m); setShowMoods(false); }}>{m}</motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Tasks", val: member.tasks, color: "text-gray-900" },
          { label: "Done", val: member.done, color: "text-green-600" },
          { label: "Overdue", val: member.overdue, color: member.overdue > 0 ? "text-red-500" : "text-gray-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-gray-50 py-2">
            <p className={"text-xl font-extrabold " + s.color}>{s.val}</p>
            <p className="text-[10px] text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-indigo-50 px-2 py-1.5 text-center">
          <p className="text-xs font-bold text-indigo-700">{member.completionRate || 0}%</p>
          <p className="text-[9px] text-indigo-500">Completion</p>
        </div>
        <div className="rounded-lg bg-green-50 px-2 py-1.5 text-center">
          <p className="text-xs font-bold text-green-700">{member.velocity7d || 0}/wk</p>
          <p className="text-[9px] text-green-500">Velocity</p>
        </div>
        <div className="rounded-lg bg-amber-50 px-2 py-1.5 text-center">
          <p className="text-xs font-bold text-amber-700">{member.onTimeRate || 100}%</p>
          <p className="text-[9px] text-amber-500">On-Time</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-400 mb-1">Activity (7d)</p>
          <Sparkline data={member.sparkline} color={member.burnout >= 70 ? "#ef4444" : "#4f46e5"} />
        </div>
        <div className="w-28"><BurnoutBar pct={member.burnout} /></div>
      </div>
      {member.burnout >= 70 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
          <span>🔥</span>
          <p className="text-[11px] font-semibold text-red-600">High burnout risk — consider reassigning tasks</p>
        </div>
      )}
      <button className="mt-3 w-full rounded-lg bg-gray-50 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
        onClick={() => setShowDetails(!showDetails)}>
        {showDetails ? "Hide Details ▲" : "Show Details ▼"}
      </button>
      {showDetails && (
        <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-3">
          <div className="flex justify-between text-xs"><span className="text-gray-500">In Progress:</span><span className="font-bold text-gray-700">{member.inProgress || 0}</span></div>
          <div className="flex justify-between text-xs"><span className="text-gray-500">High Priority:</span><span className="font-bold text-gray-700">{member.highPriority || 0}</span></div>
          <div className="flex justify-between text-xs"><span className="text-gray-500">Avg Completion:</span><span className="font-bold text-gray-700">{member.avgCompletionDays || 0} days</span></div>
          <div className="flex justify-between text-xs"><span className="text-gray-500">30d Velocity:</span><span className="font-bold text-gray-700">{member.velocity30d || 0} tasks</span></div>
        </div>
      )}
    </motion.div>
  );
}

export default function DevPulsePage() {
  const [projectId, setProjectId] = useState(localStorage.getItem("projectId"));
  const { token, user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [digest, setDigest] = useState(null);
  const [overviewStats, setOverviewStats] = useState({
    avgBurnout: 0, tasksDone: 0, totalTasks: 0, overdue: 0,
    mood: "😄 Good", avgCompletionRate: 0, highBurnoutMembers: 0,
  });

  const buildFromTasks = (tasks, now) => {
    const map = {};
    tasks.forEach(t => {
      const name = t.assignee || "Unassigned";
      if (name === "Unassigned") return;
      if (!map[name]) map[name] = {
        assignee_name: name, assignee_id: t.assignee_id,
        total_tasks: 0, completed_tasks: 0, in_progress_tasks: 0,
        todo_tasks: 0, overdue_tasks: 0, tasks_last_7_days: 0,
        tasks_last_30_days: 0, high_priority_tasks: 0,
        completion_rate: 0, velocity_7d: 0, velocity_30d: 0,
        burnout_score: 0, on_time_rate: 100, avg_completion_days: 0,
      };
      const m = map[name];
      m.total_tasks++;
      if (t.status === "done") {
        m.completed_tasks++;
        const upd = new Date(t.updated_at || t.created_at);
        if (upd >= new Date(now.getTime() - 7 * 86400000)) m.tasks_last_7_days++;
        if (upd >= new Date(now.getTime() - 30 * 86400000)) m.tasks_last_30_days++;
      } else if (t.status === "in-progress") {
        m.in_progress_tasks++;
      } else {
        m.todo_tasks++;
      }
      if (t.status !== "done" && t.due_date && new Date(t.due_date) < now) m.overdue_tasks++;
      if (t.priority === "P0" || t.priority === "P1") m.high_priority_tasks++;
    });
    return Object.values(map).map(m => {
      if (m.total_tasks > 0) m.completion_rate = Math.round((m.completed_tasks / m.total_tasks) * 100);
      const open = m.total_tasks - m.completed_tasks;
      m.burnout_score = Math.min(100, (m.overdue_tasks * 20) + (m.high_priority_tasks * 10) + (m.in_progress_tasks * 5) + Math.min(open * 8, 40));
      m.velocity_7d = m.tasks_last_7_days;
      m.velocity_30d = m.tasks_last_30_days;
      return m;
    });
  };

  const fetchTeamPulse = async (projId) => {
    setLoading(true);
    const targetProjId = projId || projectId;
    try {
      if (!token || !targetProjId) { setLoading(false); return; }
      const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
      let member_stats = [];
      let team_agg = { avg_burnout: 0, completed_tasks: 0, total_tasks: 0, overdue_tasks: 0, avg_completion_rate: 0, high_burnout_members: 0 };
      try {
        const r = await axios.get(API + "/tasks/analytics?projectId=" + targetProjId, { headers: { Authorization: "Bearer " + token } });
        member_stats = r.data?.member_stats || [];
        team_agg = r.data?.team_aggregates || team_agg;
      } catch (e) { console.warn("analytics fallback:", e.message); }
      const wsId = localStorage.getItem("workspaceId");
      let wsMems = [];
      if (wsId) {
        try {
          const r = await axios.get(API + "/workspaces/" + wsId + "/members", { headers: { Authorization: "Bearer " + token } });
          wsMems = r.data?.members || [];
        } catch (e) { console.warn("ws members:", e.message); }
      }
      const { data: tasks } = await supabase.from("tasks").select("*").eq("project_id", targetProjId);
      const now = new Date();
      if (member_stats.length === 0 && tasks && tasks.length > 0) {
        member_stats = buildFromTasks(tasks, now);
        const tot = member_stats.length;
        team_agg = {
          avg_burnout: tot ? Math.round(member_stats.reduce((s, m) => s + m.burnout_score, 0) / tot) : 0,
          completed_tasks: tasks.filter(t => t.status === "done").length,
          total_tasks: tasks.length,
          overdue_tasks: tasks.filter(t => t.status !== "done" && t.due_date && new Date(t.due_date) < now).length,
          avg_completion_rate: tot ? Math.round(member_stats.reduce((s, m) => s + m.completion_rate, 0) / tot) : 0,
          high_burnout_members: member_stats.filter(m => m.burnout_score >= 70).length,
        };
      }
      const memberList = member_stats.map(stat => {
        const wm = wsMems.find(w => w.name === stat.assignee_name);
        const mt = (tasks || []).filter(t => t.assignee === stat.assignee_name);
        const sparkline = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          sparkline.push(mt.filter(t => new Date(t.updated_at || t.created_at || now).toDateString() === d.toDateString()).length);
        }
        let mood = "🚀";
        if (stat.burnout_score >= 70) mood = "😓";
        else if (stat.burnout_score >= 50) mood = "😐";
        else if (stat.burnout_score >= 30) mood = "🙂";
        return {
          name: stat.assignee_name,
          role: wm?.role || "Developer",
          avatar: AVATAR_COLORS[stat.assignee_name] || "from-indigo-400 to-blue-500",
          mood, tasks: stat.total_tasks, done: stat.completed_tasks, overdue: stat.overdue_tasks,
          inProgress: stat.in_progress_tasks, highPriority: stat.high_priority_tasks,
          completionRate: stat.completion_rate, velocity7d: stat.velocity_7d, velocity30d: stat.velocity_30d,
          onTimeRate: stat.on_time_rate, avgCompletionDays: stat.avg_completion_days,
          burnout: stat.burnout_score, sparkline: sparkline.length ? sparkline : [0, 0, 0, 0, 0, 0, 0],
        };
      });
      let teamMood = "😄 Good";
      if (team_agg.avg_burnout >= 70) teamMood = "🚨 Critical";
      else if (team_agg.avg_burnout >= 50) teamMood = "😐 Stressed";
      setMembers(memberList);
      setOverviewStats({
        avgBurnout: team_agg.avg_burnout, tasksDone: team_agg.completed_tasks,
        totalTasks: team_agg.total_tasks, overdue: team_agg.overdue_tasks,
        mood: teamMood, avgCompletionRate: team_agg.avg_completion_rate,
        highBurnoutMembers: team_agg.high_burnout_members,
      });
    } catch (err) {
      console.error("fetchTeamPulse:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const resolve = async () => {
      let pid = projectId;
      if (!pid && token) {
        let wsId = localStorage.getItem("workspaceId");
        if (!wsId && user) {
          try {
            const { data: p } = await supabase.from("profiles").select("id").eq("auth_id", user.id || user.auth_id).single();
            if (p) {
              const { data: ws } = await supabase.from("workspaces").select("id").eq("owner_id", p.id).limit(1).single();
              if (ws) { wsId = ws.id; localStorage.setItem("workspaceId", wsId); }
            }
          } catch (e) { console.warn(e.message); }
        }
        if (wsId) {
          try {
            const { data: proj } = await supabase.from("projects").select("id").eq("workspace_id", wsId).limit(1).single();
            if (proj) { pid = proj.id; localStorage.setItem("projectId", pid); setProjectId(pid); }
          } catch (e) { console.warn(e.message); }
        }
      }
      if (pid && token) fetchTeamPulse(pid);
      else setLoading(false);
    };
    resolve();
  }, [projectId, token, user]);

  const generateDigest = async () => {
    if (!projectId) return;
    setGenerating(true); setDigest(null);
    try {
      const prompt = "Generate a professional Weekly Team Health Digest. Analyze member performance, velocity trends, burnout risks, overdue items, and provide specific actionable recommendations. Use developer-friendly tone with Markdown and emojis.";
      const context = {
        members: members.map(m => ({ name: m.name, tasks: m.tasks, done: m.done, overdue: m.overdue, burnout: m.burnout, completionRate: m.completionRate, velocity: m.velocity7d, onTimeRate: m.onTimeRate })),
        teamStats: overviewStats,
      };
      const { reply } = await chatWithAI(prompt, context);
      setDigest(reply);
    } catch (err) {
      console.error("AI digest:", err);
      alert("Failed to generate digest: " + err.message);
    } finally { setGenerating(false); }
  };

  const statCards = [
    { label: "Team Mood", value: overviewStats.mood, color: overviewStats.mood.includes("Critical") ? "text-red-600" : "text-green-600", bg: overviewStats.mood.includes("Critical") ? "bg-red-50" : "bg-green-50" },
    { label: "Avg Burnout", value: overviewStats.avgBurnout + "%", color: overviewStats.avgBurnout >= 50 ? "text-amber-600" : "text-green-600", bg: overviewStats.avgBurnout >= 50 ? "bg-amber-50" : "bg-green-50" },
    { label: "Tasks Done", value: overviewStats.tasksDone + "/" + overviewStats.totalTasks, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Overdue", value: String(overviewStats.overdue), color: overviewStats.overdue > 0 ? "text-red-600" : "text-green-600", bg: overviewStats.overdue > 0 ? "bg-red-50" : "bg-green-50" },
    { label: "Avg Completion", value: overviewStats.avgCompletionRate + "%", color: "text-blue-600", bg: "bg-blue-50" },
  ];

  return (
    <AppShell title="Dev Pulse" subtitle="Team health dashboard · Live performance metrics"
      actions={projectId && (
        <motion.button className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md"
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={generateDigest} disabled={generating}>
          {generating ? (
            <><motion.div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
              animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />Generating...</>
          ) : "✨ Generate Weekly Digest"}
        </motion.button>
      )}>
      {!projectId ? (
        <div className="flex flex-col items-center justify-center text-center bg-white border border-gray-100 rounded-2xl shadow-sm h-full p-12">
          <span className="text-4xl mb-3">⚡</span>
          <h2 className="text-xl font-bold text-gray-700">No Active Project</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">Please select or create a project from the Dashboard first.</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center text-center bg-white border border-gray-100 rounded-2xl shadow-sm h-full p-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"></div>
          <p className="mt-4 text-sm text-gray-400">Loading team pulse metrics...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center bg-white border border-gray-100 rounded-2xl shadow-sm h-full p-12">
          <span className="text-4xl mb-3">👥</span>
          <h2 className="text-xl font-bold text-gray-700">No Team Members Found</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">Assign tasks to members in Kanban, or invite members from <strong>Workspace Settings</strong>.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {statCards.map((s, i) => (
              <motion.div key={s.label} className={"rounded-2xl border border-gray-100 " + s.bg + " p-4"}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={"mt-1 text-xl font-extrabold truncate " + s.color}>{s.value}</p>
              </motion.div>
            ))}
          </div>
          {overviewStats.highBurnoutMembers > 0 && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <p className="font-bold text-amber-700">{overviewStats.highBurnoutMembers} member{overviewStats.highBurnoutMembers > 1 ? "s" : ""} at high burnout risk</p>
                <span className="ml-auto text-xs text-amber-600">Consider workload redistribution</span>
              </div>
            </div>
          )}
          {members.filter(m => m.overdue > 0).length > 0 && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <span>⚠️</span>
                <p className="font-bold text-red-700">Overdue Task Warnings</p>
                <span className="ml-auto rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-bold text-white">{members.reduce((s, m) => s + m.overdue, 0)} overdue</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {members.filter(m => m.overdue > 0).map(m => (
                  <div key={m.name} className="flex items-center gap-2 rounded-xl bg-white border border-red-100 px-3 py-2">
                    <div className={"flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br " + m.avatar + " text-[10px] font-bold text-white"}>{m.name[0]}</div>
                    <span className="text-xs font-semibold text-red-700">{m.name}</span>
                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">{m.overdue} overdue</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {members.map((m, i) => <MemberCard key={m.name} member={m} i={i} />)}
          </div>
          <AnimatePresence>
            {digest && (
              <motion.div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <h3 className="font-bold text-indigo-900">AI Weekly Digest</h3>
                  <span className="ml-auto rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white">AI Generated</span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-indigo-800">{digest}</pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AppShell>
  );
}
