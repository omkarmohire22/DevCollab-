import { Router } from "express";
import createError from "http-errors";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  const { projectId } = req.query;
  const query = supabase.from("tasks").select("*");
  if (projectId) query.eq("project_id", projectId);
  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) return next(error);
  res.json({ tasks: data });
});

router.post("/", requireAuth, async (req, res, next) => {
  const { project_id, title, description, status = "todo", priority = "P2", label = "Frontend", assignee, assignee_id, due_date, attachments = [] } = req.body;
  if (!project_id || !title) return next(createError(400, "Project and title are required"));

  const authId = req.user.id;
  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_id", authId).single();
  if (!profile) return next(createError(404, "Profile not found"));

  const { data, error } = await supabase.from("tasks").insert([{
    project_id,
    title,
    description,
    status,
    priority,
    label,
    assignee_id: assignee_id || null,
    due_date,
    attachments,
    created_by: profile.id,
  }]).select().single();

  if (error) return next(error);

  // Attach the assignee display name to the response (not stored in DB)
  if (data && assignee) data.assignee = assignee;

  // LOG ACTIVITY
  try {
    await supabase.from("activity_feed").insert([{
      project_id,
      actor_id: profile.id,
      action: "created task",
      target: title,
      metadata: { type: "task", detail: `Priority: ${priority} · Label: ${label}` }
    }]);
  } catch (err) {
    console.error("Activity logging failed:", err);
  }

  res.status(201).json({ task: data });
});

router.put("/:id", requireAuth, async (req, res, next) => {
  const { id } = req.params;

  // Whitelist only valid DB columns to prevent PGRST errors from unknown fields
  const ALLOWED_FIELDS = ["title", "description", "status", "priority", "label", "assignee_id", "due_date", "attachments"];
  const updates = { updated_at: new Date().toISOString() };
  for (const key of ALLOWED_FIELDS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
  if (error) return next(error);

  // Attach frontend-only fields back to the response
  if (data && req.body.assignee) data.assignee = req.body.assignee;

  // LOG ACTIVITY
  try {
    const authId = req.user.id;
    const { data: profile } = await supabase.from("profiles").select("id").eq("auth_id", authId).single();
    if (profile) {
      let actionText = "updated task";
      let detailText = `Updated fields on task`;
      
      if (req.body.status) {
        actionText = "moved";
        detailText = `Moved to ${req.body.status}`;
      } else if (req.body.assignee_id || req.body.assignee) {
        actionText = "reassigned task";
        detailText = `Assigned task to ${req.body.assignee || "new owner"}`;
      }
      
      await supabase.from("activity_feed").insert([{
        project_id: data.project_id,
        actor_id: profile.id,
        action: actionText,
        target: data.title,
        metadata: { type: "task", detail: detailText }
      }]);
    }
  } catch (err) {
    console.error("Activity logging failed:", err);
  }

  // LOG NOTIFICATION ON ASSIGNMENT
  try {
    if (req.body.assignee_id && req.body.assignee_id !== data.created_by) {
      await supabase.from("notifications").insert([{
        recipient_id: req.body.assignee_id,
        type: "task_assign",
        title: "New task assigned",
        message: `You have been assigned the task: "${data.title}"`,
        link: `/kanban`
      }]);
    }
  } catch (err) {
    console.error("Assignment notification logging failed:", err);
  }

  res.json({ task: data });
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return next(error);
  res.status(204).send();
});

router.post("/:id/comments", requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const { body } = req.body;
  if (!body) return next(createError(400, "Comment body is required"));

  const authId = req.user.id;
  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_id", authId).single();
  if (!profile) return next(createError(404, "Profile not found"));

  const { data, error } = await supabase.from("task_comments").insert([{
    task_id: id,
    author_id: profile.id,
    body,
  }]).select().single();

  if (error) return next(error);

  // LOG ACTIVITY & PERSISTENT NOTIFICATION
  try {
    const { data: task } = await supabase.from("tasks").select("project_id, title, created_by, assignee_id").eq("id", id).single();
    if (task) {
      // 1. Log to activity feed
      await supabase.from("activity_feed").insert([{
        project_id: task.project_id,
        actor_id: profile.id,
        action: "commented on",
        target: task.title,
        metadata: { type: "comment", detail: body.length > 50 ? body.substring(0, 50) + "..." : body }
      }]);

      // 2. Insert notifications for related users (creator & assignee) except the comment author
      const recipients = [task.created_by, task.assignee_id].filter(r => r && r !== profile.id);
      
      for (const rId of recipients) {
        await supabase.from("notifications").insert([{
          recipient_id: rId,
          type: "comment",
          title: `New Comment`,
          message: `${profile.full_name || "Someone"} commented on task "${task.title}": "${body.substring(0, 40)}"`,
          link: `/kanban`
        }]);
      }
    }
  } catch (err) {
    console.error("Activity/Notification logging failed:", err);
  }

  res.status(201).json({ comment: data });
});

