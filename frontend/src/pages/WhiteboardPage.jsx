import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { analyzeWhiteboard } from "../services/ai.service";

/* ─── tool config ─── */
const TOOLS = [
  { id: "pen",      label: "Pen",       icon: "✏️" },
  { id: "marker",   label: "Marker",    icon: "🖊️" },
  { id: "rect",     label: "Rectangle", icon: "⬜" },
  { id: "circle",   label: "Circle",    icon: "⭕" },
  { id: "arrow",    label: "Arrow",     icon: "➡️" },
  { id: "text",     label: "Text",      icon: "T"  },
  { id: "eraser",   label: "Eraser",    icon: "🧹" },
];

const COLORS = [
  "#1e1e2e", "#4f46e5", "#7c3aed", "#ec4899",
  "#ef4444", "#f59e0b", "#22c55e", "#06b6d4",
  "#ffffff",
];

const SIZES = [2, 4, 8, 14, 22];

/* ─── AI responses keyed by drawing content ─── */
const AI_ANALYSIS = [
  {
    title: "Microservices Architecture",
    description: "Your diagram shows a distributed microservices setup with a client layer, API gateway, and multiple backend services. The flow suggests event-driven communication between services.",
    suggestions: [
      "Add a message queue (Redis/RabbitMQ) between services to decouple them",
      "Include a service discovery layer (Consul/Eureka) for dynamic routing",
      "Add a circuit breaker pattern to handle service failures gracefully",
      "Consider adding a CDN layer before the client for static assets",
    ],
    tasks: [
      { title: "Set up API Gateway with rate limiting",   priority: "P0", label: "Backend"  },
      { title: "Implement Redis message queue",           priority: "P0", label: "Backend"  },
      { title: "Add circuit breaker to all services",    priority: "P1", label: "Backend"  },
      { title: "Configure service discovery with Consul", priority: "P1", label: "DevOps"   },
      { title: "Set up CDN for static assets",           priority: "P2", label: "DevOps"   },
    ],
  },
  {
    title: "User Authentication Flow",
    description: "The diagram illustrates a user authentication flow with login, token generation, and protected route access. JWT-based stateless authentication is implied.",
    suggestions: [
      "Add refresh token rotation to improve security",
      "Include OAuth2 social login paths (Google, GitHub)",
      "Add MFA (Multi-Factor Authentication) step",
      "Consider adding a token blacklist for logout",
    ],
    tasks: [
      { title: "Implement JWT access + refresh tokens",  priority: "P0", label: "Backend"  },
      { title: "Add Google OAuth2 integration",          priority: "P1", label: "Backend"  },
      { title: "Build MFA with TOTP",                    priority: "P1", label: "Backend"  },
      { title: "Create login/signup UI screens",         priority: "P0", label: "Frontend" },
      { title: "Add token blacklist on logout",          priority: "P2", label: "Backend"  },
    ],
  },
  {
    title: "Database Schema Design",
    description: "Your sketch shows entity relationships between users, workspaces, projects, and tasks. The cardinality suggests a multi-tenant architecture with role-based access.",
    suggestions: [
      "Add indexes on foreign keys for query performance",
      "Consider partitioning the tasks table by workspace_id",
      "Add soft-delete (deleted_at) instead of hard deletes",
      "Include audit log table for compliance tracking",
    ],
    tasks: [
      { title: "Create PostgreSQL schema with migrations", priority: "P0", label: "Backend"  },
      { title: "Add composite indexes on tasks table",    priority: "P1", label: "Backend"  },
      { title: "Implement soft-delete across all models", priority: "P1", label: "Backend"  },
      { title: "Build audit log system",                  priority: "P2", label: "Backend"  },
      { title: "Set up database connection pooling",      priority: "P0", label: "DevOps"   },
    ],
  },
];

/* ─── Typing animation for AI text ─── */
function TypedText({ text, speed = 12 }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return <span>{displayed}</span>;
}

