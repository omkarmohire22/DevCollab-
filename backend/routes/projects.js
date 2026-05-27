import { Router } from "express";
import createError from "http-errors";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  const authId = req.user.id;
  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_id", authId)
      .single();

    if (profileError || !profile) {
      return res.json({ projects: [] });
    }

    const { data: projects, error: projError } = await supabase
      .from("projects")
      .select("*")
      .eq("created_by", profile.id);

    if (projError) return next(projError);
    res.json({ projects: projects || [] });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  const { name, description, workspace_id } = req.body;
  if (!name || !workspace_id) return next(createError(400, "Project name and workspace id are required"));

  const authId = req.user.id;
  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_id", authId).single();
  if (!profile) return next(createError(404, "Profile not found"));

  const { data, error } = await supabase.from("projects").insert([{
    name,
    description,
    workspace_id,
    created_by: profile.id,
  }]).select().single();

  if (error) return next(error);
  res.status(201).json({ project: data });
});

router.get("/:id", requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("projects").select("*, workspaces(name,slug), members:project_members(*), tasks(*)").eq("id", id).single();
  if (error) return next(error);
  res.json({ project: data });
});

export default router;
