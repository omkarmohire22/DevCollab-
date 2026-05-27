import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import axios from "axios";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { reviewCode } from "../services/ai.service";

/* ── language config ── */
const LANGUAGES = ["JavaScript", "TypeScript", "Python", "Java", "C++", "Go"];

const LANG_COLORS = {
  JavaScript: "bg-yellow-100 text-yellow-700",
  TypeScript: "bg-blue-100 text-blue-700",
  Python:     "bg-green-100 text-green-700",
  Java:       "bg-orange-100 text-orange-700",
  "C++":      "bg-red-100 text-red-700",
  Go:         "bg-cyan-100 text-cyan-700",
};

/* simple keyword-based syntax highlighter */
const KEYWORDS = {
  JavaScript: ["function","const","let","var","return","if","else","for","while","class","import","export","default","async","await","new","this","=>","true","false","null","undefined"],
  TypeScript: ["function","const","let","var","return","if","else","for","class","import","export","interface","type","async","await","string","number","boolean","void","any","=>"],
  Python:     ["def","return","if","else","elif","for","while","class","import","from","as","with","try","except","True","False","None","lambda","yield","pass"],
  Java:       ["public","private","class","void","return","if","else","for","while","new","import","static","final","int","String","boolean","extends","implements"],
  "C++":      ["int","void","return","if","else","for","while","class","include","using","namespace","std","cout","cin","auto","const","bool","string","new","delete"],
  Go:         ["func","var","const","return","if","else","for","range","package","import","type","struct","interface","go","chan","defer","select","case","switch"],
};

