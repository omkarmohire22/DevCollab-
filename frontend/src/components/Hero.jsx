import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MockUI from "./MockUI";

/* ── Typing hook ── */
function useTypewriter(words, typeSpeed, deleteSpeed, pause) {
  const [text, setText] = useState("");
  const [wIdx, setWIdx] = useState(0);
  const [cIdx, setCIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wIdx];
    let timer;
    if (!deleting && cIdx < word.length) {
      timer = setTimeout(() => setCIdx((c) => c + 1), typeSpeed);
    } else if (!deleting && cIdx === word.length) {
      timer = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && cIdx > 0) {
      timer = setTimeout(() => setCIdx((c) => c - 1), deleteSpeed);
    } else {
      setDeleting(false);
      setWIdx((w) => (w + 1) % words.length);
    }
    setText(word.slice(0, cIdx));
    return () => clearTimeout(timer);
  }, [cIdx, deleting, wIdx, words, typeSpeed, deleteSpeed, pause]);

  return text;
}

/* ── Stagger variants ── */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11 } },
};
const item = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ── Avatar stack ── */
function Avatars() {
  const people = [
    { bg: "from-pink-400 to-rose-500", letter: "A" },
    { bg: "from-blue-400 to-indigo-500", letter: "R" },
    { bg: "from-emerald-400 to-teal-500", letter: "S" },
  ];

  return (
    <motion.div className="flex items-center gap-3" variants={item}>
      <div className="flex -space-x-2.5">
        {people.map((p, i) => (
          <motion.div
            key={i}
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br ${p.bg} text-xs font-bold text-white shadow-md`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 1.1 + i * 0.1,
              type: "spring",
              stiffness: 320,
            }}
            whileHover={{ scale: 1.22, zIndex: 10 }}
          >
            {p.letter}
          </motion.div>
        ))}
      </div>
      <motion.p
        className="text-sm text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.45 }}
      >
        <span className="font-bold text-gray-800">500+</span> teams already
        building
      </motion.p>
    </motion.div>
  );
}

/* ── Blinking cursor — stays on the same baseline, never wraps ── */
function Cursor() {
  return (
    <motion.span
      style={{
        display: "inline-block",
        width: "3px",
        height: "0.8em",
        borderRadius: "2px",
        backgroundColor: "#4f46e5",
        marginLeft: "3px",
        verticalAlign: "middle",
        flexShrink: 0,
      }}
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
    />
  );
}

export default function Hero() {
  const navigate = useNavigate();
  const typed = useTypewriter(
    ["Build", "Ship", "Scale", "Collab"],
    90,
    48,
    2100
  );

  return (
    <section className="relative flex min-h-[calc(100vh-64px)] items-center px-8 py-12 md:px-16 lg:px-24">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-2">

        {/* ── LEFT COLUMN ── */}
        <motion.div
          className="flex flex-col gap-7"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Beta badge */}
          <motion.div variants={item}>
            <motion.span
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-700"
              whileHover={{ scale: 1.05 }}
            >
              <motion.span
                className="h-2 w-2 rounded-full bg-indigo-500"
                animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              Real-time collaboration · Now in Beta
            </motion.span>
          </motion.div>

          {/* Headline — single h1, typed word never wraps */}
          <motion.div variants={item}>
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-[3.4rem]">
              Where Dev Teams{" "}
              <span
                className="text-gradient"
                style={{ whiteSpace: "nowrap" }}
              >
                {typed}
                <Cursor />
              </span>
              <br />
              <span className="text-gradient">Together</span>
            </h1>
          </motion.div>

          {/* Sub-text */}
          <motion.p
            variants={item}
            className="max-w-md text-[1.05rem] leading-relaxed text-gray-500"
          >
            The unified workspace for engineering teams. Manage sprints, review
            code with AI, and collaborate in real-time without leaving your
            flow.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            variants={item}
            className="flex flex-wrap items-center gap-4"
          >
            <motion.button
              className="btn-shimmer btn-glow rounded-xl px-8 py-3.5 text-base font-semibold text-white"
              style={{ boxShadow: "0 8px 30px rgba(79,70,229,0.4)" }}
              whileHover={{
                scale: 1.07,
                boxShadow: "0 20px 60px rgba(79,70,229,0.5)",
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/create-workspace")}
            >
              Start for Free
            </motion.button>

            <motion.button
              className="group flex items-center gap-2.5 rounded-xl border-2 border-dashed border-gray-300 bg-white/70 px-8 py-3.5 text-base font-semibold text-gray-700 backdrop-blur-sm transition-colors duration-300 hover:border-indigo-400 hover:text-indigo-600"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path
                    d="M1.5 5.5H9.5M6.5 2.5L9.5 5.5L6.5 8.5"
                    stroke="#4f46e5"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              See Demo
            </motion.button>
          </motion.div>

          {/* Avatars */}
          <Avatars />

          {/* Feature chips */}
          <motion.div variants={item} className="flex flex-wrap gap-2">
            {[
              "Kanban Board",
              "AI Code Review",
              "Live Presence",
              "Wiki Docs",
              "Dev Pulse",
              "Snippets",
            ].map((f, i) => (
              <motion.span
                key={f}
                className="cursor-default rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 1.3 + i * 0.07,
                  type: "spring",
                }}
                whileHover={{
                  scale: 1.1,
                  borderColor: "#4f46e5",
                  color: "#4f46e5",
                  backgroundColor: "#eef2ff",
                }}
              >
                {f}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── RIGHT COLUMN ── */}
        <MockUI />
      </div>
    </section>
  );
}
