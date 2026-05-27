import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import NotificationPanel from "./NotificationPanel";
import { useAuth } from "../context/AuthContext";

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

export default function AppShell({ children, title, subtitle, actions }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMenu,   setShowMenu]   = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-3">
            {actions}

            {/* Bell */}
            <div className="relative">
              <motion.button
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => { setShowNotifs(s => !s); setShowMenu(false); }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <motion.span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              </motion.button>
              <AnimatePresence>
                {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
              </AnimatePresence>
            </div>

            {/* Avatar + dropdown */}
            <div className="relative">
              <motion.div
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-br ${user?.avatar || "from-indigo-500 to-violet-600"} text-xs font-bold text-white shadow-md shadow-indigo-200 ring-2 transition-all ${showMenu ? "ring-indigo-400" : "ring-transparent"}`}
                whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }}
                onClick={() => { setShowMenu(s => !s); setShowNotifs(false); }}
              >
                {user?.initials || "RK"}
              </motion.div>

              <AnimatePresence>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <motion.div
                      className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
                      initial={{ opacity: 0, scale: 0.92, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: -8 }}
                      transition={{ type: "spring", stiffness: 340, damping: 28 }}
                    >
                      {/* User info */}
                      <div className="border-b border-gray-100 px-4 py-3">
                        <p className="text-sm font-bold text-gray-900">{user?.name || "Rahul Kumar"}</p>
                        <p className="text-[11px] text-gray-400">{user?.email || "rahul@devfusion.io"}</p>
                        <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-1">
                          <span className="text-[10px] font-semibold text-indigo-600">{user?.workspace || "DevFusion Team"}</span>
                          <span className="ml-auto rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white">{user?.plan || "Pro"}</span>
                        </div>
                      </div>

                      <div className="py-1">
                        {[
                          { icon: "👤", label: "My Profile",         path: "/profile"            },
                          { icon: "⚙️", label: "Workspace Settings", path: "/workspace/settings" },
                          { icon: "💳", label: "Plans & Billing",    path: "/payments"           },
                        ].map(item => (
                          <motion.button key={item.path}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            whileHover={{ x: 3 }}
                            onClick={() => { navigate(item.path); setShowMenu(false); }}>
                            <span>{item.icon}</span>{item.label}
                          </motion.button>
                        ))}
                      </div>

                      <div className="border-t border-gray-100 p-2">
                        <motion.button
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                          whileHover={{ x: 3 }}
                          onClick={handleLogout}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          Log Out
                        </motion.button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <motion.main
          className="flex-1 overflow-y-auto p-6"
          variants={pageVariants}
          initial="initial"
          animate="animate"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
