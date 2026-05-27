import { Router } from "express";
import createError from "http-errors";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  const authId = req.user.id;
  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_id", authId).single();
  if (!profile) return next(createError(404, "Profile not found"));

  const { data, error } = await supabase.from("notifications").select("*").eq("recipient_id", profile.id).order("created_at", { ascending: false });
  if (error) return next(error);
  res.json({ notifications: data });
});

router.post("/mark-read", requireAuth, async (req, res, next) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return next(createError(400, "Notification ids are required"));
  const { error } = await supabase.from("notifications").update({ read: true }).in("id", ids);
  if (error) return next(error);
  res.json({ status: "ok" });
});

export default router;
