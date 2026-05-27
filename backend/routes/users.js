import { Router } from "express";
import createError from "http-errors";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, async (req, res, next) => {
  const authId = req.user.id;
  
  try {
    // Try to get existing profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("auth_id", authId)
      .single();

    if (profile) {
      // Fetch workspaces, projects, and notifications in parallel to avoid direct joining PGRST200 cache errors
      const [wsRes, projRes, notifRes] = await Promise.all([
        supabase.from("workspaces").select("id,name,slug").eq("owner_id", profile.id),
        supabase.from("projects").select("id,name,status").eq("created_by", profile.id),
        supabase.from("notifications").select("*").eq("recipient_id", profile.id).order("created_at", { ascending: false })
      ]);

      const profileData = {
        ...profile,
        workspaces: wsRes.data || [],
        projects: projRes.data || [],
        notifications: notifRes.data || []
      };

      return res.json({ profile: profileData });
    }

    // If profile doesn't exist, create it
    if (error?.code === "PGRST116") {
      const fullName = req.user.user_metadata?.full_name || req.user.email.split("@")[0];
      
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          auth_id: authId,
          email: req.user.email,
          full_name: fullName,
        })
        .select()
        .single();

      if (createError) {
        return next(createError);
      }

      const profileData = {
        ...newProfile,
        workspaces: [],
        projects: [],
        notifications: []
      };

      return res.json({ profile: profileData });
    }

    // Other errors
    if (error) {
      return next(error);
    }
  } catch (err) {
    return next(err);
  }
});

router.put("/me", requireAuth, async (req, res, next) => {
  const authId = req.user.id;
  const updates = { ...req.body, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("auth_id", authId)
    .select()
    .single();

  if (error) return next(error);
  res.json({ profile: data });
});

router.get("/:id", async (req, res, next) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (error) return next(error);
  res.json({ profile: data });
});

export default router;
