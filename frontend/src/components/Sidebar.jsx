import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Kanban",
    path: "/kanban",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="5" height="18" rx="1" />
        <rect x="10" y="3" width="5" height="12" rx="1" />
        <rect x="17" y="3" width="5" height="15" rx="1" />
      </svg>
    ),
  },
  {
    label: "Snippets",
    path: "/snippets",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    label: "Wiki",
    path: "/wiki",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </svg>
    ),
  },
  {
    label: "AI Assistant",
    path: "/ai",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 8v4l3 3" />
        <circle cx="19" cy="5" r="3" fill="currentColor" stroke="none" opacity="0.4" />
        <path d="M17.5 5h3M19 3.5v3" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "Project Health",
    path: "/health",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    label: "Dev Pulse",
    path: "/pulse",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: "Activity",
    path: "/activity",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    label: "Whiteboard",
    path: "/whiteboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M7 8l3 3 4-4" />
      </svg>
    ),
  },
  {
    label: "Payments",
    path: "/payments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <path d="M1 10h22" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 220 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex h-screen flex-col border-r border-gray-100 bg-white shadow-sm"
      style={{ flexShrink: 0 }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-4">
        <motion.div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 shadow-md shadow-indigo-200"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 3.5L1.5 8L5 12.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 3.5L14.5 8L11 12.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              className="text-[15px] font-bold tracking-tight text-gray-900"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
            >
              DevCollab
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Workspace pill */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="mx-3 mt-3 flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-[10px] font-bold text-white">
              {(user?.workspace || "DevCollab Team")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-gray-800">{user?.workspace || "DevCollab Team"}</p>
              <p className="text-[10px] text-gray-400">{user?.plan || "Pro"} Plan</p>
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav items */}
      <nav className="mt-4 flex flex-1 flex-col gap-0.5 px-2">
        {NAV.map((item) => {
          const active = location.pathname === item.path;
          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                active
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
              whileHover={{ x: active ? 0 : 3 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.18 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-indigo-600"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom: workspace settings + user + collapse */}
      <div className="border-t border-gray-100 p-3 space-y-2">
        {/* Workspace settings link */}
        <motion.button
          onClick={() => navigate("/workspace/settings")}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.97 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Workspace Settings
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
        <div className="flex items-center gap-2.5">
          <motion.div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white cursor-pointer"
            whileHover={{ scale: 1.1, rotate: 5 }}
            onClick={() => navigate("/profile")}
          >
            {user?.initials || "RK"}
          </motion.div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-xs font-semibold text-gray-800">{user?.name || "Rahul Kumar"}</p>
                <p className="text-[10px] text-gray-400">{user?.role || "Owner"}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout button */}
        <motion.button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.97 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Log Out
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
        <motion.button
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-center rounded-lg py-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.svg
            width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <path d="M10 3L5 8L10 13" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </motion.button>
      </div>
    </motion.aside>
  );
}
