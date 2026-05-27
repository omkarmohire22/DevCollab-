import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { PRIORITY_COLORS, LABEL_COLORS, AVATAR_COLORS, ALL_MEMBERS, ALL_LABELS } from "../pages/KanbanPage";
import TaskViewers from "./TaskViewers";

const COLUMNS = [
  { id: "todo",       label: "To Do"       },
  { id: "inprogress", label: "In Progress" },
  { id: "review",     label: "In Review"   },
  { id: "done",       label: "Done"        },
];

/* ── @mention suggestion popup ── */
function MentionPopup({ query, onSelect, workspaceMembers = [] }) {
  const matches = workspaceMembers.filter(m => m.name?.toLowerCase().startsWith(query.toLowerCase()));
  if (!matches.length) return null;
  return (
    <motion.div
      className="absolute bottom-full left-0 mb-1 w-44 rounded-xl border border-gray-100 bg-white shadow-xl z-10"
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}>
      {matches.map(m => (
        <motion.button key={m.id || m.name}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 first:rounded-t-xl last:rounded-b-xl"
          whileHover={{ x: 2 }} onMouseDown={e => { e.preventDefault(); onSelect(m.name); }}>
          <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[m.name] || "from-indigo-400 to-violet-500"} text-[10px] font-bold text-white`}>
            {m.name?.[0]}
          </div>
          @{m.name}
        </motion.button>
      ))}
    </motion.div>
  );
}

/* ── Comment box with @mention support ── */
function CommentBox({ onSubmit, workspaceMembers = [] }) {
  const [text, setText] = useState("");
  const [mention, setMention] = useState(null); // { query, start }
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) setMention({ query: match[1], start: before.lastIndexOf("@") });
    else setMention(null);
  };

  const insertMention = (name) => {
    if (!mention) return;
    const before = text.slice(0, mention.start);
    const after  = text.slice(mention.start + mention.query.length + 1);
    const newText = `${before}@${name} ${after}`;
    setText(newText);
    setMention(null);
    inputRef.current?.focus();
  };

  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
    setMention(null);
  };

  /* highlight @mentions in preview */
  const renderText = (t) =>
    t.split(/(@\w+)/g).map((part, i) =>
      part.startsWith("@")
        ? <span key={i} className="font-bold text-indigo-600">{part}</span>
        : part
    );

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            rows={2}
            placeholder="Add a comment… type @ to mention someone"
            value={text}
            onChange={handleChange}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          />
          <AnimatePresence>
            {mention && <MentionPopup query={mention.query} onSelect={insertMention} workspaceMembers={workspaceMembers} />}
          </AnimatePresence>
        </div>
        <motion.button
          className="self-end flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200"
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={submit}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
        </motion.button>
      </div>
    </div>
  );
}

/* ── Main TaskModal ── */
export default function TaskModal({ task, colId, onClose, onUpdate, onMove, onDelete, workspaceMembers = [] }) {
  const [form, setForm]   = useState({ comments: [], attachments: [], ...task });
  const [tab, setTab]     = useState("details"); // details | comments | attachments
  const [notify, setNotify] = useState(null);
  const fileRef = useRef(null);

  /* notify banner helper */
  const showNotify = (msg) => { setNotify(msg); setTimeout(() => setNotify(null), 2500); };

  const save = () => { onUpdate(colId, form); showNotify("Task saved ✓"); };

  const addComment = (text) => {
    const comment = { id: `c${Date.now()}`, author: "Rahul", text, time: "just now" };
    const updated = { ...form, comments: [...form.comments, comment] };
    setForm(updated);
    onUpdate(colId, updated);
    /* detect @mentions and show notification */
    const mentions = [...text.matchAll(/@(\w+)/g)].map(m => m[1]);
    if (mentions.length) showNotify(`🔔 Notified: ${mentions.map(m => "@"+m).join(", ")}`);
  };

  const addAttachment = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const names = files.map(f => f.name);
    const updated = { ...form, attachments: [...form.attachments, ...names] };
    setForm(updated);
    onUpdate(colId, updated);
    showNotify(`📎 ${names.length} file(s) attached`);
  };

  const removeAttachment = (name) => {
    const updated = { ...form, attachments: form.attachments.filter(a => a !== name) };
    setForm(updated);
    onUpdate(colId, updated);
  };

  const renderComment = (text) =>
    text.split(/(@\w+)/g).map((part, i) =>
      part.startsWith("@")
        ? <span key={i} className="font-bold text-indigo-600 bg-indigo-50 rounded px-0.5">{part}</span>
        : part
    );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div
        className="relative flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
        style={{ maxHeight: "90vh" }}
        initial={{ scale: 0.9, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}>

        {/* ── Notification banner ── */}
        <AnimatePresence>
          {notify && (
            <motion.div
              className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center gap-2 bg-indigo-600 py-2 text-sm font-semibold text-white"
              initial={{ y: -40 }} animate={{ y: 0 }} exit={{ y: -40 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}>
              {notify}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ── */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 pt-6 pb-4">
          <div className="flex-1 min-w-0 pr-4">
            <input
              className="w-full text-lg font-extrabold text-gray-900 outline-none border-b-2 border-transparent focus:border-indigo-400 pb-0.5 transition-colors bg-transparent"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Task title"
            />
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[form.priority]}`}>{form.priority}</span>
              <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${LABEL_COLORS[form.label] || "bg-gray-100 text-gray-500"}`}>{form.label}</span>
              <span className="text-xs text-gray-400">in <span className="font-semibold text-gray-600">{COLUMNS.find(c=>c.id===colId)?.label}</span></span>
            </div>
          </div>
          <motion.button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2l12 12M14 2L2 14"/>
            </svg>
          </motion.button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-100 px-6">
          {/* Task viewers — who else is looking at this task right now */}
          <div className="mr-auto flex items-center py-2">
            <TaskViewers taskId={task.id} taskTitle={task.title} />
          </div>
          {[["details","📋 Details"],["comments",`💬 Comments (${form.comments.length})`],["attachments",`📎 Files (${form.attachments.length})`]].map(([id, label]) => (
            <motion.button key={id}
              className={`relative py-3 pr-5 text-sm font-semibold transition-colors ${tab===id ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
              whileTap={{ scale: 0.97 }} onClick={() => setTab(id)}>
              {label}
              {tab === id && <motion.div layoutId="modal-tab" className="absolute bottom-0 left-0 right-4 h-0.5 rounded-full bg-indigo-600" transition={{ type:"spring", stiffness:380, damping:30 }} />}
            </motion.button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">

            {/* DETAILS TAB */}
            {tab === "details" && (
              <motion.div key="details" className="space-y-4"
                initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-10 }}
                transition={{ duration: 0.2 }}>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Description</label>
                  <textarea
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    rows={3} placeholder="Add a description..."
                    value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
                </div>

                {/* Fields grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Priority */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Priority</label>
                    <div className="flex gap-2">
                      {["P0","P1","P2"].map(p => (
                        <motion.button key={p}
                          className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${form.priority===p ? PRIORITY_COLORS[p]+" ring-2 ring-offset-1 ring-indigo-300 shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => setForm({ ...form, priority: p })}>
                          {p}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Assignee */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Assignee</label>
                    <div className="flex flex-wrap gap-1.5">
                      {workspaceMembers.length === 0 ? (
                        <p className="text-xs text-gray-400">No members in workspace yet</p>
                      ) : (
                        workspaceMembers.map(m => (
                          <motion.button key={m.id || m.name}
                            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all ${form.assignee === m.name ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-indigo-200"}`}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setForm({ ...form, assignee: m.name })}>
                            <div className={`h-4 w-4 rounded-full bg-gradient-to-br ${AVATAR_COLORS[m.name] || "from-indigo-400 to-violet-500"} text-[8px] font-bold text-white flex items-center justify-center`}>
                              {m.name?.[0]}
                            </div>
                            {m.name}
                          </motion.button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Label */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Label</label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_LABELS.map(l => (
                        <motion.button key={l}
                          className={`rounded-xl border px-2.5 py-1 text-xs font-medium transition-all ${form.label===l ? (LABEL_COLORS[l]||"bg-gray-100 text-gray-600")+" ring-2 ring-offset-1 ring-indigo-300" : "border-gray-200 text-gray-500 hover:border-indigo-200"}`}
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => setForm({ ...form, label: l })}>
                          {l}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Due date */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Due Date</label>
                    <input type="date"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white"
                      value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} />
                  </div>
                </div>

                {/* Move to column */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Move to Column</label>
                  <div className="flex gap-2">
                    {COLUMNS.filter(c => c.id !== colId).map(c => (
                      <motion.button key={c.id}
                        className="flex-1 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        onClick={() => onMove(form.id, colId, c.id)}>
                        → {c.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* COMMENTS TAB */}
            {tab === "comments" && (
              <motion.div key="comments" className="space-y-4"
                initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-10 }}
                transition={{ duration: 0.2 }}>
                <CommentBox onSubmit={addComment} workspaceMembers={workspaceMembers} />
                <div className="space-y-3">
                  <AnimatePresence>
                    {form.comments.length === 0 && (
                      <motion.div className="flex flex-col items-center py-8 text-center" initial={{ opacity:0 }} animate={{ opacity:1 }}>
                        <span className="text-3xl mb-2">💬</span>
                        <p className="text-sm text-gray-500">No comments yet</p>
                        <p className="text-xs text-gray-400">Type @ to mention a teammate</p>
                      </motion.div>
                    )}
                    {[...form.comments].reverse().map((c, i) => (
                      <motion.div key={c.id}
                        className="flex gap-3"
                        initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                        transition={{ delay: i * 0.05 }}>
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[c.author]||"from-gray-300 to-gray-400"} text-xs font-bold text-white`}>
                          {c.author?.[0]}
                        </div>
                        <div className="flex-1 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gray-800">{c.author}</span>
                            <span className="text-[10px] text-gray-400">{c.time}</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{renderComment(c.text)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ATTACHMENTS TAB */}
            {tab === "attachments" && (
              <motion.div key="attachments" className="space-y-4"
                initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-10 }}
                transition={{ duration: 0.2 }}>
                <input ref={fileRef} type="file" multiple className="hidden" onChange={addAttachment} />
                <motion.button
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 py-4 text-sm font-semibold text-indigo-600 hover:border-indigo-400 transition-colors"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => fileRef.current?.click()}>
                  📎 Click to attach files
                </motion.button>
                <div className="space-y-2">
                  <AnimatePresence>
                    {form.attachments.length === 0 && (
                      <motion.div className="flex flex-col items-center py-8 text-center" initial={{ opacity:0 }} animate={{ opacity:1 }}>
                        <span className="text-3xl mb-2">📁</span>
                        <p className="text-sm text-gray-500">No attachments yet</p>
                      </motion.div>
                    )}
                    {form.attachments.map((name, i) => (
                      <motion.div key={name}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
                        initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                        exit={{ opacity:0, x:8, scale:0.95 }} transition={{ delay: i*0.05 }}>
                        <span className="text-xl">{name.endsWith(".pdf") ? "📄" : name.match(/\.(png|jpg|gif|svg)$/) ? "🖼️" : name.endsWith(".sql") ? "🗄️" : "📎"}</span>
                        <span className="flex-1 text-sm font-medium text-gray-700">{name}</span>
                        <motion.button className="text-gray-300 hover:text-red-400 transition-colors"
                          whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                          onClick={() => removeAttachment(name)}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M2 2l10 10M12 2L2 12"/>
                          </svg>
                        </motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <motion.button className="rounded-xl border border-red-100 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-50 transition-colors"
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => onDelete(colId, form.id)}>
            🗑 Delete Task
          </motion.button>
          <div className="flex gap-2">
            <motion.button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}>
              Cancel
            </motion.button>
            <motion.button className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200"
              whileHover={{ scale: 1.05, boxShadow: "0 8px 24px rgba(79,70,229,0.4)" }} whileTap={{ scale: 0.95 }}
              onClick={save}>
              Save Changes
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
