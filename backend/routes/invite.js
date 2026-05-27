import express from "express";
import { Resend } from "resend";

const router = express.Router();

const resend = new Resend(
    process.env.RESEND_API_KEY
);

router.post("/send-invite", async (req, res) => {
    try {
        const {
            email,
            workspaceName,
            invitedBy,
            role,
            inviteLink,
        } = req.body;

        const data = await resend.emails.send({
            from: "DevCollab <onboarding@resend.dev>",
            to: email,
            subject: `Invitation to join ${workspaceName}`,
            html: `
        <div style="font-family:sans-serif;padding:20px">
          <h2>You're invited to join ${workspaceName}</h2>

          <p>
            <strong>${invitedBy}</strong>
            invited you as
            <strong>${role}</strong>
          </p>

          <a
            href="${inviteLink}"
            style="
              display:inline-block;
              margin-top:20px;
              background:#4f46e5;
              color:white;
              padding:12px 20px;
              border-radius:8px;
              text-decoration:none;
            "
          >
            Join Workspace
          </a>
        </div>
      `,
        });

        res.json({
            success: true,
            data,
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message,
        });
    }
});

export default router;