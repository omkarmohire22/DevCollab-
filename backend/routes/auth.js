import { Router } from "express";
import createError from "http-errors";
import { supabase } from "../config/supabase.js";

const router = Router();

router.post("/validate", async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "") || null;
  if (!token) return next(createError(401, "Missing auth token"));

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return next(createError(401, error?.message || "Invalid token"));

  res.json({ user: data.user });
});

router.post("/password-reset", async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(createError(400, "Email is required"));

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.CLIENT_URL || "http://localhost:5173"}/`,
  });

  if (error) return next(createError(400, error.message));
  res.json({ status: "sent", data });
});

export default router;
