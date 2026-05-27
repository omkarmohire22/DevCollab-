import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";
import AuthModal from "./AuthModal";
import NotificationPanel from "./NotificationPanel";

const LINKS = [
  { label: "Projects", path: "/dashboard" },
  { label: "Activity", path: "/activity"  },
  { label: "Wiki",     path: "/wiki"      },
  { label: "Pulse",    path: "/pulse"     },
];

/* User dropdown shown when logged in */
function UserMenu({ user, onClose }) {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  const go = (path) => { navigate(path); onClose(); };
  const handleLogout = () => { logout(); onClose(); navigate("/"); };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-indigo-100/50"
        initial={{ opacity: 0, scale: 0.92, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -8 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
      >
        {/* User info */}
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${user.avatar} text-xs font-bold text-white shadow-md`}>
              {user.initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900">{user.name}</p>
              <p className="truncate text-[11px] text-gray-400">{user.email}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5">
            <span className="text-[10px] font-bold text-indigo-600">{user.workspace}</span>
            <span className="ml-auto rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white">{user.plan}</span>
          </div>
        </div>

        {/* Menu items */}
        <div className="py-1">
          {[
            { icon: "👤", label: "My Profile",          path: "/profile"            },
            { icon: "⚙️", label: "Workspace Settings",  path: "/workspace/settings" },
            { icon: "💳", label: "Plans & Billing",     path: "/payments"           },
            { icon: "🎨", label: "AI Whiteboard",       path: "/whiteboard"         },
          ].map(item => (
            <motion.button
              key={item.path}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              whileHover={{ x: 3 }}
              onClick={() => go(item.path)}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </motion.button>
          ))}
        </div>

        {/* Logout */}
        <div className="border-t border-gray-100 p-2">
          <motion.button
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
            whileHover={{ x: 3 }}
            onClick={handleLogout}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log Out
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const { dbNotifications } = useRealtime() || {};
  const [active,      setActive]      = useState("Wiki");
  const [scrolled,    setScrolled]    = useState(false);
  const [showSignIn,  setShowSignIn]  = useState(false);
  const [showNotifs,  setShowNotifs]  = useState(false);
  const [showMenu,    setShowMenu]    = useState(false);

  const unreadCount = dbNotifications ? dbNotifications.filter(n => !n.read).length : 0;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const handleNavClick = (link) => {
    if (!isLoggedIn) { setShowSignIn(true); return; }
    setActive(link.label);
    navigate(link.path);
  };

  const handleDemo = () => {
    setShowSignIn(true);
  };

  return (
    <>
      <motion.header
        initial={{ y: -72, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className={`sticky top-0 z-50 flex items-center justify-between px-8 py-3.5 transition-all duration-300 ${
          scrolled
            ? "bg-white/80 backdrop-blur-2xl shadow-lg shadow-indigo-100/60 border-b border-indigo-100/60"
            : "bg-white/50 backdrop-blur-md"
        }`}
      >
        {/* Logo */}
        <motion.div
          className="flex cursor-pointer items-center gap-2.5"
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/")}
        >
          <motion.div
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-300/50"
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 3.5L1.5 8L5 12.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11 3.5L14.5 8L11 12.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
          <span className="text-[17px] font-bold tracking-tight text-gray-900">DevCollab</span>
        </motion.div>

        {/* Nav links — locked behind auth */}
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link, i) => (
            <motion.button
              key={link.label}
              onClick={() => handleNavClick(link)}
              className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                active === link.label && isLoggedIn ? "text-indigo-600" : "text-gray-500 hover:text-gray-800"
              }`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i + 0.2 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
            >
              {link.label}
              {active === link.label && isLoggedIn && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-lg bg-indigo-50"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {active === link.label && isLoggedIn && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-indigo-600"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2.5">
          {!isLoggedIn ? (
            <>
              {/* Sign In */}
              <motion.button
                className="rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:border-indigo-400 hover:text-indigo-600"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowSignIn(true)}
              >
                Sign In
              </motion.button>

              {/* See Demo */}
              <motion.button
                className="rounded-xl border-2 border-dashed border-gray-300 bg-white/70 px-4 py-2 text-sm font-semibold text-gray-700 backdrop-blur-sm transition-colors hover:border-indigo-400 hover:text-indigo-600"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                onClick={handleDemo}
              >
                See Demo
              </motion.button>

              {/* New Project */}
              <motion.button
                className="btn-shimmer btn-glow rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-300/40"
                whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.94 }}
                onClick={() => setShowSignIn(true)}
              >
                New Project
              </motion.button>
            </>
          ) : (
            <>
              {/* New Project (logged in) */}
              <motion.button
                className="btn-shimmer btn-glow rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-300/40"
                whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.94 }}
                onClick={() => navigate("/new-project")}
              >
                New Project
              </motion.button>

              <div className="mx-1 h-6 w-px bg-gray-200" />

              {/* Bell — notification panel */}
              <div className="relative">
                <motion.button
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                  whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowNotifs(s => !s); setShowMenu(false); }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <motion.span
                      className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    />
                  )}
                </motion.button>
                <AnimatePresence>
                  {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
                </AnimatePresence>
              </div>

              {/* Avatar — user menu */}
              <div className="relative">
                <motion.div
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-br ${user.avatar} text-xs font-bold text-white shadow-md shadow-indigo-200 ring-2 transition-all ${showMenu ? "ring-indigo-400" : "ring-transparent"}`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowMenu(s => !s); setShowNotifs(false); }}
                >
                  {user.initials}
                </motion.div>
                <AnimatePresence>
                  {showMenu && <UserMenu user={user} onClose={() => setShowMenu(false)} />}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </motion.header>

      {/* Auth Modal */}
      <AnimatePresence>
        {showSignIn && <AuthModal onClose={() => setShowSignIn(false)} />}
      </AnimatePresence>
    </>
  );
}
