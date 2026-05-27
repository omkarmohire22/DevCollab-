import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  detectBrand,
  formatCardInput,
  formatExpiry,
  cardLength,
  simulatePayment,
  validateForm,
  TEST_CARDS,
} from "../lib/paymentSandbox";

/* ─────────────────────────────────────────────────────
Brand Indicators
───────────────────────────────────────────────────── */
function BrandIcon({ brand }) {
  if (brand === "visa") {
    return (
      <svg viewBox="0 0 60 20" style={{ height: 18, width: "auto" }}>
        <text y="16" fontFamily="Arial,sans-serif" fontWeight="900" fontSize="18" fill="#1434CB" fontStyle="italic">
          VISA
        </text>
      </svg>
    );
  }
  if (brand === "mastercard") {
    return (
      <svg viewBox="0 0 38 24" style={{ height: 22, width: "auto" }}>
        <circle cx="13" cy="12" r="12" fill="#EB001B" />
        <circle cx="25" cy="12" r="12" fill="#F79E1B" />
        <path d="M19 3.6a12 12 0 0 1 0 16.8A12 12 0 0 1 19 3.6z" fill="#FF5F00" />
      </svg>
    );
  }
  if (brand === "amex") {
    return (
      <svg viewBox="0 0 50 20" style={{ height: 16, width: "auto" }}>
        <rect width="50" height="20" rx="3" fill="#2E77BC" />
        <text x="4" y="14" fontFamily="Arial,sans-serif" fontWeight="900" fontSize="10" fill="white">
          AMEX
        </text>
      </svg>
    );
  }
  if (brand === "discover") {
    return (
      <svg viewBox="0 0 70 22" style={{ height: 16, width: "auto" }}>
        <text y="16" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="11" fill="#FF6000">
          DISCOVER
        </text>
      </svg>
    );
  }
  // Generic card icon
  return (
    <svg width="22" height="16" viewBox="0 0 24 18" fill="none" stroke="#9ca3af" strokeWidth="1.5">
      <rect x="1" y="1" width="22" height="16" rx="2" />
      <path d="M1 6h22" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────
3-D Credit Card Preview
───────────────────────────────────────────────────── */
function CardPreview({ form, brand, isFlipped }) {
  const digits = form.number.replace(/\D/g, "");
  let groups;
  
  if (brand === "amex") {
    groups = [
      digits.slice(0, 4).padEnd(4, "•"),
      digits.slice(4, 10).padEnd(6, "•"),
      digits.slice(10, 15).padEnd(5, "•"),
    ];
  } else {
    groups = [0, 4, 8, 12].map((i) => digits.slice(i, i + 4).padEnd(4, "•"));
  }

  return (
    <div style={{ perspective: "1000px", height: 172 }} className="w-full">
      <motion.div
        style={{ transformStyle: "preserve-3d", position: "relative", height: "100%" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.55, type: "spring", stiffness: 100, damping: 18 }}
      >
        {/* ── Front ── */}
        <div
          style={{
            position: "absolute", inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            background: "linear-gradient(135deg, #4338ca 0%, #7c3aed 55%, #a855f7 100%)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(79,70,229,0.45)",
          }}
        >
          {/* Shine */}
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at 25% 25%, rgba(255,255,255,0.18) 0%, transparent 60%)",
          }} />
          
          {/* Decorative circles */}
          <div style={{
            position: "absolute", right: -24, top: -24,
            width: 140, height: 140, borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.1)",
          }} />
          <div style={{
            position: "absolute", right: -8, top: -8,
            width: 96, height: 96, borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.07)",
          }} />

          <div style={{ position: "relative", height: "100%", padding: "20px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              {/* Chip */}
              <svg width="38" height="30" viewBox="0 0 38 30">
                <rect width="38" height="30" rx="4" fill="#d4af37" />
                <rect x="12" y="0" width="14" height="30" fill="#c8a000" opacity="0.45" />
                <rect x="0" y="9" width="38" height="12" fill="#c8a000" opacity="0.45" />
                <rect x="12" y="9" width="14" height="12" rx="1" fill="#e5c100" />
                <line x1="0" y1="15" x2="38" y2="15" stroke="#9a7200" strokeWidth="0.6" />
                <line x1="19" y1="0" x2="19" y2="30" stroke="#9a7200" strokeWidth="0.6" />
              </svg>
              <BrandIcon brand={brand} />
            </div>

            {/* Card number */}
            <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: "white", letterSpacing: "0.18em" }}>
              {groups.join("  ")}
            </div>

            {/* Bottom row */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>
                  Card Holder
                </p>
                <p style={{ fontWeight: 700, color: "white", fontSize: 13, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {form.name.trim().toUpperCase() || "YOUR NAME"}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>
                  Expires
                </p>
                <p style={{ fontWeight: 700, color: "white", fontSize: 13, fontFamily: "monospace" }}>
                  {form.expiry || "MM/YY"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Back ── */}
        <div
          style={{
            position: "absolute", inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(49,46,129,0.45)",
          }}
        >
          {/* Magnetic strip */}
          <div style={{ width: "100%", height: 44, background: "#0a0a0a", marginTop: 30 }} />
          
          <div style={{ padding: "14px 22px" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
              Security Code (CVV)
            </p>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "flex-end",
              background: "rgba(255,255,255,0.92)", borderRadius: 8, height: 38, paddingRight: 14,
            }}>
              <span style={{ fontFamily: "monospace", color: "#111", fontSize: 16, letterSpacing: "0.2em" }}>
                {form.cvv ? "•".repeat(form.cvv.length) : "•••"}
              </span>
            </div>
            <p style={{ marginTop: 12, textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
              Sandbox card — no real charges
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
Processing Phase
───────────────────────────────────────────────────── */
const STEPS = [
  "Connecting to payment network",
  "Validating card details",
  "Authorizing payment",
];

function ProcessingPhase({ step }) {
  return (
    <motion.div
      key="processing"
      className="flex flex-col items-center justify-center py-14 px-8 bg-white"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="relative mb-10">
        <motion.div
          className="h-20 w-20 rounded-full"
          style={{ border: "4px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 18" fill="none" stroke="rgba(99,102,241,0.7)" strokeWidth="1.5">
            <rect x="1" y="1" width="22" height="16" rx="2" />
            <path d="M1 6h22" />
          </svg>
        </div>
      </div>

      <div className="w-full space-y-3.5">
        {STEPS.map((s, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: step >= i ? 1 : 0.25, x: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${
              step > i ? "bg-emerald-500" : step === i ? "bg-indigo-500" : "bg-gray-200"
            }`}>
              {step > i ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L3.5 7L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : step === i ? (
                <motion.div
                  className="h-2 w-2 rounded-full bg-white"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              ) : (
                <div className="h-2 w-2 rounded-full bg-gray-400" />
              )}
            </div>
            <span className={`text-sm ${step >= i ? "text-gray-900" : "text-gray-400"}`}>{s}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────
Success Phase
───────────────────────────────────────────────────── */
function SuccessPhase({ plan, amount, result, onClose }) {
  const rows = [
    ["Invoice ID",   result.invoiceId],
    ["Plan",         `${plan.name} — ${plan.period}`],
    ["Amount paid",  `$${amount}.00 USD`],
    ["Card",         `•••• •••• •••• ${result.last4}`],
    ["Status",       "✓ Paid"],
  ];

  return (
    <motion.div
      key="success"
      className="flex flex-col items-center py-10 px-7 bg-white"
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
    >
      <motion.div
        className="flex h-20 w-20 items-center justify-center rounded-full mb-5 bg-emerald-100"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 0.6 }}
      >
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <motion.path
            d="M7 19L15 27L31 11"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          />
        </svg>
      </motion.div>

      <h3 className="text-2xl font-extrabold text-gray-900 mb-1">Payment Successful!</h3>
      <p className="text-gray-500 text-sm mb-6 text-center">
        Welcome to DevCollab {plan.name}. All features are unlocked.
      </p>

      <div className="w-full rounded-2xl border border-gray-200 p-5 space-y-3 text-sm bg-gray-50">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <span className="text-gray-500">{label}</span>
            <span className={`font-semibold ${label === "Status" ? "text-emerald-600" : "text-gray-900"}`}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 w-full rounded-xl border border-amber-200 px-4 py-2 text-[11px] text-amber-700 text-center bg-amber-50">
        🧪 Sandbox transaction — no real charge was made
      </div>

      <motion.button
        className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg"
        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 8px 28px rgba(79,70,229,0.25)" }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClose}
      >
        Start Building →
      </motion.button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────
3-D Secure Phase
───────────────────────────────────────────────────── */
function ThreeDSPhase({ message, onRetry, onClose }) {
  return (
    <motion.div
      key="3ds"
      className="flex flex-col items-center py-10 px-7 bg-white"
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full mb-5 bg-amber-100">
        <span style={{ fontSize: 36 }}>🔐</span>
      </div>

      <h3 className="text-xl font-extrabold text-gray-900 mb-2">3D Secure Required</h3>
      <p className="text-gray-500 text-sm text-center mb-6">{message}</p>

      <div className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[11px] text-gray-500 text-center bg-gray-50">
        💡 In sandbox mode, 3DS is simulated — try card{" "}
        <span className="font-mono text-indigo-600">4242 4242 4242 4242</span> instead.
      </div>

      <div className="mt-5 flex w-full gap-3">
        <motion.button
          className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
        >
          Cancel
        </motion.button>
        <motion.button
          className="flex-1 rounded-xl py-3 text-sm font-semibold text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRetry}
        >
          Try Again
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────
Error Phase
───────────────────────────────────────────────────── */
function ErrorPhase({ message, onRetry, onClose }) {
  return (
    <motion.div
      key="error"
      className="flex flex-col items-center py-10 px-7 bg-white"
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full mb-5 bg-red-100">
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
          <motion.path
            d="M9 9L25 25M25 9L9 25"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
          />
        </svg>
      </div>

      <h3 className="text-xl font-extrabold text-gray-900 mb-2">Payment Failed</h3>
      <p className="text-gray-500 text-sm text-center mb-5">
        {message || "Your payment could not be processed."}
      </p>

      <div className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[11px] text-gray-500 text-center bg-gray-50">
        💡 Try test card{" "}
        <span className="font-mono text-indigo-600">4242 4242 4242 4242</span> for a successful payment
      </div>

      <div className="mt-5 flex w-full gap-3">
        <motion.button
          className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
        >
          Cancel
        </motion.button>
        <motion.button
          className="flex-1 rounded-xl py-3 text-sm font-semibold text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRetry}
        >
          Try Again
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────
Status style map for test cards list
───────────────────────────────────────────────────── */
const STATUS_STYLE = {
  success:  { border: "rgba(16,185,129,0.3)",  bg: "rgba(16,185,129,0.1)",  dot: "#10b981", label: "Success"  },
  declined: { border: "rgba(239,68,68,0.3)",   bg: "rgba(239,68,68,0.1)",   dot: "#ef4444", label: "Decline"  },
  "3ds":    { border: "rgba(245,158,11,0.3)",  bg: "rgba(245,158,11,0.1)",  dot: "#f59e0b", label: "3DS"      },
};

/* ═══════════════════════════════════════════════════════════════
Main Checkout Modal
═══════════════════════════════════════════════════════════════ */
export default function StripeCheckoutModal({ plan, amount, onClose, onSuccess }) {
  const [phase, setPhase] = useState("form");
  const [form, setForm] = useState({ name: "", number: "", expiry: "", cvv: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [cvvFocused, setCvvFocused] = useState(false);
  const [showTestCards, setShowTestCards] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [payResult, setPayResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const brand = detectBrand(form.number);

  /* ── Field helpers ── */
  const update = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    if (touched[field]) {
      const errs = validateForm(updated, detectBrand(updated.number));
      setErrors((e) => ({ ...e, [field]: errs[field] }));
    }
  };

  const handleNumber = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    const b = detectBrand(raw);
    if (raw.length > cardLength(b)) return;
    update("number", formatCardInput(raw, b));
  };

  const handleExpiry = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    update("expiry", formatExpiry(raw));
  };

  const handleCvv = (e) => {
    const len = brand === "amex" ? 4 : 3;
    update("cvv", e.target.value.replace(/\D/g, "").slice(0, len));
  };

  const blur = (field) => {
    setTouched((t) => ({ ...t, [field]: true }));
    const errs = validateForm(form, brand);
    setErrors((e) => ({ ...e, [field]: errs[field] }));
  };

  const fillTestCard = (card) => {
    const digits = card.number.replace(/\D/g, "");
    const b = detectBrand(digits);
    setForm({
      name: "Rahul Kumar",
      number: formatCardInput(digits, b),
      expiry: "12/28",
      cvv: b === "amex" ? "1234" : "123",
    });
    setErrors({});
    setTouched({});
    setShowTestCards(false);
  };

  const handlePay = async () => {
    setTouched({ name: true, number: true, expiry: true, cvv: true });
    const errs = validateForm(form, brand);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPhase("processing");
    setProcessingStep(0);

    try {
      const result = await simulatePayment(form.number, (s) => setProcessingStep(s));
      setPayResult(result);

      if (result.status === "success") {
        setPhase("success");
        onSuccess?.(result);
      } else if (result.status === "3ds") {
        setErrorMsg(result.message);
        setPhase("3ds");
      } else {
        setErrorMsg(result.message || "Your payment was declined.");
        setPhase("error");
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
      setPhase("error");
    }
  };

  const retry = () => {
    setPhase("form");
    setProcessingStep(0);
    setErrorMsg("");
  };

  const allErrs = validateForm(form, brand);
  const isValid =
    Object.keys(allErrs).length === 0 &&
    form.name && form.number && form.expiry && form.cvv;

  const inputCls = (field) =>
    `w-full rounded-[12px] px-4 py-3 text-[15px] text-gray-900 placeholder-gray-400 outline-none transition-all border ${
      errors[field] && touched[field]
        ? "border-red-400 focus:ring-4 focus:ring-red-500/10"
        : "border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-blue-300"
    }`;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={phase === "form" ? onClose : undefined}
    >
      <motion.div
        style={{
          width: "100%", maxWidth: 420,
          borderRadius: 20,
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          {phase === "form" && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Header */}
              <div
                className="px-6 pt-6 pb-5"
                style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-100 mb-1">
                      Upgrading to
                    </p>
                    <h2 className="text-2xl font-extrabold text-white">{plan.name} Plan</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-extrabold text-white">${amount}</p>
                    <p className="text-xs text-indigo-100 font-medium">{plan.period}</p>
                  </div>
                </div>

                {/* Sandbox badge */}
                <div
                  className="mt-5 inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 w-full"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                >
                  <span className="text-sm">🧪</span>
                  <p className="text-[13px] font-bold text-white">Sandbox Mode — no real charges</p>
                </div>
              </div>

              {/* Form */}
              <div className="px-6 py-6 space-y-4 bg-white">
                {/* 3-D card preview */}
                <div className="mb-4">
                  <CardPreview form={form} brand={brand} isFlipped={cvvFocused} />
                </div>

                {/* Cardholder name */}
                <div>
                  <label className="mb-2 block text-[13px] font-bold text-gray-500">
                    Cardholder Name
                  </label>
                  <input
                    id="pay-name"
                    autoComplete="cc-name"
                    className={inputCls("name")}
                    placeholder="Rahul Kumar"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    onBlur={() => blur("name")}
                  />
                  {errors.name && touched.name && (
                    <motion.p className="mt-1 text-xs text-red-500" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                      {errors.name}
                    </motion.p>
                  )}
                </div>
                {/* Card number */}
                <div>
                  <label className="mb-2 block text-[13px] font-bold text-gray-500">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      id="pay-number"
                      autoComplete="cc-number"
                      inputMode="numeric"
                      className={`${inputCls("number")} font-mono pr-12`}
                      placeholder="4242 4242 4242 4242"
                      value={form.number}
                      onChange={handleNumber}
                      onBlur={() => blur("number")}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <BrandIcon brand={brand} />
                    </div>
                  </div>
                  {errors.number && touched.number && (
                    <motion.p className="mt-1 text-xs text-red-500" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                      {errors.number}
                    </motion.p>
                  )}
                </div>

                {/* Expiry + CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-[13px] font-bold text-gray-500">
                      Expiry
                    </label>
                    <input
                      id="pay-expiry"
                      autoComplete="cc-exp"
                      inputMode="numeric"
                      className={`${inputCls("expiry")} font-mono`}
                      placeholder="MM/YY"
                      value={form.expiry}
                      onChange={handleExpiry}
                      onBlur={() => blur("expiry")}
                    />
                    {errors.expiry && touched.expiry && (
                      <motion.p className="mt-1 text-xs text-red-500" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                        {errors.expiry}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-bold text-gray-500">
                      CVV {brand === "amex" ? "(4 digits)" : ""}
                    </label>
                    <input
                      id="pay-cvv"
                      autoComplete="cc-csc"
                      inputMode="numeric"
                      className={`${inputCls("cvv")} font-mono`}
                      placeholder={brand === "amex" ? "1234" : "123"}
                      value={form.cvv}
                      onChange={handleCvv}
                      onFocus={() => setCvvFocused(true)}
                      onBlur={() => { blur("cvv"); setCvvFocused(false); }}
                    />
                    {errors.cvv && touched.cvv && (
                      <motion.p className="mt-1 text-xs text-red-500" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                        {errors.cvv}
                      </motion.p>
                    )}
                  </div>
                </div>
                {/* Test cards panel */}
                <div className="mt-2">
                  <button
                    id="toggle-test-cards"
                    className="flex w-full items-center justify-between rounded-[10px] px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
                    onClick={() => setShowTestCards((s) => !s)}
                  >
                    <span className="text-[11px] font-semibold text-gray-400">
                      🧪 View Test Cards
                    </span>
                  </button>

                  <AnimatePresence>
                    {showTestCards && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="mt-2 space-y-1.5 pb-1">
                          {TEST_CARDS.map((card, i) => {
                            const s = STATUS_STYLE[card.status];
                            return (
                              <motion.button
                                key={i}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-gray-50"
                                style={{ background: "white", border: `1px solid ${s.border}` }}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                onClick={() => fillTestCard(card)}
                              >
                                <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: s.dot }} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-mono text-xs text-gray-700">{card.number}</p>
                                  <p className="text-[10px] text-gray-500">{card.label} · {card.sub}</p>
                                </div>
                                <span className="text-[10px] font-medium text-gray-400">↗ Fill</span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <p className="pt-2 text-center text-[12px] font-medium text-gray-400 flex items-center justify-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Secured with 256-bit SSL encryption · Sandbox checkout
                </p>
                {/* Footer buttons */}
                <div className="pt-3 flex gap-3">
                  <motion.button
                    id="pay-cancel"
                    className="flex-1 rounded-[14px] border border-gray-200 py-3 text-[15px] font-bold text-gray-600 transition-colors hover:bg-gray-50 bg-white"
                    whileTap={{ scale: 0.97 }}
                    onClick={onClose}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    id="pay-submit"
                    className={`flex-1 rounded-[14px] py-3 text-[15px] font-bold text-white transition-all ${
                      isValid 
                        ? "bg-indigo-600 shadow-md hover:bg-indigo-700 cursor-pointer" 
                        : "bg-gray-200 cursor-not-allowed"
                    }`}
                    whileHover={isValid ? { scale: 1.02 } : {}}
                    whileTap={isValid ? { scale: 0.97 } : {}}
                    onClick={isValid ? handlePay : undefined}
                  >
                    Pay ${amount}/mo
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {phase === "processing" && <ProcessingPhase key="processing" step={processingStep} />}
          {phase === "success"    && <SuccessPhase    key="success"    plan={plan} amount={amount} result={payResult} onClose={onClose} />}
          {phase === "error"      && <ErrorPhase      key="error"      message={errorMsg} onRetry={retry} onClose={onClose} />}
          {phase === "3ds"        && <ThreeDSPhase    key="3ds"        message={errorMsg} onRetry={retry} onClose={onClose} />}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
