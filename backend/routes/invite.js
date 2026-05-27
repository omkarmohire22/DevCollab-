import express from "express";
import { sendInvitationEmail, buildInvitationHtml } from "../services/emailService.js";

const router = express.Router();

router.post("/send-invite", async (req, res) => {
  try {
    const { email, workspaceName, invitedBy, role, inviteLink } = req.body;

    if (!email || !workspaceName || !inviteLink) {
      return res.status(400).json({ error: "email, workspaceName and inviteLink are required" });
    }

    const html = buildInvitationHtml({
      inviterName: invitedBy || "A team member",
      workspaceName,
      role: role || "Member",
      acceptUrl: inviteLink,
    });

    await sendInvitationEmail({
      to: email,
      subject: `You're invited to join ${workspaceName} on DevCollab`,
      text: `${invitedBy || "Someone"} invited you to join ${workspaceName} as ${role || "Member"}. Accept here: ${inviteLink}`,
      html,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("send-invite error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