/* ─── AI Result Panel ─── */
function AIResultPanel({ result, onAddToKanban, onClose }) {
  const [addedTasks, setAddedTasks] = useState(new Set());

  const addTask = (i) => {
    setAddedTasks(prev => new Set([...prev, i]));
    onAddToKanban(result.tasks[i]);
  };

  const PRIORITY_COLORS = {
    P0: "bg-red-100 text-red-600",
    P1: "bg-amber-100 text-amber-600",
    P2: "bg-gray-100 text-gray-500",
  };
  const LABEL_COLORS = {
    Backend:  "bg-blue-100 text-blue-700",
    Frontend: "bg-indigo-100 text-indigo-700",
    DevOps:   "bg-orange-100 text-orange-700",
  };

  return (
    <motion.div
      className="flex h-full flex-col"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <motion.div
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm shadow-md shadow-indigo-200"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          >
            🤖
          </motion.div>
          <div>
            <p className="text-sm font-bold text-gray-900">AI Analysis</p>
            <p className="text-[10px] text-gray-400">Claude Vision</p>
          </div>
        </div>
        <motion.button
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}
          onClick={onClose}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-5">
        {/* Detected title */}
        <motion.div
          className="rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 px-4 py-3"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Detected Pattern</p>
          <p className="font-bold text-indigo-900">{result.title}</p>
        </motion.div>

        {/* Description */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Description</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            <TypedText text={result.description} speed={10} />
          </p>
        </motion.div>

        {/* Suggestions */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Improvement Suggestions</p>
          <div className="space-y-2">
            {result.suggestions.map((s, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <span className="mt-0.5 flex-shrink-0 text-amber-500">💡</span>
                <p className="text-xs text-amber-800 leading-relaxed">{s}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Auto-created tasks */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Auto-Created Tasks</p>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              {result.tasks.length} tasks
            </span>
          </div>
          <div className="space-y-2">
            {result.tasks.map((task, i) => (
              <motion.div
                key={i}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                  addedTasks.has(i)
                    ? "border-green-200 bg-green-50"
                    : "border-gray-100 bg-white hover:border-indigo-200"
                }`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + i * 0.08 }}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${addedTasks.has(i) ? "text-green-700" : "text-gray-800"}`}>
                    {task.title}
                  </p>
                  <div className="mt-1 flex gap-1">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${LABEL_COLORS[task.label] || "bg-gray-100 text-gray-500"}`}>{task.label}</span>
                  </div>
                </div>
                <motion.button
                  className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                    addedTasks.has(i)
                      ? "bg-green-100 text-green-700 cursor-default"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                  }`}
                  whileHover={!addedTasks.has(i) ? { scale: 1.05 } : {}}
                  whileTap={!addedTasks.has(i) ? { scale: 0.95 } : {}}
                  onClick={() => !addedTasks.has(i) && addTask(i)}
                >
                  {addedTasks.has(i) ? "✓ Added" : "+ Kanban"}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Add all button */}
      <div className="border-t border-gray-100 p-4">
        <motion.button
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200"
          whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(79,70,229,0.4)" }}
          whileTap={{ scale: 0.97 }}
          onClick={() => result.tasks.forEach((_, i) => addTask(i))}
        >
          ✨ Add All Tasks to Kanban
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Main Whiteboard Page ─── */
export default function WhiteboardPage() {
  const [projectId, setProjectId] = useState(localStorage.getItem("projectId"));
  const { token, user } = useAuth();

  const canvasRef   = useRef(null);
  const ctxRef      = useRef(null);
  const drawing     = useRef(false);
  const startPos    = useRef({ x: 0, y: 0 });
  const snapshot    = useRef(null);
  const textInput   = useRef(null);

  const [tool, setTool]         = useState("pen");
  const [color, setColor]       = useState("#4f46e5");
  const [size, setSize]         = useState(3);
  const [analysing, setAnalysing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [textPos, setTextPos]   = useState(null);
  const [textVal, setTextVal]   = useState("");
  const [addedToast, setAddedToast] = useState(null);
  const [shapes, setShapes]     = useState([]); // for undo
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState(null);

  // New diagram annotations and context goal state
  const [annotations, setAnnotations] = useState([]);
  const [diagramContext, setDiagramContext] = useState("");

  /* init canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext("2d");
    ctx.lineCap    = "round";
    ctx.lineJoin   = "round";
    ctx.fillStyle  = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctxRef.current = ctx;

    const resize = () => {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.putImageData(img, 0, 0);
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = useCallback((e) => {
    if (tool === "text") {
      const pos = getPos(e);
      setTextPos(pos);
      setTextVal("");
      setTimeout(() => textInput.current?.focus(), 50);
      return;
    }
    drawing.current = true;
    const pos = getPos(e);
    startPos.current = pos;
    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    snapshot.current = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawing(true);
  }, [tool]);

  const draw = useCallback((e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = ctxRef.current;
    const pos = getPos(e);

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = size * 4;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      return;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth   = size;

    if (tool === "pen" || tool === "marker") {
      if (tool === "marker") ctx.globalAlpha = 0.5;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }

    /* shape tools — restore snapshot then draw fresh shape */
    ctx.putImageData(snapshot.current, 0, 0);
    const sx = startPos.current.x, sy = startPos.current.y;
    const w = pos.x - sx, h = pos.y - sy;

    ctx.beginPath();
    if (tool === "rect") {
      ctx.strokeRect(sx, sy, w, h);
    } else if (tool === "circle") {
      const rx = Math.abs(w) / 2, ry = Math.abs(h) / 2;
      ctx.ellipse(sx + w / 2, sy + h / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tool === "arrow") {
      /* line */
      ctx.moveTo(sx, sy);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      /* arrowhead */
      const angle = Math.atan2(pos.y - sy, pos.x - sx);
      const len = 14;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x - len * Math.cos(angle - 0.4), pos.y - len * Math.sin(angle - 0.4));
      ctx.lineTo(pos.x - len * Math.cos(angle + 0.4), pos.y - len * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
  }, [tool, color, size]);

  const stopDraw = useCallback(() => {
    drawing.current = false;
    ctxRef.current?.beginPath();
  }, []);

  const commitText = () => {
    if (!textVal.trim() || !textPos) { setTextPos(null); return; }
    const ctx = ctxRef.current;
    ctx.font      = `${size * 5 + 10}px Inter, sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(textVal, textPos.x, textPos.y);

    // Add to annotations tracking
    setAnnotations(prev => [...prev, textVal.trim()]);

    setTextPos(null);
    setTextVal("");
    setHasDrawing(true);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx    = ctxRef.current;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
    setAiResult(null);
    setAnnotations([]);
  };

  // Save whiteboard to Supabase
  const saveWhiteboard = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      const canvas = canvasRef.current;
      const canvasData = canvas.toDataURL("image/png");

      let profileId = null;
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("id").eq("auth_id", user.id || user.auth_id).single();
        profileId = profile?.id;
      }

      const { error } = await supabase.from("whiteboards").upsert([{
        project_id: projectId,
        canvas_data: canvasData,
        annotations,
        diagram_context: diagramContext,
        updated_by: profileId,
        updated_at: new Date().toISOString(),
      }], { onConflict: "project_id" });

      if (error) throw error;

      setSaveMsg("✓ Saved");
      setTimeout(() => setSaveMsg(null), 2500);
    } catch (e) {
      console.error("Failed to save whiteboard:", e);
      setSaveMsg("❌ Save failed");
      setTimeout(() => setSaveMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Load whiteboard from Supabase
  const loadWhiteboard = async (pid) => {
    if (!pid) return;
    try {
      const { data, error } = await supabase.from("whiteboards").select("*").eq("project_id", pid).single();
      if (error || !data?.canvas_data) return;

      const img = new Image();
      img.onload = () => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setHasDrawing(true);
      };
      img.src = data.canvas_data;

      if (data.annotations) setAnnotations(data.annotations);
      if (data.diagram_context) setDiagramContext(data.diagram_context);
    } catch (e) {
      console.error("Failed to load whiteboard:", e);
    }
  };

  const runAIAnalysis = async () => {
    if (!hasDrawing) return;
    setAnalysing(true);
    setAiResult(null);
    try {
      // Use context if provided, otherwise use annotations, otherwise use a generic fallback
      const contextToSend = diagramContext.trim() || "System Architecture";
      const result = await analyzeWhiteboard(contextToSend, annotations);
      setAiResult(result);
    } catch (err) {
      console.error("AI whiteboard analysis error:", err);
      alert("Failed to analyze whiteboard: " + err.message);
    } finally {
      setAnalysing(false);
    }
  };

  const handleAddToKanban = async (task) => {
    if (!projectId) {
      alert("No active project. Please select or create a project first.");
      return;
    }
    
    try {
      // Fetch user profile ID
      let createdByProfileId = null;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_id", user.id || user.auth_id)
          .single();
        if (profile) {
          createdByProfileId = profile.id;
        }
      }

      const { error } = await supabase
        .from("tasks")
        .insert([{
          project_id: projectId,
          title: task.title,
          priority: task.priority || "P2",
          label: task.label || "Frontend",
          status: "todo",
          created_by: createdByProfileId
        }]);

      if (error) throw error;

      setAddedToast(task.title);
      setTimeout(() => setAddedToast(null), 2500);

      // Log whiteboard task creation activity to the database feed
      if (createdByProfileId) {
        await supabase.from("activity_feed").insert([{
          project_id: projectId,
          actor_id: createdByProfileId,
          action: "created task from whiteboard",
          target: task.title,
          metadata: { type: "task", detail: `Priority: ${task.priority} · Added via AI Whiteboard` }
        }]);
      }
    } catch (e) {
      console.error("Failed to add task to Kanban:", e);
      alert("Failed to add task: " + e.message);
    }
  };

  // AUTO RESOLUTION OF PROJECT / WORKSPACE ID
  useEffect(() => {
    const resolveProject = async () => {
      let activeProjectId = projectId;
      
      if (!activeProjectId && token) {
        let workspaceId = localStorage.getItem("workspaceId");
        
        // 1. Resolve workspaceId if missing
        if (!workspaceId && user) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("auth_id", user.id || user.auth_id)
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
          } catch (e) {
            console.error("Whiteboard resolve workspace error:", e);
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
            console.error("Whiteboard resolve project error:", e);
          }
        }
      }

      if (activeProjectId) {
        // Load saved whiteboard after canvas is initialized
        setTimeout(() => loadWhiteboard(activeProjectId), 300);
      }
    };

    resolveProject();
  }, [projectId, token, user]);

  return (
    <AppShell
      title="AI Pair Planning"
      subtitle="Draw your architecture · Hit AI Analyse for instant insights"
      actions={
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-indigo-400 w-48 shadow-sm transition-all focus:ring-2 focus:ring-indigo-100"
            placeholder="Diagram Goal (e.g. JWT Auth Flow)"
            value={diagramContext}
            onChange={(e) => setDiagramContext(e.target.value)}
          />
          <motion.button
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={clearCanvas}
          >
            🗑 Clear
          </motion.button>
          <motion.button
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              saving ? "bg-gray-100 text-gray-400" : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
            }`}
            whileHover={!saving ? { scale: 1.04 } : {}}
            whileTap={!saving ? { scale: 0.96 } : {}}
            onClick={saveWhiteboard}
            disabled={saving}
          >
            {saving ? "Saving..." : saveMsg || "💾 Save"}
          </motion.button>
          <motion.button
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-md transition-all ${
              hasDrawing
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-indigo-200"
                : "bg-gray-300 cursor-not-allowed"
            }`}
            whileHover={hasDrawing ? { scale: 1.05, boxShadow: "0 8px 28px rgba(124,58,237,0.45)" } : {}}
            whileTap={hasDrawing ? { scale: 0.95 } : {}}
            onClick={runAIAnalysis}
            disabled={!hasDrawing || analysing}
          >
            {analysing ? (
              <>
                <motion.div
                  className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
                Analysing...
              </>
            ) : (
              <>🤖 AI Analyse</>
            )}
          </motion.button>
        </div>
      }
    >
      {/* Toast notification */}
      <AnimatePresence>
        {addedToast && (
          <motion.div
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-xl"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            ✓ "{addedToast}" added to Kanban board
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-4" style={{ height: "calc(100vh - 148px)" }}>

        {/* ── Left toolbar ── */}
        <div className="flex w-14 flex-shrink-0 flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white py-4 shadow-sm">
          {/* Tools */}
          {TOOLS.map((t) => (
            <motion.button
              key={t.id}
              title={t.label}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all ${
                tool === t.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setTool(t.id)}
            >
              {t.icon}
            </motion.button>
          ))}

          <div className="my-1 h-px w-8 bg-gray-200" />

          {/* Sizes */}
          {SIZES.map((s) => (
            <motion.button
              key={s}
              title={`Size ${s}`}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                size === s ? "bg-indigo-100 ring-2 ring-indigo-400" : "hover:bg-gray-100"
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSize(s)}
            >
              <div
                className="rounded-full bg-gray-700"
                style={{ width: Math.min(s * 2, 16), height: Math.min(s * 2, 16) }}
              />
            </motion.button>
          ))}

          <div className="my-1 h-px w-8 bg-gray-200" />

          {/* Colors */}
          {COLORS.map((c) => (
            <motion.button
              key={c}
              title={c}
              className={`h-7 w-7 rounded-full border-2 transition-all ${
                color === c ? "border-indigo-500 scale-110 shadow-md" : "border-gray-200 hover:border-gray-400"
              }`}
              style={{ background: c }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        {/* ── Canvas area ── */}
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Dot grid background */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, #e2e8f0 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Empty state hint */}
          {!hasDrawing && !analysing && (
            <motion.div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div
                className="text-6xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                🎨
              </motion.div>
              <p className="text-lg font-bold text-gray-400">Start drawing your architecture</p>
              <p className="text-sm text-gray-300">Use boxes, arrows, and text to sketch any diagram</p>
              <p className="text-sm text-gray-300">Then hit <span className="font-semibold text-indigo-400">🤖 AI Analyse</span> for instant insights</p>
            </motion.div>
          )}

          {/* Analysing overlay */}
          <AnimatePresence>
            {analysing && (
              <motion.div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <motion.div
                  className="relative flex h-20 w-20 items-center justify-center"
                >
                  <motion.div
                    className="absolute h-20 w-20 rounded-full border-4 border-indigo-100 border-t-indigo-600"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span className="text-3xl">🤖</span>
                </motion.div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-800">Claude is reading your diagram...</p>
                  <motion.p
                    className="text-sm text-gray-400"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Detecting patterns · Generating suggestions · Creating tasks
                  </motion.p>
                </div>
                {/* Scanning line effect */}
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* The actual canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            style={{ cursor: tool === "eraser" ? "cell" : tool === "text" ? "text" : "crosshair" }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />

          {/* Text input overlay */}
          <AnimatePresence>
            {textPos && (
              <motion.input
                ref={textInput}
                className="absolute z-20 rounded border border-indigo-400 bg-white/90 px-2 py-1 text-sm outline-none shadow-lg"
                style={{ left: textPos.x, top: textPos.y - 16, minWidth: 120, color, fontSize: size * 5 + 10 }}
                value={textVal}
                onChange={e => setTextVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") commitText(); if (e.key === "Escape") setTextPos(null); }}
                onBlur={commitText}
                placeholder="Type here..."
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>

          {/* Tool indicator */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-100 px-3 py-1.5 shadow-sm">
            <span className="text-sm">{TOOLS.find(t => t.id === tool)?.icon}</span>
            <span className="text-xs font-semibold text-gray-600">{TOOLS.find(t => t.id === tool)?.label}</span>
            <div className="h-3 w-px bg-gray-200" />
            <div className="h-3 w-3 rounded-full border border-gray-200" style={{ background: color }} />
            <span className="text-xs text-gray-400">size {size}</span>
          </div>
        </div>

        {/* ── AI Result panel ── */}
        <AnimatePresence>
          {aiResult && (
            <motion.div
              className="w-80 flex-shrink-0 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-xl"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <AIResultPanel
                result={aiResult}
                onAddToKanban={handleAddToKanban}
                onClose={() => setAiResult(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
