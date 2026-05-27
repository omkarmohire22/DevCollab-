import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import AppShell from "../components/AppShell";
import TaskModal from "../components/TaskModal";
import PresenceBar from "../components/PresenceBar";
import { useRealtime } from "../context/RealtimeContext";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { taskApi } from "../services/api";

/* ── Column config ── */
const COLUMNS = [
  {
    id: "todo",
    label: "To Do",
    color: "bg-gray-400",
  },

  {
    id: "inprogress",
    label: "In Progress",
    color: "bg-blue-500",
  },

  {
    id: "review",
    label: "In Review",
    color: "bg-amber-500",
  },

  {
    id: "done",
    label: "Done",
    color: "bg-green-500",
  },
];

export const PRIORITY_COLORS = {
  P0: "bg-red-100 text-red-600",

  P1: "bg-amber-100 text-amber-600",

  P2: "bg-gray-100 text-gray-500",
};

export const LABEL_COLORS = {
  Frontend:
    "bg-indigo-100 text-indigo-700",

  Backend:
    "bg-blue-100 text-blue-700",

  AI:
    "bg-violet-100 text-violet-700",

  Design:
    "bg-pink-100 text-pink-700",

  DevOps:
    "bg-orange-100 text-orange-700",

  Docs:
    "bg-teal-100 text-teal-700",

  Setup:
    "bg-gray-100 text-gray-600",
};

export const AVATAR_COLORS = {
  Ankush:
    "from-pink-400 to-rose-500",

  Riya:
    "from-blue-400 to-indigo-500",

  Sneha:
    "from-emerald-400 to-teal-500",

  Dev:
    "from-amber-400 to-orange-500",
};

export const ALL_MEMBERS = []; // replaced by dynamic workspace members — kept for export compatibility

export const ALL_LABELS = [
  "Frontend",
  "Backend",
  "AI",
  "Design",
  "DevOps",
  "Docs",
  "Setup",
];

/* ─────────────────────────────────────────────
   CARD
───────────────────────────────────────────── */

