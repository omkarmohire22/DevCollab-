import { Router } from "express";
import createError from "http-errors";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Sandbox card validation — mirrors Stripe test card behavior
const SANDBOX_CARDS = {
  "4242424242424242": { status: "success",  brand: "visa"       },
  "4000056655665556": { status: "success",  brand: "visa"       },
  "5555555555554444": { status: "success",  brand: "mastercard" },
  "378282246310005":  { status: "success",  brand: "amex"       },
  "6011111111111117": { status: "success",  brand: "discover"   },
  "4000000000000002": { status: "declined", brand: "visa"       },
  "4000000000009995": { status: "declined", brand: "visa"       },
  "4000000000003220": { status: "3ds",      brand: "visa"       },
};

function detectBrand(number) {
  const n = number.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^6011/.test(n)) return "discover";
  return "unknown";
}

// POST /api/payments/checkout
router.post("/checkout", requireAuth, async (req, res, next) => {
  const { workspace_id, plan_id, billing_cycle = "monthly", card_number, card_name, card_expiry, card_cvv } = req.body;

  if (!workspace_id || !plan_id || !card_number) {
    return next(createError(400, "workspace_id, plan_id and card_number are required"));
  }

  const authId = req.user.id;
  const { data: profile } = await supabase.from("profiles").select("id, full_name").eq("auth_id", authId).single();
  if (!profile) return next(createError(404, "Profile not found"));

  // Validate workspace ownership
  const { data: workspace } = await supabase.from("workspaces").select("id, owner_id, plan").eq("id", workspace_id).single();
  if (!workspace) return next(createError(404, "Workspace not found"));
  if (workspace.owner_id !== profile.id) return next(createError(403, "Only the workspace owner can change the plan"));

  // Sandbox card check
  const cleanNumber = card_number.replace(/\s/g, "");
  const cardResult = SANDBOX_CARDS[cleanNumber];
  const brand = cardResult?.brand || detectBrand(cleanNumber);
  const last4 = cleanNumber.slice(-4);

  // Determine amount
  const PRICES = { free: 0, pro: 12 };
  const basePrice = PRICES[plan_id] ?? 12;
  const amount = billing_cycle === "yearly" ? Math.round(basePrice * 0.8 * 12 * 100) / 100 : basePrice;

  // Handle sandbox outcomes
  if (cardResult?.status === "declined") {
    return res.status(402).json({ error: "Your card was declined.", code: "card_declined" });
  }
  if (cardResult?.status === "3ds") {
    return res.status(402).json({ error: "This card requires 3D Secure authentication.", code: "requires_3ds" });
  }

  // Free plan — no charge needed
  if (plan_id === "free") {
    await supabase.from("workspaces").update({ plan: "free", updated_at: new Date().toISOString() }).eq("id", workspace_id);
    return res.json({ status: "success", plan: "free", amount: 0, message: "Downgraded to Free plan" });
  }

  // Generate invoice ID
  const invoiceId = `INV-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;

  // Store transaction
  const { data: transaction, error: txError } = await supabase.from("transactions").insert([{
    workspace_id,
    profile_id: profile.id,
    plan: plan_id,
    amount,
    billing_cycle,
    status: "success",
    card_last4: last4,
    card_brand: brand,
    invoice_id: invoiceId,
  }]).select().single();

  if (txError) {
    console.error("Transaction insert error:", txError.message);
    // Continue even if transaction logging fails
  }

  // Update workspace plan
  const { error: planError } = await supabase
    .from("workspaces")
    .update({ plan: plan_id, updated_at: new Date().toISOString() })
    .eq("id", workspace_id);

  if (planError) return next(planError);

  // Log activity
  try {
    const { data: projects } = await supabase.from("projects").select("id").eq("workspace_id", workspace_id).limit(1);
    if (projects?.[0]) {
      await supabase.from("activity_feed").insert([{
        project_id: projects[0].id,
        actor_id: profile.id,
        action: "upgraded plan",
        target: `${plan_id} (${billing_cycle})`,
        metadata: { type: "billing", detail: `Upgraded to ${plan_id} plan · $${amount}` }
      }]);
    }
  } catch (e) { /* non-critical */ }

  res.json({
    status: "success",
    plan: plan_id,
    amount,
    invoice_id: invoiceId,
    card_brand: brand,
    card_last4: last4,
    billing_cycle,
    message: `Successfully upgraded to ${plan_id} plan`,
  });
});

// GET /api/payments/transactions
router.get("/transactions", requireAuth, async (req, res, next) => {
  const authId = req.user.id;
  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_id", authId).single();
  if (!profile) return next(createError(404, "Profile not found"));

  const workspaceId = req.query.workspace_id;
  if (!workspaceId) return next(createError(400, "workspace_id is required"));

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) return next(error);
  res.json({ transactions: data || [] });
});

export default router;
