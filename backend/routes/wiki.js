import { Router } from "express";
import createError from "http-errors";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();


// GET ALL PAGES
router.get("/", requireAuth, async (req, res, next) => {
  const { projectId } = req.query;

  let query = supabase
    .from("wiki_pages")
    .select("*");

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query.order(
    "updated_at",
    {
      ascending: false,
    }
  );

  if (error) return next(error);

  res.json({
    pages: data,
  });
});


// CREATE PAGE
router.post("/", requireAuth, async (req, res, next) => {
  const {
    project_id,
    title,
    content,
    slug,
  } = req.body;

  if (!project_id || !title || !slug) {
    return next(
      createError(
        400,
        "Project, title, and slug are required"
      )
    );
  }

  const authId = req.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_id", authId)
    .single();

  if (!profile) {
    return next(
      createError(404, "Profile not found")
    );
  }

  const { data, error } = await supabase
    .from("wiki_pages")
    .insert([
      {
        project_id,
        title,
        content,
        slug,
        updated_by: profile.id,
      },
    ])
    .select()
    .single();

  if (error) return next(error);

  // LOG ACTIVITY
  try {
    await supabase.from("activity_feed").insert([{
      project_id,
      actor_id: profile.id,
      action: "created wiki",
      target: title,
      metadata: { type: "wiki", detail: "Created Wiki Page" }
    }]);
  } catch (err) {
    console.error("Activity logging failed:", err);
  }

  res.status(201).json({
    page: data,
  });
});


// UPDATE PAGE
router.put("/:id", requireAuth, async (req, res, next) => {
  const { id } = req.params;

  const updates = {
    ...req.body,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("wiki_pages")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return next(error);

  // LOG ACTIVITY
  try {
    const authId = req.user.id;
    const { data: profile } = await supabase.from("profiles").select("id").eq("auth_id", authId).single();
    if (profile) {
      await supabase.from("activity_feed").insert([{
        project_id: data.project_id,
        actor_id: profile.id,
        action: "updated wiki",
        target: data.title,
        metadata: { type: "wiki", detail: `Added updates` }
      }]);
    }
  } catch (err) {
    console.error("Activity logging failed:", err);
  }

  res.json({
    page: data,
  });
});


// DELETE PAGE
router.delete("/:id", requireAuth, async (req, res, next) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("wiki_pages")
    .delete()
    .eq("id", id);

  if (error) return next(error);

  res.json({
    success: true,
  });
});

export default router;