function KanbanCard({
  task,
  colId,
  onOpen,
  onDragStart,
}) {

  const isOverdue =
    task.due &&
    new Date(task.due) <
    new Date() &&
    colId !== "done";

  return (
    <motion.div
      layout
      draggable
      onDragStart={() =>
        onDragStart(
          task.id,
          colId
        )
      }
      className="cursor-grab rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm"
      whileHover={{
        y: -2,
      }}
      onClick={() =>
        onOpen(task, colId)
      }
    >

      <div className="mb-2 flex flex-wrap items-center gap-1.5">

        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[
            task.priority
          ]}`}
        >
          {task.priority}
        </span>

        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${LABEL_COLORS[
            task.label
          ]}`}
        >
          {task.label}
        </span>

      </div>

      <p className="text-sm font-semibold text-gray-800">
        {task.title}
      </p>

      {task.desc && (

        <p className="mt-1 text-xs text-gray-400 line-clamp-2">
          {task.desc}
        </p>

      )}

      <div className="mt-3 flex items-center justify-between">

        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[
            task.assignee
          ]} text-[10px] font-bold text-white`}
        >
          {task.assignee?.[0]}
        </div>

        <span
          className={`text-[10px] ${isOverdue
            ? "font-bold text-red-500"
            : "text-gray-400"
            }`}
        >
          📅{" "}

          {task.due
            ? new Date(
              task.due
            ).toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
              }
            )
            : "No date"}
        </span>

      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   COLUMN
───────────────────────────────────────────── */

function KanbanColumn({
  col,
  tasks,
  onAdd,
  onOpen,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}) {

  return (
    <motion.div
      className={`flex w-72 flex-shrink-0 flex-col rounded-2xl border-2 ${isDragOver
        ? "border-indigo-400 bg-indigo-50"
        : "border-gray-100 bg-gray-50"
        }`}
      onDragOver={(e) => {

        e.preventDefault();

        onDragOver(col.id);
      }}
      onDrop={(e) => {

        e.preventDefault();

        onDrop(col.id);
      }}
    >

      <div className="flex items-center justify-between px-4 py-3">

        <div className="flex items-center gap-2">

          <span
            className={`h-2.5 w-2.5 rounded-full ${col.color}`}
          />

          <span className="text-sm font-bold text-gray-700">
            {col.label}
          </span>

          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">
            {tasks.length}
          </span>

        </div>

        <button
          className="text-gray-400 hover:text-indigo-600"
          onClick={() =>
            onAdd(col.id)
          }
        >
          +
        </button>

      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3">

        <AnimatePresence>

          {tasks.map((task) => (

            <KanbanCard
              key={task.id}
              task={task}
              colId={col.id}
              onOpen={onOpen}
              onDragStart={
                onDragStart
              }
            />

          ))}

        </AnimatePresence>

        {tasks.length === 0 && (

          <div className="flex h-20 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400">
            No tasks
          </div>

        )}

      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   QUICK ADD
───────────────────────────────────────────── */

function QuickAddModal({
  colId,
  onAdd,
  onClose,
  workspaceMembers = [],
}) {

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("P2");
  const [assignee, setAssignee] = useState(workspaceMembers[0]?.name || "");
  const [label, setLabel] = useState("Frontend");
  const [due, setDue] = useState("");

  const submit = () => {

    if (!title.trim())
      return;

    onAdd(colId, {
      title,

      desc: "",

      priority,

      assignee,

      label,

      due,
    });

    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      onClick={onClose}
    >

      <motion.div
        className="w-[440px] rounded-2xl bg-white p-6"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        <h3 className="mb-4 text-base font-bold">
          Add Task
        </h3>

        <div className="space-y-3">

          <input
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
            placeholder="Task title..."
            value={title}
            onChange={(e) =>
              setTitle(
                e.target.value
              )
            }
          />

          <select
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
            value={priority}
            onChange={(e) =>
              setPriority(
                e.target.value
              )
            }
          >

            <option>
              P0
            </option>

            <option>
              P1
            </option>

            <option>
              P2
            </option>

          </select>

          <select
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value="">-- Unassigned --</option>
            {workspaceMembers.map((m) => (
              <option key={m.id || m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
            value={label}
            onChange={(e) =>
              setLabel(
                e.target.value
              )
            }
          >

            {ALL_LABELS.map(
              (l) => (

                <option
                  key={l}
                >
                  {l}
                </option>

              )
            )}

          </select>

          <input
            type="date"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
            value={due}
            onChange={(e) =>
              setDue(
                e.target.value
              )
            }
          />

        </div>

        <div className="mt-4 flex gap-2">

          <button
            className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white"
            onClick={submit}
          >
            Add Task
          </button>

          <button
            className="rounded-xl border border-gray-200 px-4 py-2.5"
            onClick={onClose}
          >
            Cancel
          </button>

        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */

export default function KanbanPage() {
  const { token } = useAuth();

  const [tasks, setTasks] =
    useState({
      todo: [],
      inprogress: [],
      review: [],
      done: [],
    });

  const [view, setView] =
    useState("board");

  const [addingTo, setAddingTo] =
    useState(null);

  const [openTask, setOpenTask] =
    useState(null);

  const [dragInfo, setDragInfo] =
    useState(null);

  const [dragOverCol, setDragOverCol] =
    useState(null);

  const [workspaceMembers, setWorkspaceMembers] = useState([]);

  const {
    pushNotification,
  } = useRealtime();

  /* FETCH WORKSPACE MEMBERS */
  useEffect(() => {
    const fetchMembers = async () => {
      if (!token) return;
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:4000/api"}/workspaces/${workspaceId}/members`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setWorkspaceMembers(data?.members || []);
      } catch (e) {
        console.error("Failed to fetch workspace members:", e);
      }
    };
    fetchMembers();
  }, [token]);

  /* FETCH TASKS */

  useEffect(() => {
    if (token) fetchTasks();
  }, [token]);

  const fetchTasks =
    async () => {
      if (!token) return;

      try {

        let projectId =
          localStorage.getItem(
            "projectId"
          );

        if (!projectId) {
          // Try to find a project from the active workspace
          const workspaceId = localStorage.getItem("workspaceId");
          if (workspaceId) {
            const { data: proj } = await supabase
              .from("projects")
              .select("id")
              .eq("workspace_id", workspaceId)
              .limit(1)
              .single();
            if (proj) {
              projectId = proj.id;
              localStorage.setItem("projectId", projectId);
            }
          }
          if (!projectId) return;
        }

        let data = [];
        try {
          const res = await taskApi.list({ projectId }, token);
          data = res.tasks || res || [];
        } catch (err) {
          console.error("Failed to fetch tasks via API:", err);
          const { data: dbData, error: dbError } = await supabase
            .from("tasks")
            .select("*")
            .eq("project_id", projectId);
          if (!dbError && dbData) {
            data = dbData;
          }
        }

        const grouped = {
          todo: [],
          inprogress: [],
          review: [],
          done: [],
        };

        data.forEach(
          (task) => {

            const formatted =
            {
              id: task.id,

              title:
                task.title,

              desc:
                task.description ||
                "",

              priority:
                task.priority ||
                "P2",

              assignee:
                task.assignee ||
                "Ankush",

              label:
                task.label ||
                "Frontend",

              due:
                task.due_date,
            };

            const status =
              task.status
                ?.toLowerCase()
                ?.replace(
                  /\s/g,
                  ""
                );

            if (
              grouped[
              status
              ]
            ) {

              grouped[
                status
              ].push(
                formatted
              );

            } else {

              grouped.todo.push(
                formatted
              );
            }
          }
        );

        setTasks(grouped);

      } catch (err) {

        console.error(err);
      }
    };

  /* DRAG */

  const handleDragStart =
    (
      taskId,
      fromCol
    ) => {

      setDragInfo({
        taskId,
        fromCol,
      });
    };

  const handleDragOver =
    (colId) => {

      setDragOverCol(
        colId
      );
    };

  const handleDrop =
    async (toCol) => {

      if (
        !dragInfo ||
        dragInfo.fromCol ===
        toCol
      ) {

        setDragInfo(null);

        setDragOverCol(null);

        return;
      }

      const task =
        tasks[
          dragInfo.fromCol
        ].find(
          (t) =>
            t.id ===
            dragInfo.taskId
        );

      if (!task) return;

      try {
        try {
          await taskApi.update(task.id, { status: toCol }, token);
        } catch (err) {
          console.error("Task API drag-drop update error, falling back...", err);
          await supabase
            .from("tasks")
            .update({
              status: toCol,
            })
            .eq("id", task.id);
        }

        setTasks((prev) => ({

          ...prev,

          [dragInfo.fromCol]:
            prev[
              dragInfo.fromCol
            ].filter(
              (t) =>
                t.id !==
                dragInfo.taskId
            ),

          [toCol]: [
            task,
            ...prev[toCol],
          ],
        }));

      } catch (err) {

        console.error(err);

      } finally {

        setDragInfo(null);

        setDragOverCol(null);
      }
    };

  /* ADD TASK */

  const addTask =
    async (
      colId,
      fields
    ) => {

      try {

        let projectId =
          localStorage.getItem(
            "projectId"
          );

        if (!projectId) {
          // Try to find a project from the active workspace
          const workspaceId = localStorage.getItem("workspaceId");
          if (workspaceId) {
            const { data: proj } = await supabase
              .from("projects")
              .select("id")
              .eq("workspace_id", workspaceId)
              .limit(1)
              .single();
            if (proj) {
              projectId = proj.id;
              localStorage.setItem("projectId", projectId);
            }
          }
          if (!projectId) {
            alert("No active project. Please select a project from the dashboard first.");
            return;
          }
        }

        let data;
        try {
          const res = await taskApi.create({
            project_id: projectId,
            title: fields.title,
            description: fields.desc,
            priority: fields.priority,
            assignee: fields.assignee,
            label: fields.label,
            due_date: fields.due || null,
            status: colId,
          }, token);
          data = res.task;
        } catch (err) {
          console.error("Task API creation error:", err);
          alert(err?.response?.data?.message || err.message || "Failed to create task");
          return;
        }

        if (!data?.id) {
          alert("Failed to create task: Empty task ID returned.");
          return;
        }



        const task = {
          id: data.id,

          title:
            data.title,

          desc:
            data.description,

          priority:
            data.priority,

          assignee:
            data.assignee,

          label:
            data.label,

          due:
            data.due_date,
        };

        setTasks((prev) => ({

          ...prev,

          [colId]: [
            task,
            ...prev[colId],
          ],
        }));

      } catch (err) {

        console.error(err);
      }
    };

  /* UPDATE TASK */
  const handleUpdateTask = async (colId, updatedTask) => {
    try {
      try {
        await taskApi.update(updatedTask.id, {
          title: updatedTask.title,
          description: updatedTask.desc,
          priority: updatedTask.priority,
          assignee: updatedTask.assignee,
          label: updatedTask.label,
          due_date: updatedTask.due || null,
        }, token);
      } catch (err) {
        console.error("Task API update error, falling back...", err);
        const { error } = await supabase
          .from("tasks")
          .update({
            title: updatedTask.title,
            description: updatedTask.desc,
            priority: updatedTask.priority,
            label: updatedTask.label,
            due_date: updatedTask.due || null,
          })
          .eq("id", updatedTask.id);
        if (error) {
          console.error(error);
          alert("Failed to update task: " + error.message);
          return;
        }
      }

      setTasks((prev) => ({
        ...prev,
        [colId]: prev[colId].map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      }));

    } catch (err) {
      console.error(err);
    }
  };

  /* MOVE TASK */
  const handleMoveTask = async (taskId, fromCol, toCol) => {
    const task = tasks[fromCol].find((t) => t.id === taskId);
    if (!task) return;

    try {
      try {
        await taskApi.update(taskId, { status: toCol }, token);
      } catch (err) {
        console.error("Task API move error, falling back...", err);
        const { error } = await supabase
          .from("tasks")
          .update({
            status: toCol,
          })
          .eq("id", taskId);
      }

      setTasks((prev) => ({
        ...prev,
        [fromCol]: prev[fromCol].filter((t) => t.id !== taskId),
        [toCol]: [task, ...prev[toCol]],
      }));

      setOpenTask(null);

    } catch (err) {
      console.error(err);
    }
  };

  /* DELETE TASK */
  const handleDeleteTask = async (colId, taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      try {
        await taskApi.delete(taskId, token);
      } catch (err) {
        console.error("Task API delete error, falling back...", err);
        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("id", taskId);

      }

      setTasks((prev) => ({
        ...prev,
        [colId]: prev[colId].filter((t) => t.id !== taskId),
      }));

      setOpenTask(null);

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppShell
      title="Kanban Board"
      subtitle="DevCollab Platform · Sprint 3"
      actions={

        <div className="flex items-center gap-3">

          <PresenceBar />

          <div className="flex rounded-xl border border-gray-200 bg-white p-1 gap-0.5">

            {[
              ["board", "⊞ Board"],
              ["list", "☰ List"],
            ].map(([v, label]) => (
              <button
                key={v}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${view === v
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setView(v)}
              >
                {label}
              </button>
            ))}

          </div>

          <button
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() =>
              setAddingTo(
                "todo"
              )
            }
          >
            + Add Task
          </button>

        </div>
      }
    >

      <AnimatePresence>

        {addingTo && (

          <QuickAddModal
            colId={addingTo}
            onAdd={addTask}
            onClose={() => setAddingTo(null)}
            workspaceMembers={workspaceMembers}
          />

        )}

      </AnimatePresence>

      <AnimatePresence>

        {openTask && (

          <TaskModal
            task={openTask.task}
            colId={openTask.colId}
            onClose={() => setOpenTask(null)}
            onUpdate={handleUpdateTask}
            onMove={handleMoveTask}
            onDelete={handleDeleteTask}
            workspaceMembers={workspaceMembers}
          />

        )}

      </AnimatePresence>

      {view === "board" && (
        <div
          className="flex gap-4 overflow-x-auto pb-4"
          onDragLeave={() => setDragOverCol(null)}
        >
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              col={col}
              tasks={tasks[col.id]}
              onAdd={setAddingTo}
              onOpen={(task, colId) => setOpenTask({ task, colId })}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragOver={dragOverCol === col.id}
            />
          ))}
        </div>
      )}

      {view === "list" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
        >
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_100px_90px_100px_100px_110px] gap-2 border-b border-gray-100 bg-gray-50/80 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
            <span>Task</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Assignee</span>
            <span>Label</span>
            <span>Due Date</span>
          </div>

          {/* Table Rows */}
          {COLUMNS.flatMap((col) =>
            (tasks[col.id] || []).map((task) => (
              <motion.div
                key={task.id}
                className="grid grid-cols-[1fr_100px_90px_100px_100px_110px] gap-2 items-center border-b border-gray-50 px-5 py-3 text-sm hover:bg-indigo-50/40 cursor-pointer transition-colors"
                whileHover={{ x: 2 }}
                onClick={() => setOpenTask({ task, colId: col.id })}
              >
                {/* Title */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${col.color}`} />
                  <span className="font-semibold text-gray-800 truncate">{task.title}</span>
                </div>

                {/* Status */}
                <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                  col.id === "done" ? "bg-green-50 text-green-600" :
                  col.id === "inprogress" ? "bg-blue-50 text-blue-600" :
                  col.id === "review" ? "bg-amber-50 text-amber-600" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {col.label}
                </span>

                {/* Priority */}
                <span className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-bold ${PRIORITY_COLORS[task.priority] || "bg-gray-100 text-gray-500"}`}>
                  {task.priority || "—"}
                </span>

                {/* Assignee */}
                <div className="flex items-center gap-1.5">
                  {task.assignee ? (
                    <>
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[task.assignee] || "from-gray-300 to-gray-400"} text-[8px] font-bold text-white`}>
                        {task.assignee[0]}
                      </div>
                      <span className="text-xs text-gray-600 truncate">{task.assignee}</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>

                {/* Label */}
                <span className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-medium ${LABEL_COLORS[task.label] || "bg-gray-100 text-gray-500"}`}>
                  {task.label || "—"}
                </span>

                {/* Due Date */}
                <span className={`text-xs ${
                  task.due && new Date(task.due) < new Date() && col.id !== "done"
                    ? "font-bold text-red-500"
                    : "text-gray-400"
                }`}>
                  {task.due
                    ? new Date(task.due).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "—"}
                </span>
              </motion.div>
            ))
          )}

          {/* Empty state */}
          {COLUMNS.every((col) => (tasks[col.id] || []).length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">📋</span>
              <p className="text-sm font-semibold text-gray-500">No tasks yet</p>
              <p className="text-xs text-gray-400 mt-1">Click "+ Add Task" to create your first task</p>
            </div>
          )}
        </motion.div>
      )}
    </AppShell>
  );
}