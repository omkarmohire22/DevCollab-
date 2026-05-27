import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import AppShell from "../components/AppShell";
import { chatWithAI, reviewCode as reviewCodeAPI, breakdownFeature, generateSprintPlan } from "../services/ai.service.js";
import { PRIORITY_COLORS, LABEL_COLORS, AVATAR_COLORS } from "./KanbanPage.jsx";
import { supabase } from "../lib/supabase";

/* ── Quick actions for the chat tab ── */
const QUICK_ACTIONS = [
  { label: "Summarise this project",  icon: "📊", prompt: "Summarise the current project status and progress." },
  { label: "What's blocking us?",     icon: "🚧", prompt: "Identify tasks that have been In Progress for too long and what might be blocking them." },
  { label: "Generate standup report", icon: "📋", prompt: "Generate a daily standup report based on task movement in the last 24 hours." },
];

const INIT_MESSAGES = [
  {
    role: "assistant",
    text: "Hey! I'm your AI Project Assistant 🤖\n\nI can help you:\n• Summarise project progress\n• Identify blockers\n• Generate standup reports\n• Break down features into tasks\n• Review code snippets\n\nWhat would you like to do?",
    time: "just now",
  },
];

/* ── Typing indicator ── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-indigo-400"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

/* ── Chat message bubble ── */
function Message({ msg }) {
  const isAI = msg.role === "assistant";
  return (
    <motion.div
      className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-sm ${
        isAI
          ? "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-indigo-200"
          : "bg-gradient-to-br from-indigo-400 to-blue-500"
      }`}>
        {isAI ? "🤖" : "RK"}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isAI
          ? "bg-white border border-gray-100 shadow-sm text-gray-700"
          : "bg-indigo-600 text-white shadow-md shadow-indigo-200"
      }`}>
        <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
        <p className={`mt-1.5 text-[10px] ${isAI ? "text-gray-400" : "text-indigo-200"}`}>{msg.time}</p>
      </div>
    </motion.div>
  );
}