// ANALYTICS ENDPOINT FOR DEVPULSE
router.get("/analytics", requireAuth, async (req, res, next) => {
  const { projectId } = req.query;
  if (!projectId) return next(createError(400, "projectId is required"));

  try {
    // Fetch all tasks for the project
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId);

    if (error) return next(error);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Group tasks by assignee
    const memberStats = {};

    tasks.forEach((task) => {
      const assigneeId = task.assignee_id;
      const assigneeName = task.assignee || "Unassigned";
      
      if (!assigneeId || assigneeName === "Unassigned") return;

      if (!memberStats[assigneeId]) {
        memberStats[assigneeId] = {
          assignee_id: assigneeId,
          assignee_name: assigneeName,
          total_tasks: 0,
          completed_tasks: 0,
          in_progress_tasks: 0,
          todo_tasks: 0,
          overdue_tasks: 0,
          completed_on_time: 0,
          completed_late: 0,
          avg_completion_days: 0,
          tasks_last_7_days: 0,
          tasks_last_30_days: 0,
          high_priority_tasks: 0,
          completion_rate: 0,
          velocity_7d: 0,
          velocity_30d: 0,
        };
      }

      const stats = memberStats[assigneeId];
      stats.total_tasks++;

      // Status breakdown
      if (task.status === "done") {
        stats.completed_tasks++;
        
        // Check if completed on time
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          const completedDate = new Date(task.updated_at);
          
          if (completedDate <= dueDate) {
            stats.completed_on_time++;
          } else {
            stats.completed_late++;
          }

          // Calculate completion time
          const createdDate = new Date(task.created_at);
          const completionDays = (completedDate - createdDate) / (1000 * 60 * 60 * 24);
          stats.avg_completion_days += completionDays;
        }

        // Velocity tracking
        const updatedDate = new Date(task.updated_at);
        if (updatedDate >= sevenDaysAgo) stats.tasks_last_7_days++;
        if (updatedDate >= thirtyDaysAgo) stats.tasks_last_30_days++;
      } else if (task.status === "in-progress") {
        stats.in_progress_tasks++;
      } else if (task.status === "todo") {
        stats.todo_tasks++;
      }

      // Overdue check
      if (task.status !== "done" && task.due_date) {
        const dueDate = new Date(task.due_date);
        if (dueDate < now) {
          stats.overdue_tasks++;
        }
      }

      // Priority tracking
      if (task.priority === "P0" || task.priority === "P1") {
        stats.high_priority_tasks++;
      }
    });

    // Calculate derived metrics
    Object.values(memberStats).forEach((stats) => {
      if (stats.completed_tasks > 0) {
        stats.avg_completion_days = Math.round(stats.avg_completion_days / stats.completed_tasks);
        stats.completion_rate = Math.round((stats.completed_tasks / stats.total_tasks) * 100);
      }
      
      stats.velocity_7d = stats.tasks_last_7_days;
      stats.velocity_30d = stats.tasks_last_30_days;

      // Calculate burnout score (0-100)
      const openTasks = stats.total_tasks - stats.completed_tasks;
      const overdueWeight = stats.overdue_tasks * 20;
      const highPriorityWeight = stats.high_priority_tasks * 10;
      const inProgressWeight = stats.in_progress_tasks * 5;
      const workloadWeight = Math.min(openTasks * 8, 40);
      
      stats.burnout_score = Math.min(100, overdueWeight + highPriorityWeight + inProgressWeight + workloadWeight);
      
      // On-time delivery rate
      const totalCompleted = stats.completed_on_time + stats.completed_late;
      stats.on_time_rate = totalCompleted > 0 
        ? Math.round((stats.completed_on_time / totalCompleted) * 100) 
        : 100;
    });

    // Team-wide aggregates
    const memberList = Object.values(memberStats);
    const teamAggregates = {
      total_members: memberList.length,
      avg_burnout: memberList.length > 0 
        ? Math.round(memberList.reduce((sum, m) => sum + m.burnout_score, 0) / memberList.length)
        : 0,
      total_tasks: tasks.length,
      completed_tasks: tasks.filter(t => t.status === "done").length,
      overdue_tasks: tasks.filter(t => t.status !== "done" && t.due_date && new Date(t.due_date) < now).length,
      avg_completion_rate: memberList.length > 0
        ? Math.round(memberList.reduce((sum, m) => sum + m.completion_rate, 0) / memberList.length)
        : 0,
      high_burnout_members: memberList.filter(m => m.burnout_score >= 70).length,
    };

    res.json({
      success: true,
      team_aggregates: teamAggregates,
      member_stats: memberList,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return next(err);
  }
});

export default router;
