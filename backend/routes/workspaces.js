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
      return res.json({ workspaces: [] });
    }

    const { data: workspaces, error: wsError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("owner_id", profile.id);

    if (wsError) return next(wsError);
    res.json({ workspaces: workspaces || [] });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  const authId = req.user.id;
  const { name, description, slug, plan = "Pro" } = req.body;
  if (!name || !slug) return next(createError(400, "Workspace name and slug are required"));

  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_id", authId).single();
  if (!profile) return next(createError(404, "Profile not found"));

  const { data, error } = await supabase.from("workspaces").insert([{ name, description, slug, owner_id: profile.id, plan }]).select().single();
  if (error) return next(error);

  res.status(201).json({ workspace: data });
});

router.get("/:id", requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("workspaces").select("*").eq("id", id).single();
  if (error) return next(error);
  res.json({ workspace: data });
});

router.put("/:id", requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const { name, description, slug, owner_id } = req.body;

  const authId = req.user.id;
  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_id", authId).single();
  if (!profile) return next(createError(404, "Profile not found"));

  const { data: workspace } = await supabase.from("workspaces").select("owner_id").eq("id", id).single();
  if (!workspace) return next(createError(404, "Workspace not found"));
  if (workspace.owner_id !== profile.id) {
    return next(createError(403, "Only the owner can update the workspace"));
  }

  const updates = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (slug !== undefined) updates.slug = slug;
  if (owner_id !== undefined) updates.owner_id = owner_id;

  const { data, error } = await supabase
    .from("workspaces")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return next(error);
  res.json({ workspace: data });
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  const { id } = req.params;

  const authId = req.user.id;
  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_id", authId).single();
  if (!profile) return next(createError(404, "Profile not found"));

  const { data: workspace } = await supabase.from("workspaces").select("owner_id").eq("id", id).single();
  if (!workspace) return next(createError(404, "Workspace not found"));
  if (workspace.owner_id !== profile.id) {
    return next(createError(403, "Only the owner can delete the workspace"));
  }

  const { error } = await supabase.from("workspaces").delete().eq("id", id);
  if (error) return next(error);

  res.json({ success: true });
});

router.get("/:id/members", requireAuth, async (req, res, next) => {
  const { id } = req.params;
  try {
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", id)
      .single();

    if (wsError || !workspace) return next(createError(404, "Workspace not found"));

    const membersMap = new Map();

    // 1. Always include the owner
    if (workspace.owner_id) {
      const { data: owner } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", workspace.owner_id)
        .single();
      if (owner) {
        membersMap.set(owner.id, {
          id: owner.id,
          name: owner.full_name,
          email: owner.email,
          role: "Owner",
          avatar: owner.avatar_url,
          joined: new Date(workspace.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          online: true,
        });
      }
    }

    // 2. Get members from accepted invitations (most reliable source)
    const { data: acceptedInvites } = await supabase
      .from("invitations")
      .select("email, role, updated_at")
      .eq("workspace_id", id)
      .eq("status", "accepted");

    if (acceptedInvites && acceptedInvites.length > 0) {
      const emails = acceptedInvites.map((i) => i.email);
      const { data: invitedProfiles } = await supabase
        .from("profiles")
        .select("*")
        .in("email", emails);

      const inviteMap = new Map(acceptedInvites.map((i) => [i.email, i]));
      const profilesByEmail = new Map((invitedProfiles || []).map((p) => [p.email, p]));

      for (const invite of acceptedInvites) {
        const profile = profilesByEmail.get(invite.email);
        const profileId = profile?.id || invite.email; // fallback key
        if (!membersMap.has(profileId)) {
          membersMap.set(profileId, {
            id: profile?.id || invite.email,
            name: profile?.full_name || invite.email.split("@")[0],
            email: invite.email,
            role: invite.role
              ? invite.role.charAt(0).toUpperCase() + invite.role.slice(1)
              : "Member",
            avatar: null,
            joined: invite.updated_at
              ? new Date(invite.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "",
            online: false,
          });
        }
      }
    }

    // 3. Also include project_members as additional source
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("workspace_id", id);

    const projectIds = projects?.map((p) => p.id) || [];

    if (projectIds.length > 0) {
      const { data: pmembers } = await supabase
        .from("project_members")
        .select("*")
        .in("project_id", projectIds);

      if (pmembers && pmembers.length > 0) {
        const pmProfileIds = [...new Set(pmembers.map((m) => m.profile_id))];
        const { data: pmProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", pmProfileIds);

        const pmProfileMap = new Map((pmProfiles || []).map((p) => [p.id, p]));

        for (const pm of pmembers) {
          const profile = pmProfileMap.get(pm.profile_id);
          if (profile && !membersMap.has(profile.id)) {
            membersMap.set(profile.id, {
              id: profile.id,
              name: profile.full_name,
              email: profile.email,
              role: pm.role
                ? pm.role.charAt(0).toUpperCase() + pm.role.slice(1)
                : "Member",
              avatar: profile.avatar_url,
              joined: new Date(pm.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              online: false,
            });
          }
        }
      }
    }

    res.json({ members: Array.from(membersMap.values()) });
  } catch (err) {
    next(err);
  }
});

router.put("/:id/members/:profileId", requireAuth, async (req, res, next) => {
  const { id: workspaceId, profileId } = req.params;
  const { role } = req.body;

  if (!role) return next(createError(400, "Role is required"));

  try {
    const authId = req.user.id;
    const { data: requesterProfile } = await supabase.from("profiles").select("id").eq("auth_id", authId).single();
    if (!requesterProfile) return next(createError(404, "Requester profile not found"));

    const { data: workspace } = await supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single();
    if (!workspace) return next(createError(404, "Workspace not found"));
    if (workspace.owner_id !== requesterProfile.id) {
      return next(createError(403, "Only the workspace owner can change member roles"));
    }

    // Update workspace_members
    await supabase
      .from("workspace_members")
      .update({ role })
      .eq("workspace_id", workspaceId)
      .eq("profile_id", profileId);

    // Also update project_members for consistency
    const { data: projects } = await supabase.from("projects").select("id").eq("workspace_id", workspaceId);
    const projectIds = projects?.map((p) => p.id) || [];
    if (projectIds.length > 0) {
      await supabase
        .from("project_members")
        .update({ role })
        .eq("profile_id", profileId)
        .in("project_id", projectIds);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/members/:profileId", requireAuth, async (req, res, next) => {
  const { id: workspaceId, profileId } = req.params;
  try {
    const authId = req.user.id;
    const { data: requesterProfile } = await supabase.from("profiles").select("id").eq("auth_id", authId).single();
    if (!requesterProfile) return next(createError(404, "Requester profile not found"));

    const { data: workspace } = await supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single();
    if (!workspace) return next(createError(404, "Workspace not found"));
    if (workspace.owner_id !== requesterProfile.id) {
      return next(createError(403, "Only the workspace owner can remove members"));
    }

    // Remove from workspace_members
    await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("profile_id", profileId);

    // Also remove from all project_members in this workspace
    const { data: projects } = await supabase.from("projects").select("id").eq("workspace_id", workspaceId);
    const projectIds = projects?.map((p) => p.id) || [];
    if (projectIds.length > 0) {
      await supabase
        .from("project_members")
        .delete()
        .eq("profile_id", profileId)
        .in("project_id", projectIds);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/invites", requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("workspace_id", id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return next(error);
  res.json({ invites: data });
});

export default router;