/* ── Single subtask card ── */
function SubtaskCard({ task, index, added, onAdd }) {
  return (
    <motion.div
      className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[task.priority] ?? "bg-gray-100 text-gray-500"}`}>
          {task.priority}
        </span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${LABEL_COLORS[task.label] ?? "bg-gray-100 text-gray-500"}`}>
          {task.label}
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-800 leading-snug">{task.title}</p>
      {task.description && (
        <p className="mt-1 text-xs text-gray-400 line-clamp-2">{task.description}</p>
      )}
      <div className="mt-3 flex justify-end">
        <motion.button
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            added
              ? "bg-green-100 text-green-700 cursor-default"
              : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          }`}
          whileTap={added ? {} : { scale: 0.95 }}
          onClick={() => !added && onAdd(index)}
          disabled={added}
        >
          {added ? "✓ Added to Kanban" : "+ Add to Kanban"}
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── Main page ── */
export default function AIAssistantPage() {
  // Chat state
  const [messages, setMessages]         = useState(INIT_MESSAGES);
  const [input, setInput]               = useState("");
  const [typing, setTyping]             = useState(false);

  // Code review state
  const [codeInput, setCodeInput]       = useState("");
  const [reviewing, setReviewing]       = useState(false);
  const [reviewResult, setReviewResult] = useState(null);

  // Task breakdown state
  const [featureInput, setFeatureInput]     = useState("");
  const [breaking, setBreaking]             = useState(false);
  const [breakdownTasks, setBreakdownTasks] = useState([]);
  const [breakdownError, setBreakdownError] = useState(null);
  const [addedIndexes, setAddedIndexes]     = useState(new Set());

  // Sprint planner state
  const [sprintDays, setSprintDays]         = useState(14);
  const [planning, setPlanning]             = useState(false);
  const [sprintPlan, setSprintPlan]         = useState(null);
  const [sprintError, setSprintError]       = useState(null);

  // Dynamic context stats state
  const [contextStats, setContextStats]     = useState({ tasks: 0, wikis: 0, snippets: 0, members: 0 });

  const [tab, setTab] = useState("chat");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // LOAD DYNAMIC DATABASE STATS
  useEffect(() => {
    const loadContextStats = async () => {
      const projectId = localStorage.getItem("projectId");
      if (!projectId) return;
      try {
        const [
          { count: taskCount },
          { count: wikiCount },
          { count: snippetCount },
          { count: memberCount }
        ] = await Promise.all([
          supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", projectId),
          supabase.from("wiki_pages").select("id", { count: "exact", head: true }).eq("project_id", projectId),
          supabase.from("snippets").select("id", { count: "exact", head: true }).eq("project_id", projectId),
          supabase.from("project_members").select("id", { count: "exact", head: true }).eq("project_id", projectId)
        ]);

        setContextStats({
          tasks: taskCount || 0,
          wikis: wikiCount || 0,
          snippets: snippetCount || 0,
          members: memberCount || 1 // Fallback to 1 representing the current user
        });
      } catch (err) {
        console.error("Error loading AI context stats:", err);
      }
    };
    loadContextStats();
  }, [tab]);

  /* ── Send chat message with full database context ── */
  const sendMessage = async (text) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text: text.trim(), time: "just now" }]);
    setInput("");
    setTyping(true);
    
    try {
      const projectId = localStorage.getItem("projectId");
      let projectContext = null;
      
      if (projectId) {
        // Query active project, tasks, wikis, and snippets to load dynamic AI context
        const [
          { data: projectInfo },
          { data: tasksList },
          { data: wikiList },
          { data: snippetList }
        ] = await Promise.all([
          supabase.from("projects").select("*").eq("id", projectId).single(),
          supabase.from("tasks").select("title, status, priority, label, due_date").eq("project_id", projectId),
          supabase.from("wiki_pages").select("title").eq("project_id", projectId),
          supabase.from("snippets").select("title, language").eq("project_id", projectId)
        ]);

        projectContext = {
          projectName: projectInfo?.name || "Unknown Project",
          description: projectInfo?.description || "",
          tasks: tasksList || [],
          wikiPagesCount: wikiList?.length || 0,
          wikiPages: (wikiList || []).map(w => w.title),
          snippetsCount: snippetList?.length || 0,
          snippets: (snippetList || []).map(s => `${s.title} (${s.language})`)
        };
      }

      const { reply } = await chatWithAI(text.trim(), projectContext);
      setMessages((m) => [...m, { role: "assistant", text: reply, time: "just now" }]);
    } catch (err) {
      console.error("AI chat error:", err);
      setMessages((m) => [...m, { role: "assistant", text: `⚠️ ${err.message}`, time: "just now" }]);
    } finally {
      setTyping(false);
    }
  };

  /* ── Review code ── */
  const reviewCode = async () => {
    if (!codeInput.trim()) return;
    setReviewing(true);
    setReviewResult(null);
    try {
      const result = await reviewCodeAPI(codeInput);
      setReviewResult(result);
    } catch (err) {
      setReviewResult({
        score: 0,
        issues: [{ type: "bug", severity: "high", text: `⚠️ ${err.message}` }],
      });
    } finally {
      setReviewing(false);
    }
  };

  /* ── Break down feature into subtasks ── */
  const runBreakdown = async () => {
    if (!featureInput.trim()) return;
    setBreaking(true);
    setBreakdownTasks([]);
    setBreakdownError(null);
    setAddedIndexes(new Set());
    try {
      const { tasks } = await breakdownFeature(featureInput.trim());
      setBreakdownTasks(tasks);
    } catch (err) {
      setBreakdownError(err.message);
    } finally {
      setBreaking(false);
    }
  };

  /* ── Save a subtask to Kanban in database ── */
  const markAdded = async (index) => {
    const task = breakdownTasks[index];
    if (!task) return;

    const projectId = localStorage.getItem("projectId");
    if (!projectId) {
      alert("No active project found. Please select or create a project first.");
      return;
    }

    try {
      const { error } = await supabase.from("tasks").insert([
        {
          title: task.title,
          description: task.description || "",
          priority: task.priority || "P2",
          label: task.label || "Frontend",
          status: "todo",
          project_id: projectId,
        },
      ]);

      if (error) {
        console.error("Supabase insert error:", error);
        alert(error.message);
        return;
      }

      setAddedIndexes((prev) => new Set([...prev, index]));
    } catch (err) {
      console.error(err);
      alert("Failed to add task to Kanban");
    }
  };

  /* ── Save all subtasks to Kanban in database ── */
  const handleAddAll = async () => {
    const projectId = localStorage.getItem("projectId");
    if (!projectId) {
      alert("No active project found. Please select or create a project first.");
      return;
    }

    const tasksToInsert = breakdownTasks.map((task) => ({
      title: task.title,
      description: task.description || "",
      priority: task.priority || "P2",
      label: task.label || "Frontend",
      status: "todo",
      project_id: projectId,
    }));

    try {
      const { error } = await supabase.from("tasks").insert(tasksToInsert);
      if (error) {
        console.error("Supabase bulk insert error:", error);
        alert(error.message);
        return;
      }
      setAddedIndexes(new Set(breakdownTasks.map((_, i) => i)));
    } catch (err) {
      console.error(err);
      alert("Failed to add all tasks to Kanban");
    }
  };

  /* ── Generate AI sprint plan from REAL Kanban backlog in Supabase ── */
  const runSprintPlan = async () => {
    setPlanning(true);
    setSprintPlan(null);
    setSprintError(null);

    const projectId = localStorage.getItem("projectId");
    if (!projectId) {
      alert("No active project found. Please select or create a project first.");
      setPlanning(false);
      return;
    }

    try {
      // Query real tasks from database for active project
      const { data: realTasks, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId);

      if (taskError) {
        console.error("Supabase tasks fetch error for sprint planner:", taskError);
        throw taskError;
      }

      if (!realTasks || realTasks.length === 0) {
        throw new Error("No tasks found in your project backlog. Please create some tasks first in the Kanban board!");
      }

      // Map Supabase tasks to the backlog format expected by generateSprintPlan
      const backlog = realTasks.map(t => ({
        title: t.title,
        priority: t.priority || "P2",
        label: t.label || "Frontend",
        assignee: t.assignee || "Unassigned"
      }));

      const result = await generateSprintPlan(backlog, sprintDays);
      setSprintPlan(result);
    } catch (err) {
      setSprintError(err.message);
    } finally {
      setPlanning(false);
    }
  };

  return (
    <AppShell title="AI Assistant" subtitle="Powered by Groq LLaMA · Project context loaded">
      <div className="flex gap-5 h-[calc(100vh-140px)]">

        {/* ── Left panel: tabs ── */}
        <div className="flex flex-1 flex-col rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-gray-100">
            {[
              { id: "chat",      label: "💬 Chat" },
              { id: "breakdown", label: "⚡ Task Breakdown" },
              { id: "sprint",    label: "🗓 Sprint Planner" },
              { id: "review",    label: "🔍 Code Review" },
            ].map((t) => (
              <motion.button
                key={t.id}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  tab === t.id
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                whileTap={{ scale: 0.97 }}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </motion.button>
            ))}
          </div>

          {/* ── Chat tab ── */}
          {tab === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 p-5">
                {messages.map((msg, i) => <Message key={i} msg={msg} />)}
                {typing && (
                  <motion.div className="flex gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm">🤖</div>
                    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                      <TypingDots />
                    </div>
                  </motion.div>
                )}
                <div ref={bottomRef} />
              </div>
              <div className="border-t border-gray-100 p-4">
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Ask anything about your project..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                  />
                  <motion.button
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => sendMessage(input)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                    </svg>
                  </motion.button>
                </div>
              </div>
            </>
          )}

          {/* ── Task Breakdown tab ── */}
          {tab === "breakdown" && (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">

              {/* Input area */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Describe the feature you want to break down
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    placeholder="e.g. Build a payment system, Add dark mode, User notifications..."
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runBreakdown()}
                  />
                  <motion.button
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all ${
                      breaking || !featureInput.trim()
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-indigo-600 shadow-indigo-200"
                    }`}
                    whileHover={!breaking && featureInput.trim() ? { scale: 1.04 } : {}}
                    whileTap={!breaking && featureInput.trim() ? { scale: 0.96 } : {}}
                    onClick={runBreakdown}
                    disabled={breaking || !featureInput.trim()}
                  >
                    {breaking ? (
                      <>
                        <motion.div
                          className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        />
                        Generating...
                      </>
                    ) : (
                      <>⚡ Generate Tasks</>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Error state */}
              {breakdownError && (
                <motion.div
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                >
                  ⚠️ {breakdownError}
                </motion.div>
              )}

              {/* Results */}
              <AnimatePresence>
                {breakdownTasks.length > 0 && (
                  <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        {breakdownTasks.length} subtasks generated
                      </p>
                      <motion.button
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-200"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handleAddAll}
                      >
                        + Add All to Kanban
                      </motion.button>
                    </div>

                    {/* Subtask cards */}
                    {breakdownTasks.map((task, i) => (
                      <SubtaskCard
                        key={i}
                        task={task}
                        index={i}
                        added={addedIndexes.has(i)}
                        onAdd={markAdded}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty state */}
              {!breaking && breakdownTasks.length === 0 && !breakdownError && (
                <motion.div
                  className="flex flex-1 flex-col items-center justify-center gap-3 text-center py-12"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                >
                  <span className="text-4xl">⚡</span>
                  <p className="text-sm font-semibold text-gray-700">AI Task Breakdown</p>
                  <p className="text-xs text-gray-400 max-w-xs">
                    Describe any feature and the AI will auto-generate prioritised subtasks ready to add to your Kanban board.
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {/* ── Sprint Planner tab ── */}
          {tab === "sprint" && (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">

              {/* Controls */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Sprint Duration</label>
                  <div className="flex gap-2">
                    {[7, 14, 21].map((d) => (
                      <button key={d}
                        className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-all ${
                          sprintDays === d
                            ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                            : "border-gray-200 bg-white text-gray-500 hover:border-indigo-300"
                        }`}
                        onClick={() => setSprintDays(d)}
                      >
                        {d} days
                      </button>
                    ))}
                  </div>
                </div>
                <motion.button
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all ${
                    planning ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 shadow-indigo-200"
                  }`}
                  whileHover={!planning ? { scale: 1.04 } : {}}
                  whileTap={!planning ? { scale: 0.96 } : {}}
                  onClick={runSprintPlan}
                  disabled={planning}
                >
                  {planning ? (
                    <>
                      <motion.div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                        animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                      Planning...
                    </>
                  ) : "🗓 Generate Sprint Plan"}
                </motion.button>
              </div>

              {/* Error */}
              {sprintError && (
                <motion.div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  ⚠️ {sprintError}
                </motion.div>
              )}

              {/* Sprint plan results */}
              <AnimatePresence>
                {sprintPlan && (
                  <motion.div className="space-y-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                    {/* Summary card */}
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Sprint Summary</p>
                        <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                          {sprintPlan.totalEffort}
                        </span>
                      </div>
                      <p className="text-sm text-indigo-800 leading-relaxed">{sprintPlan.summary}</p>
                    </div>

                    {/* Day-by-day plan */}
                    {sprintPlan.plan?.map((dayPlan, i) => (
                      <motion.div key={i}
                        className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        {/* Day header */}
                        <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50 px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                              {dayPlan.day}
                            </span>
                            <span className="text-sm font-bold text-gray-700">{dayPlan.date}</span>
                          </div>
                          <span className="text-xs text-gray-400 italic">{dayPlan.focus}</span>
                        </div>

                        {/* Tasks for this day */}
                        <div className="divide-y divide-gray-50">
                          {dayPlan.tasks?.map((task, j) => (
                            <div key={j} className="flex items-center gap-3 px-4 py-2.5">
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[task.priority] ?? "bg-gray-100 text-gray-500"}`}>
                                {task.priority}
                              </span>
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${LABEL_COLORS[task.label] ?? "bg-gray-100 text-gray-500"}`}>
                                {task.label}
                              </span>
                              <p className="flex-1 text-sm text-gray-700 truncate">{task.title}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400">{task.effort} pts</span>
                                <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[task.assignee] ?? "from-gray-300 to-gray-400"} text-[9px] font-bold text-white`}>
                                  {task.assignee?.[0] ?? "?"}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty state */}
              {!planning && !sprintPlan && !sprintError && (
                <motion.div className="flex flex-1 flex-col items-center justify-center gap-3 text-center py-12"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <span className="text-4xl">🗓</span>
                  <p className="text-sm font-semibold text-gray-700">AI Sprint Planner</p>
                  <p className="text-xs text-gray-400 max-w-xs">
                    Select a sprint duration and let the AI estimate effort, group tasks by priority, and generate a day-by-day sprint timeline.
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {/* ── Code Review tab ── */}
          {tab === "review" && (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">Paste your code below</label>
                <textarea
                  className="w-full rounded-xl border border-gray-200 p-4 font-mono text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                  rows={10}
                  placeholder="// Paste your code here..."
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  style={{ background: "#0f172a", color: "#e2e8f0" }}
                />
              </div>
              <motion.button
                className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-md shadow-violet-200"
                whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(124,58,237,0.4)" }}
                whileTap={{ scale: 0.97 }}
                onClick={reviewCode}
                disabled={reviewing}
              >
                {reviewing ? (
                  <>
                    <motion.div
                      className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    Analysing...
                  </>
                ) : "🔍 Review Code with AI"}
              </motion.button>

              <AnimatePresence>
                {reviewResult && (
                  <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Score ring */}
                    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <div className="relative h-16 w-16">
                        <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                          <motion.circle
                            cx="18" cy="18" r="15.9" fill="none" stroke="#7c3aed" strokeWidth="3"
                            strokeDasharray="100" strokeLinecap="round"
                            initial={{ strokeDashoffset: 100 }}
                            animate={{ strokeDashoffset: 100 - reviewResult.score * 10 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-extrabold text-gray-900">{reviewResult.score}</span>
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Quality Score: {reviewResult.score}/10</p>
                        <p className="text-sm text-gray-500">{reviewResult.issues.length} issues found</p>
                      </div>
                    </div>

                    {/* Issue cards */}
                    {reviewResult.issues.map((issue, i) => {
                      const colors = {
                        high:   "border-red-200 bg-red-50",
                        medium: "border-amber-200 bg-amber-50",
                        low:    "border-gray-200 bg-gray-50",
                      };
                      const icons = { bug: "🐛", perf: "⚡", security: "🔒", style: "✨" };
                      return (
                        <motion.div
                          key={i}
                          className={`rounded-xl border p-3.5 ${colors[issue.severity]}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-base">{icons[issue.type] ?? "💡"}</span>
                            <div>
                              <span className={`text-[10px] font-bold uppercase ${
                                issue.severity === "high"   ? "text-red-600"   :
                                issue.severity === "medium" ? "text-amber-600" : "text-gray-500"
                              }`}>
                                {issue.severity} · {issue.type}
                              </span>
                              <p className="mt-0.5 text-sm text-gray-700">{issue.text}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── Right panel: quick actions + context ── */}
        <div className="w-64 flex-shrink-0 space-y-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Quick Actions</p>
            <div className="space-y-2">
              {QUICK_ACTIONS.map((action, i) => (
                <motion.button
                  key={i}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setTab("chat"); sendMessage(action.prompt); }}
                >
                  <span className="text-base">{action.icon}</span>
                  {action.label}
                </motion.button>
              ))}
              {/* Breakdown shortcut */}
              <motion.button
                className="flex w-full items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setTab("breakdown")}
              >
                <span className="text-base">⚡</span>
                Break down a feature
              </motion.button>
              {/* Sprint planner shortcut */}
              <motion.button
                className="flex w-full items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setTab("sprint")}
              >
                <span className="text-base">🗓</span>
                Plan next sprint
              </motion.button>
            </div>
          </div>

          {/* Context loaded */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="mb-2 text-xs font-bold text-indigo-700">Context Loaded</p>
            {[
              `${contextStats.tasks} tasks`,
              `${contextStats.wikis} wiki pages`,
              `${contextStats.snippets} snippets`,
              `${contextStats.members} members`,
              "Sprint backlog synced"
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 py-1">
                <motion.div
                  className="h-1.5 w-1.5 rounded-full bg-indigo-500"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: Math.random() }}
                />
                <span className="text-xs text-indigo-600">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
