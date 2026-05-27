/* ══════════════════════════════════════════════════════════════════
DevCollab · Payment Sandbox  —  Stripe Test Mode Simulation
Mirrors Stripe's test card behaviour. No real charges ever occur.
══════════════════════════════════════════════════════════════════ */

/** Luhn algorithm — validates card number checksum */
export function luhnCheck(digits) {
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** Detect card brand from number prefix */
export function detectBrand(raw) {
  const n = raw.replace(/\D/g, "");
  if (/^4/.test(n))                         return "visa";
  if (/^5[1-5]|^2[2-7]/.test(n))           return "mastercard";
  if (/^3[47]/.test(n))                     return "amex";
  if (/^6011|^622|^64[4-9]|^65/.test(n))   return "discover";
  if (/^35[2-8]/.test(n))                   return "jcb";
  if (/^(60|65|81|82)/.test(n))             return "rupay";
  return null;
}

/** Expected total digit count for a brand */
export function cardLength(brand) {
  return brand === "amex" ? 15 : 16;
}

/** Format raw digits into grouped display string for input field */
export function formatCardInput(raw, brand) {
  const d = raw.replace(/\D/g, "");
  if (brand === "amex") {
    // Groups: 4-6-5
    const a = d.slice(0, 4);
    const b = d.slice(4, 10);
    const c = d.slice(10, 15);
    return [a, b, c].filter(Boolean).join(" ");
  }
  // Groups: 4-4-4-4
  return d.replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
}

/** Auto-format expiry input — inserts "/" after 2 digits */
export function formatExpiry(raw) {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return d.slice(0, 2) + "/" + d.slice(2);
}

/* ─────────────────────────────────────────────────────────────────
Test card scenarios  —  mirrors Stripe's documented test cards
───────────────────────────────────────────────────────────────── */
const SCENARIOS = {
  "4242424242424242": { status: "success" },
  "5555555555554444": { status: "success" },
  "378282246310005":  { status: "success" },
  "6011111111111117": { status: "success" },
  "4000000000000002": { status: "declined", message: "Your card was declined." },
  "4000000000009995": { status: "declined", message: "Your card has insufficient funds." },
  "4000000000000069": { status: "declined", message: "Your card has expired." },
  "4000000000000127": { status: "declined", message: "Your card's security code is incorrect." },
  "4000000000000101": { status: "declined", message: "Your card's security code is incorrect." },
  "4000002500003155": {
    status: "3ds",
    message: "This card requires 3D Secure authentication. In a live environment, you would be redirected to your bank to verify.",
  },
};

/**
 * Simulate a Stripe-like payment with realistic latency.
 * @param {string} number   — raw card number (digits or formatted)
 * @param {function} onStep — called with step index 0/1/2 as processing advances
 * @returns {Promise<{status, message?, invoiceId?, last4, timestamp}>}
 */
export async function simulatePayment(number, onStep) {
  const digits = number.replace(/\D/g, "");
  
  onStep?.(0); // Connecting to payment network
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 200));
  
  onStep?.(1); // Validating card details
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 200));
  
  onStep?.(2); // Authorizing payment
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 300));

  const scenario = SCENARIOS[digits];
  if (scenario) {
    return {
      ...scenario,
      invoiceId: scenario.status === "success" 
        ? `INV-${Date.now().toString(36).toUpperCase().slice(-8)}` 
        : null,
      last4: digits.slice(-4),
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    };
  }

  // Unknown card — validate via Luhn
  if (digits.length >= 13 && !luhnCheck(digits)) {
    return { status: "declined", message: "Your card number is invalid." };
  }

  // Unknown but Luhn-valid → treat as success in demo mode
  return {
    status: "success",
    invoiceId: `INV-${Date.now().toString(36).toUpperCase().slice(-8)}`,
    last4: digits.slice(-4),
    timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
  };
}

/**
 * Validate checkout form fields — returns an error map (empty = valid).
 * @param {{ name, number, expiry, cvv }} form
 * @param {string|null} brand
 */
export function validateForm(form, brand) {
  const errors = {};
  const digits = form.number.replace(/\D/g, "");
  const len = cardLength(brand);

  if (!form.name.trim())          errors.name   = "Cardholder name is required";
  if (!digits)                    errors.number = "Card number is required";
  else if (digits.length < len)   errors.number = "Card number is incomplete";
  else if (!luhnCheck(digits))    errors.number = "Card number is invalid";

  if (!form.expiry)               errors.expiry = "Expiry date is required";
  else if (form.expiry.length < 5) errors.expiry = "Expiry is incomplete";
  else {
    const [mm, yy] = form.expiry.split("/").map(Number);
    const exp = new Date(2000 + yy, mm - 1, 1);
    const now = new Date(); now.setDate(1); now.setHours(0, 0, 0, 0);
    if (!mm || mm < 1 || mm > 12) errors.expiry = "Invalid month";
    else if (exp < now)            errors.expiry = "Your card has expired";
  }

  const cvvLen = brand === "amex" ? 4 : 3;
  if (!form.cvv)                      errors.cvv = "CVV is required";
  else if (form.cvv.length < cvvLen)  errors.cvv = "CVV is incomplete";

  return errors;
}

/** Stripe-like test card reference list shown in the modal */
export const TEST_CARDS = [
  { number: "4242 4242 4242 4242", brand: "visa",       label: "Visa",       sub: "Always succeeds",    status: "success"  },
  { number: "5555 5555 5555 4444", brand: "mastercard", label: "Mastercard", sub: "Always succeeds",    status: "success"  },
  { number: "3782 822463 10005",   brand: "amex",       label: "Amex",       sub: "Always succeeds",    status: "success"  },
  { number: "4000 0000 0000 0002", brand: "visa",       label: "Visa",       sub: "Generic decline",    status: "declined" },
  { number: "4000 0000 0000 9995", brand: "visa",       label: "Visa",       sub: "Insufficient funds", status: "declined" },
  { number: "4000 0025 0000 3155", brand: "visa",       label: "Visa",       sub: "3D Secure required", status: "3ds"      },
];