function highlight(code, lang) {
  const kws = KEYWORDS[lang] || [];
  const lines = code.split("\n");
  return lines.map((line, li) => {
    const parts = [];
    let remaining = line;
    let key = 0;

    // comments
    const commentMatch = remaining.match(/\/\/.*$|#.*$/);
    if (commentMatch) {
      const idx = remaining.indexOf(commentMatch[0]);
      if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
      parts.push(<span key={key++} style={{ color: "#64748b" }}>{commentMatch[0]}</span>);
      return <div key={li} className="flex gap-4"><span className="w-6 flex-shrink-0 text-right select-none" style={{ color: "#334155" }}>{li + 1}</span><span>{parts}</span></div>;
    }

    // tokenise word by word
    const tokens = remaining.split(/(\s+|[(){}[\],;.])/);
    tokens.forEach((tok, ti) => {
      if (kws.includes(tok)) {
        parts.push(<span key={ti} style={{ color: "#818cf8", fontWeight: 600 }}>{tok}</span>);
      } else if (/^["'`]/.test(tok)) {
        parts.push(<span key={ti} style={{ color: "#86efac" }}>{tok}</span>);
      } else if (/^\d/.test(tok)) {
        parts.push(<span key={ti} style={{ color: "#fbbf24" }}>{tok}</span>);
      } else {
        parts.push(<span key={ti}>{tok}</span>);
      }
    });

    return (
      <div key={li} className="flex gap-4">
        <span className="w-6 flex-shrink-0 text-right select-none" style={{ color: "#334155" }}>{li + 1}</span>
        <span>{parts}</span>
      </div>
    );
  });
}

/* ── relative time helper ── */
function timeAgo(dateString) {
  if (!dateString) return "some time ago";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ── New Snippet Modal ── */
function NewSnippetModal({ onSave, onClose }) {
  const [form, setForm] = useState({ title: "", language: "JavaScript", tags: "", description: "", code: "" });
  const [saving, setSaving] = useState(false);
  const valid = form.title.trim() && form.code.trim() && !saving;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden"
        initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">New Snippet</h2>
          <motion.button className="text-gray-400 hover:text-gray-600" whileHover={{ rotate: 90 }} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l12 12M14 2L2 14"/></svg>
          </motion.button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Title *</label>
              <input autoFocus className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="e.g. useLocalStorage Hook" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Language</label>
              <select className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 bg-white"
                value={form.language} onChange={e => setForm({...form, language: e.target.value})}>
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Description</label>
            <input className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="What does this snippet do?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Tags (comma separated)</label>
            <input className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="e.g. hooks, performance, react" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Code *</label>
            <textarea className="w-full resize-none rounded-xl border border-gray-200 p-3 font-mono text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              rows={8} placeholder="// Paste your code here..." value={form.code}
              onChange={e => setForm({...form, code: e.target.value})}
              style={{ background: "#0f172a", color: "#e2e8f0" }} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <motion.button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose} disabled={saving}>Cancel</motion.button>
          <motion.button className={`rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-md transition-all ${valid ? "bg-indigo-600 shadow-indigo-200" : "bg-gray-300 cursor-not-allowed"}`}
            whileHover={valid ? { scale: 1.04 } : {}} whileTap={valid ? { scale: 0.96 } : {}} onClick={save} disabled={!valid}>
            {saving ? "Saving..." : "Save Snippet"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Snippet card ── */
function SnippetCard({ snippet, selected, onSelect }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(snippet.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const authorName = snippet.author?.full_name || "Unknown";
  const displayTime = timeAgo(snippet.created_at);

  return (
    <motion.div layout
      className={`cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition-all ${selected ? "border-indigo-400 ring-2 ring-indigo-100" : "border-gray-100 hover:border-indigo-200"}`}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(79,70,229,0.1)" }}
      onClick={() => onSelect(snippet)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-gray-900">{snippet.title}</h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">{snippet.description}</p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${LANG_COLORS[snippet.language] || "bg-gray-100 text-gray-600"}`}>{snippet.language}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(snippet.tags || []).map(tag => (
          <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">#{tag}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">by {authorName} · {displayTime}</span>
        <motion.button
          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${copied ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700"}`}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} onClick={copy}>
          {copied ? "✓ Copied" : "Copy"}
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── AI Code Review Modal ── */
function AIReviewModal({ code, language, onClose }) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [statusPhrase, setStatusPhrase] = useState("Initializing AI Code Review...");

  useEffect(() => {
    const phrases = [
      "Analyzing code patterns...",
      "Searching for potential bugs...",
      "Evaluating computational complexity...",
      "Checking for security vulnerabilities...",
      "Reviewing naming conventions...",
      "Calculating final quality score..."
    ];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < phrases.length) {
        setStatusPhrase(phrases[idx++]);
      }
    }, 2200);

    const runReview = async () => {
      try {
        const res = await reviewCode(code, language.toLowerCase());
        setResult(res);
      } catch (err) {
        console.error("AI Review error:", err);
        setError(err.message || "Failed to analyze code");
      } finally {
        setLoading(false);
        clearInterval(interval);
      }
    };
    runReview();

    return () => clearInterval(interval);
  }, [code, language]);

  const getScoreColor = (score) => {
    if (score >= 9) return "text-emerald-500 border-emerald-200 bg-emerald-50";
    if (score >= 7) return "text-indigo-500 border-indigo-200 bg-indigo-50";
    if (score >= 5) return "text-amber-500 border-amber-200 bg-amber-50";
    return "text-red-500 border-red-200 bg-red-50";
  };

  const getScoreLabel = (score) => {
    if (score >= 9) return "Excellent & Production Ready";
    if (score >= 7) return "Good, Minor Tweaks Suggested";
    if (score >= 5) return "Warning, Needs Performance/Style Work";
    return "Critical, Vulnerabilities or Bugs Found";
  };

  const getSeverityStyle = (severity) => {
    switch (severity?.toLowerCase()) {
      case "high": return "bg-red-100 text-red-700 border-red-200";
      case "medium": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "bug": return "🐞 Bug";
      case "security": return "🔒 Security";
      case "perf": return "⚡ Perf";
      default: return "🎨 Style";
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h2 className="text-base font-bold text-gray-900">AI Code Review Feedback</h2>
          </div>
          <motion.button className="text-gray-400 hover:text-gray-600" whileHover={{ rotate: 90 }} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l12 12M14 2L2 14"/></svg>
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"></div>
                <span className="absolute text-2xl animate-pulse">🤖</span>
              </div>
              <p className="text-sm font-semibold text-gray-600 animate-pulse">{statusPhrase}</p>
              <p className="text-xs text-gray-400">Our LLM is examining your code security and performance...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-red-50 rounded-2xl border border-red-100 p-6">
              <span className="text-4xl mb-2">⚠️</span>
              <h3 className="text-base font-bold text-red-800">Review Failed</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button onClick={onClose} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-white text-xs font-semibold shadow-md">
                Close Panel
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Score card */}
              <div className="flex items-center gap-5 rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
                <div className={`flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-2xl border font-mono text-3xl font-extrabold shadow-inner ${getScoreColor(result.score)}`}>
                  {result.score}
                  <span className="text-[10px] uppercase font-bold text-gray-400 mt-0.5">Score</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">AI Code Quality Rating</h3>
                  <p className="mt-1 text-xs text-gray-400">Based on security vulnerabilities, algorithmic time complexity, style violations, and standard practices.</p>
                  <span className="mt-2.5 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                    {getScoreLabel(result.score)}
                  </span>
                </div>
              </div>

              {/* Issues */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Identified Findings ({result.issues?.length || 0})</h4>
                
                {(!result.issues || result.issues.length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 py-10 text-center">
                    <span className="text-3xl">✨</span>
                    <p className="text-sm font-semibold text-gray-600 mt-2">Zero issues detected!</p>
                    <p className="text-xs text-gray-400">Excellent code quality! It is production ready.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {result.issues.map((issue, idx) => (
                      <div key={idx} className="flex gap-4 border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition">
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-gray-800">{getTypeIcon(issue.type)}</span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase border ${getSeverityStyle(issue.severity)}`}>
                              {issue.severity} severity
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed mt-1">{issue.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 px-6 py-4 bg-gray-50">
          <motion.button className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-100"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}>
            Got it, thanks!
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main page ── */
export default function SnippetsPage() {
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [projectId, setProjectId] = useState(localStorage.getItem("projectId"));
  const { token, user } = useAuth();

  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showAIReview, setShowAIReview] = useState(false);
  const [copied, setCopied] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
  const API = `${API_BASE}/snippets`;

  // FETCH SNIPPETS
  const fetchSnippets = async (projId) => {
    setLoading(true);
    setError(null);
    const targetProjId = projId || projectId;
    try {
      if (!targetProjId || !token) return;

      const res = await axios.get(`${API}?projectId=${targetProjId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const fetched = res.data.snippets || [];
      setSnippets(fetched);
      if (fetched.length > 0) {
        setSelected(fetched[0]);
      } else {
        setSelected(null);
      }
    } catch (err) {
      console.error("Fetch snippets error:", err);
      setError(err.response?.data?.error || err.message || "Failed to load snippets");
    } finally {
      setLoading(false);
    }
  };

  // AUTO RESOLUTION OF PROJECT / WORKSPACE ID
  useEffect(() => {
    const resolveAndFetch = async () => {
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
            console.error("Snippets resolve workspace error:", e);
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
            console.error("Snippets resolve project error:", e);
          }
        }
      }

      if (activeProjectId && token) {
        fetchSnippets(activeProjectId);
      } else {
        setLoading(false);
      }
    };

    resolveAndFetch();
  }, [projectId, token, user]);

  const filtered = snippets.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = 
      (s.title || "").toLowerCase().includes(q) || 
      (s.tags || []).some(t => t.toLowerCase().includes(q)) || 
      (s.description || "").toLowerCase().includes(q);
    const matchLang = langFilter === "All" || s.language === langFilter;
    return matchSearch && matchLang;
  });

  const copySelected = () => {
    if (!selected) return;
    navigator.clipboard.writeText(selected.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveSnippet = async (formSnippet) => {
    if (!projectId || !token) return;
    try {
      const res = await axios.post(
        API,
        {
          project_id: projectId,
          title: formSnippet.title,
          language: formSnippet.language,
          description: formSnippet.description,
          code: formSnippet.code,
          tags: formSnippet.tags.split(",").map(t => t.trim()).filter(Boolean),
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const newSnippet = res.data.snippet;
      const completeSnippet = {
        ...newSnippet,
        author: {
          full_name: user?.name || "You",
          avatar_url: null,
        }
      };
      setSnippets(prev => [completeSnippet, ...prev]);
      setSelected(completeSnippet);
    } catch (err) {
      console.error("Create snippet error:", err);
      alert("Failed to create snippet: " + (err.response?.data?.error || err.message));
      throw err;
    }
  };

  const deleteSelected = async () => {
    if (!selected || !token) return;
    if (!window.confirm("Are you sure you want to delete this snippet?")) return;

    try {
      await axios.delete(`${API}/${selected.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const filteredList = snippets.filter(s => s.id !== selected.id);
      setSnippets(filteredList);
      
      if (filteredList.length > 0) {
        setSelected(filteredList[0]);
      } else {
        setSelected(null);
      }
    } catch (err) {
      console.error("Delete snippet error:", err);
      alert("Failed to delete snippet: " + (err.response?.data?.error || err.message));
    }
  };

  const ext = { JavaScript: "js", TypeScript: "ts", Python: "py", Java: "java", "C++": "cpp", Go: "go" };

  return (
    <AppShell title="Code Snippets" subtitle={`Reusable code library · ${snippets.length} snippets`}
      actions={
        <motion.button className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200"
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowNew(true)}>
          + New Snippet
        </motion.button>
      }>

      <AnimatePresence>
        {showNew && <NewSnippetModal onSave={saveSnippet} onClose={() => setShowNew(false)} />}
        {showAIReview && selected && (
          <AIReviewModal code={selected.code} language={selected.language} onClose={() => setShowAIReview(false)} />
        )}
      </AnimatePresence>

      <div className="flex gap-5" style={{ height: "calc(100vh - 140px)" }}>
        {/* ── Left panel ── */}
        <div className="flex w-80 flex-shrink-0 flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="Search by title or tag..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Language filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {["All", ...LANGUAGES].map(l => (
              <motion.button key={l}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${langFilter === l ? "bg-indigo-600 text-white" : "border border-gray-200 bg-white text-gray-500 hover:border-indigo-300"}`}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setLangFilter(l)}>
                {l}
              </motion.button>
            ))}
          </div>

          {/* Snippet list */}
          <div className="flex flex-col gap-2.5 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex flex-col items-center py-20 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600"></div>
                <p className="mt-3 text-xs text-gray-400">Loading snippets...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center py-10 text-center text-red-500">
                <span className="text-2xl mb-1">⚠️</span>
                <p className="text-xs font-bold">{error}</p>
                <button onClick={() => fetchSnippets(projectId)} className="mt-2.5 rounded-lg bg-red-100 px-3 py-1 text-[11px] font-bold text-red-700">Try Again</button>
              </div>
            ) : filtered.length === 0 ? (
              <motion.div className="flex flex-col items-center py-10 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="text-3xl mb-2">🔍</span>
                <p className="text-sm text-gray-500">No snippets found</p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filtered.map(s => (
                  <motion.div key={s.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    <SnippetCard snippet={s} selected={selected?.id === s.id} onSelect={setSelected} />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ── Right panel — syntax highlighted viewer ── */}
        <div className="flex flex-1">
          {!projectId ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center bg-white border border-gray-100 rounded-2xl shadow-sm">
              <span className="text-4xl mb-3">📁</span>
              <h2 className="text-xl font-bold text-gray-700">No Active Project</h2>
              <p className="mt-2 text-sm text-gray-500 max-w-sm">Please select or create a project from the Dashboard first to access Code Snippets.</p>
            </div>
          ) : loading ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"></div>
              <p className="mt-4 text-sm text-gray-400">Syncing with code repository...</p>
            </div>
          ) : !selected ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center bg-white border border-gray-100 rounded-2xl shadow-sm">
              <span className="text-4xl mb-3">📝</span>
              <h2 className="text-xl font-bold text-gray-700">No Snippets Yet</h2>
              <p className="mt-2 text-sm text-gray-500 max-w-sm">Start building your project's reusable code library by creating a new snippet.</p>
              <button onClick={() => setShowNew(true)} className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-white font-semibold shadow-md">
                + Create First Snippet
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={selected.id}
                className="flex flex-1 flex-col rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>

                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{selected.title}</h2>
                    <p className="mt-0.5 text-xs text-gray-400">{selected.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${LANG_COLORS[selected.language] || "bg-gray-100 text-gray-600"}`}>{selected.language}</span>
                    
                    <motion.button
                      className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors shadow-sm"
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={deleteSelected}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      Delete
                    </motion.button>

                    <motion.button
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-md transition-all ${copied ? "bg-green-600 shadow-green-200" : "bg-indigo-600 shadow-indigo-200"}`}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={copySelected}>
                      {copied ? "✓ Copied!" : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          Copy Code
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Tags row */}
                <div className="flex items-center gap-2 border-b border-gray-50 px-6 py-2.5">
                  {(selected.tags || []).map(tag => (
                    <span key={tag} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">#{tag}</span>
                  ))}
                  <span className="ml-auto text-xs text-gray-400">by {selected.author?.full_name || "Unknown"} · {timeAgo(selected.created_at)}</span>
                </div>

                {/* Syntax highlighted code */}
                <div className="flex-1 overflow-auto" style={{ background: "#0f172a" }}>
                  {/* Window chrome */}
                  <div className="flex items-center gap-1.5 border-b border-white/10 px-5 py-3">
                    <span className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="h-3 w-3 rounded-full bg-yellow-400" />
                    <span className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="ml-3 font-mono text-xs text-slate-400">
                      {(selected.title || "").toLowerCase().replace(/\s+/g, "_")}.{ext[selected.language] || "txt"}
                    </span>
                  </div>
                  <div className="overflow-auto p-5 font-mono text-sm leading-relaxed" style={{ color: "#e2e8f0" }}>
                    <AnimatePresence mode="wait">
                      <motion.div key={selected.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}>
                        {highlight(selected.code, selected.language)}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Footer — AI review */}
                <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-3">
                  <motion.button
                    onClick={() => setShowAIReview(true)}
                    className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200"
                    whileHover={{ scale: 1.05, boxShadow: "0 8px 24px rgba(124,58,237,0.4)" }}
                    whileTap={{ scale: 0.95 }}>
                    🤖 AI Review this Snippet
                  </motion.button>
                  <span className="text-xs text-gray-400">Get bugs, performance & security feedback</span>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </AppShell>
  );
}
