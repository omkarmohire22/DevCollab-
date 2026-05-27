import { motion, AnimatePresence } from "framer-motion";
import { useRealtime } from "../context/RealtimeContext";

const TYPE_STYLES = {
  task_move:   { icon: "🔀", bg: "bg-blue-50 border-blue-200",     text: "text-blue-800"   },
  comment:     { icon: "💬", bg: "bg-indigo-50 border-indigo-200", text: "text-indigo-800" },
  task_assign: { icon: "👤", bg: "bg-violet-50 border-violet-200", text: "text-violet-800" },
  task_view:   { icon: "👁",  bg: "bg-gray-50 border-gray-200",    text: "text-gray-700"   },
  join:        { icon: "👋", bg: "bg-green-50 border-green-200",   text: "text-green-800"  },
};

export default function NotificationToast() {
  const { notifications, dismissNotification } = useRealtime();

  return (
    /* Fixed bottom-right stack */
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-80">
      <AnimatePresence mode="popLayout">
        {notifications.map((n) => {
          const style = TYPE_STYLES[n.type] || TYPE_STYLES.task_view;
          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm ${style.bg}`}
            >
              {/* Avatar */}
              {n.user && (
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${n.user.avatar} text-xs font-bold text-white shadow-sm`}>
                  {n.user.name[0]}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm">{style.icon}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${style.text} opacity-60`}>
                    {n.type?.replace("_", " ")}
                  </span>
                </div>
                <p className={`text-xs font-medium leading-snug ${style.text}`}>{n.message}</p>
              </div>

              {/* Dismiss */}
              <motion.button
                className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors mt-0.5"
                whileHover={{ scale: 1.2, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => dismissNotification(n.id)}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 1l10 10M11 1L1 11" />
                </svg>
              </motion.button>

              {/* Auto-dismiss progress bar */}
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 rounded-full bg-current opacity-20"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
