import createError from "http-errors";
import { supabase } from "../config/supabase.js";

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return next(createError(401, "Authorization token missing"));
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return next(createError(401, error?.message || "Invalid session"));
  }

  req.user = data.user;
  next();
}
