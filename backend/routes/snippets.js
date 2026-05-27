import { Router } from "express";
import createError from "http-errors";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  const { projectId, search } = req.query;
  let query = supabase.from("snippets").select(`*, author:profiles(id,full_name,avatar_url)`);
  if (projectId) query = query.eq("project_id", projectId);
  if (search) query = query.ilike("title", `%${search}%`).or(`description.ilike.%${search}%,code.ilike.%${search}%`);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return next(error);
  res.json({ snippets: data });
});

router.post("/", requireAuth, async (req, res, next) => {
  const { project_id, title, language, tags = [], description, code } = req.body;
  if (!project_id || !title || !language || !code) return next(createError(400, "Project, title, language and code are required"));

  const authId = req.user.id;
  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_id", authId).single();
  if (!profile) return next(createError(404, "Profile not found"));

  const { data, error } = await supabase.from("snippets").insert([{
    project_id,
    title,
    language,
    tags,
    description,
    code,
    author_id: profile.id,
  }]).select().single();

  if (error) return next(error);

  // LOG ACTIVITY
  try {
    await supabase.from("activity_feed").insert([{
      project_id,
      actor_id: profile.id,
      action: "created snippet",
      target: title,
      metadata: { type: "snippet", detail: `${language} · ${description || ""}` }
    }]);
  } catch (err) {
    console.error("Activity logging failed:", err);
  }

  res.status(201).json({ snippet: data });
});

router.put("/:id", requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const updates = { ...req.body, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("snippets").update(updates).eq("id", id).select().single();
  if (error) return next(error);

  // LOG ACTIVITY
  try {
    const authId = req.user.id;
    const { data: profile } = await supabase.from("profiles").select("id").eq("auth_id", authId).single();
    if (profile) {
      await supabase.from("activity_feed").insert([{
        project_id: data.project_id,
        actor_id: profile.id,
        action: "updated snippet",
        target: data.title,
        metadata: { type: "snippet", detail: `Updated ${data.language} snippet` }
      }]);
    }
  } catch (err) { console.error("Activity logging failed:", err); }

  res.json({ snippet: data });
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const { error } = await supabase.from("snippets").delete().eq("id", id);
  if (error) return next(error);
  res.status(204).send();
});

export default router;
