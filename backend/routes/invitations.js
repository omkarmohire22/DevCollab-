import { Router } from "express";
import createError from "http-errors";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { sendInvitationEmail, buildInvitationHtml } from "../services/emailService.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// TEMP DEBUG — remove after fixing
router.get("/debug/status", async (req, res) => {
  const { data: invites } = await supabase
    .from("invitations")
    .select("id, email, status, workspace_id, token")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: wsMembers, error: wsErr } = await supabase
    .from("workspace_members")
    .select("*")
    .limit(20);

  const { data: pmembers } = await supabase
    .from("project_members")
    .select("*")
    .limit(20);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, workspace_id, name")
    .limit(20);

  // Check if invited users have profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("email", ["omimo2208@gmail.com", "shravanihajare07@gmail.com"]);

  // Check auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const relevantAuthUsers = authUsers?.users?.filter(u =>
    ["omimo2208@gmail.com", "shravanihajare07@gmail.com"].includes(u.email)
  ).map(u => ({ id: u.id, email: u.email, created_at: u.created_at }));

  res.json({
    invitations: invites || [],
    workspace_members: wsMembers || `ERROR: ${wsErr?.message}`,
    project_members: pmembers || [],
    projects: projects || [],
    profiles_for_invited_users: profiles || [],
    auth_users_for_invited: relevantAuthUsers || [],
  });
});

router.post("/", requireAuth, async (req, res, next) => {
  const { workspace_id, project_id, email, role = "Member" } = req.body;
  if (!workspace_id || !email) return next(createError(400, "Workspace and email are required"));

  const authId = req.user.id;

  // Fetch inviter profile and workspace name in parallel
  const [{ data: profile }, { data: workspace }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("auth_id", authId).single(),
    supabase.from("workspaces").select("name").eq("id", workspace_id).single(),
  ]);

  if (!profile) return next(createError(404, "Profile not found"));

  const token = uuidv4();
  const { data, error } = await supabase.from("invitations").insert([{
    workspace_id,
    project_id,
    email,
    role,
    token,
    invited_by: profile.id,
  }]).select().single();

  if (error) return next(error);

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const acceptUrl = `${clientUrl}/invite/${token}`;
  const inviterName = profile.full_name || profile.email || "A teammate";
  const workspaceName = workspace?.name || "DevCollab Workspace";
  const roleName = role.charAt(0).toUpperCase() + role.slice(1);

  sendInvitationEmail({
    to: email,
    subject: `${inviterName} invited you to join ${workspaceName} on DevCollab`,
    text: `${inviterName} has invited you to join ${workspaceName} as a ${roleName}.\n\nAccept your invitation here: ${acceptUrl}\n\nThis link expires in 7 days.`,
    html: buildInvitationHtml({ inviterName, workspaceName, role: roleName, acceptUrl }),
  }).catch((err) => console.error("❌ Email send failed:", err.message));

  res.status(201).json({ invitation: data });
});

router.get("/:token", async (req, res, next) => {
  const { token } = req.params;
  const { data, error } = await supabase
    .from("invitations")
    .select("*, workspaces(name)")
    .eq("token", token)
    .single();
  if (error) return next(error);
  res.json({ invitation: data });
});

router.post("/:token/accept", requireAuth, async (req, res, next) => {
  const { token } = req.params;

  // Fetch invitation
  const { data: invitation, error: invError } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .single();

  if (invError || !invitation) {
    console.error("Accept: invitation not found for token", token, invError?.message);
    return next(createError(404, "Invitation not found"));
  }

  if (invitation.status !== "pending") {
    return next(createError(400, "Invitation already processed"));
  }

  // Fetch accepting user's profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("auth_id", req.user.id)
    .single();

  if (profileError || !profile) {
    console.error("Accept: profile not found for auth_id", req.user.id, profileError?.message);
    return next(createError(404, "Profile not found — please complete your profile first"));
  }

  console.log(`Accept: profile ${profile.id} (${profile.email}) accepting invite to workspace ${invitation.workspace_id}`);

  // Try workspace_members — skip if table doesn't exist
  const { error: wmError } = await supabase.from("workspace_members").upsert([{
    workspace_id: invitation.workspace_id,
    profile_id: profile.id,
    role: invitation.role,
  }], { onConflict: "workspace_id,profile_id" });

  if (wmError) {
    console.error("workspace_members upsert error:", wmError.message, wmError.code);
    // If table doesn't exist (42P01), log clearly
    if (wmError.code === "42P01") {
      console.error("⚠️  workspace_members table does not exist! Run the SQL in schema.sql in Supabase.");
    }
  } else {
    console.log("✅ Added to workspace_members");
  }

  // Add to project_members
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_id", invitation.workspace_id);

  const projectIds = projects?.map((p) => p.id) || [];
  const targetProjectIds = invitation.project_id ? [invitation.project_id] : projectIds;

  if (targetProjectIds.length > 0) {
    const inserts = targetProjectIds.map((pid) => ({
      project_id: pid,
      profile_id: profile.id,
      role: invitation.role,
    }));
    const { error: pmError } = await supabase
      .from("project_members")
      .upsert(inserts, { onConflict: "project_id,profile_id" });
    if (pmError) console.error("project_members upsert error:", pmError.message);
    else console.log(`✅ Added to ${targetProjectIds.length} project(s)`);
  }

  // Mark invitation as accepted — this MUST succeed
  const { error: updateError } = await supabase
    .from("invitations")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", invitation.id);

  if (updateError) {
    console.error("Failed to mark invitation as accepted:", updateError.message);
    return next(updateError);
  }

  console.log(`✅ Invitation ${invitation.id} marked as accepted`);
  res.json({ status: "accepted", workspace_id: invitation.workspace_id });
});

router.post("/:id/resend", requireAuth, async (req, res, next) => {
  const { id } = req.params;

  const { data: invitation, error } = await supabase
    .from("invitations")
    .select("*, workspaces(name)")
    .eq("id", id)
    .single();

  if (error || !invitation) return next(createError(404, "Invitation not found"));
  if (invitation.status !== "pending") return next(createError(400, "Invitation already processed"));

  const authId = req.user.id;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("auth_id", authId)
    .single();

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const acceptUrl = `${clientUrl}/invite/${invitation.token}`;
  const inviterName = profile?.full_name || profile?.email || "A teammate";
  const workspaceName = invitation.workspaces?.name || "DevCollab Workspace";
  const roleName = invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1);

  sendInvitationEmail({
    to: invitation.email,
    subject: `Reminder: ${inviterName} invited you to join ${workspaceName} on DevCollab`,
    text: `${inviterName} has invited you to join ${workspaceName} as a ${roleName}.\n\nAccept your invitation here: ${acceptUrl}\n\nThis link expires in 7 days.`,
    html: buildInvitationHtml({ inviterName, workspaceName, role: roleName, acceptUrl }),
  }).catch((err) => console.error("❌ Resend email failed:", err.message));

  res.json({ success: true });
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const { error } = await supabase.from("invitations").delete().eq("id", id);
  if (error) return next(error);
  res.json({ success: true });
});

export default router;

