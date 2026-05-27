import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = "error") => {
    setToasts((prev) => {
      const isDuplicate = prev.some((t) => t.message === message);
      if (isDuplicate) return prev;
      
      const id = Date.now();
      setTimeout(() => {
        dismissToast(id);
      }, 4500);
      
      return [...prev, { id, message, type }];
    });
  }, [dismissToast]);

  // Global window.alert override
  useEffect(() => {
    const originalAlert = window.alert;
    
    window.alert = (msg) => {
      if (msg === undefined || msg === null) return;
      
      const lowercase = String(msg).toLowerCase();
      
      // Smart sentiment classification
      if (
        lowercase.includes("success") || 
        lowercase.includes("completed") || 
        lowercase.includes("saved") ||
        lowercase.includes("online") ||
        lowercase.includes("connected")
      ) {
        showToast(String(msg), "success");
      } else {
        showToast(String(msg), "error");
      }
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Global floating toasts container */}
      <div className="fixed top-6 left-1/2 z-[9999] -translate-x-1/2 flex flex-col gap-2.5 items-center pointer-events-none w-full max-w-md px-4">
        <AnimatePresence>
          {toasts.map((t) => {
            const isError = t.type === "error";
            const isSuccess = t.type === "success";
            
            const bg = isError 
              ? "bg-rose-600/95 border-rose-500/30 text-white shadow-rose-200/20" 
              : isSuccess 
                ? "bg-emerald-600/95 border-emerald-500/30 text-white shadow-emerald-200/20" 
                : "bg-indigo-600/95 border-indigo-500/30 text-white shadow-indigo-200/20";
            
            return (
              <motion.div
                key={t.id}
                className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border px-5 py-3.5 text-sm font-semibold shadow-xl backdrop-blur-md w-full sm:w-auto ${bg}`}
                initial={{ opacity: 0, y: -25, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -25, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 350, damping: 26 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base flex-shrink-0">
                    {isError ? "⚠️" : isSuccess ? "✅" : "✨"}
                  </span>
                  <span className="leading-snug">{t.message}</span>
                </div>
                
                <button 
                  onClick={() => dismissToast(t.id)} 
                  className="flex-shrink-0 text-white/60 hover:text-white transition-colors p-0.5 rounded-lg hover:bg-white/10"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 1l10 10M11 1L1 11" />
                  </svg>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
