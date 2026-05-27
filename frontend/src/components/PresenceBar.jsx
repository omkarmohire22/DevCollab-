import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useRealtime } from "../context/RealtimeContext";

export default function PresenceBar() {
  const { onlineUsers } = useRealtime();
  const [hoveredUser, setHoveredUser] = useState(null);

  /* always include "You" */
  const allUsers = [
    { id: "u1", name: "You", avatar: "from-indigo-500 to-violet-600", viewing: "Kanban Board", isYou: true },
    ...onlineUsers,
  ];

  return (
    <div className="flex items-center gap-2">
      {/* Live dot */}
      <div className="flex items-center gap-1.5">
        <motion.div
          className="h-2 w-2 rounded-full bg-green-500"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        <span className="text-xs font-semibold text-gray-500">
          {allUsers.length} online
        </span>
      </div>

      {/* Avatar stack */}
      <div className="flex -space-x-2">
        <AnimatePresence>
          {allUsers.map((user, i) => (
            <motion.div
              key={user.id}
              className="relative"
              initial={{ scale: 0, x: -10 }}
              animate={{ scale: 1, x: 0 }}
              exit={{ scale: 0, x: -10 }}
              transition={{ type: "spring", stiffness: 320, damping: 24, delay: i * 0.05 }}
              onMouseEnter={() => setHoveredUser(user.id)}
              onMouseLeave={() => setHoveredUser(null)}
            >
              <motion.div
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-gradient-to-br ${user.avatar} text-[11px] font-bold text-white shadow-md`}
                whileHover={{ scale: 1.2, zIndex: 10 }}
                animate={user.isYou ? {} : { scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
              >
                {user.name[0]}
              </motion.div>

              {/* Tooltip */}
              <AnimatePresence>
                {hoveredUser === user.id && (
                  <motion.div
                    className="absolute bottom-full left-1/2 mb-2 z-50 w-48 -translate-x-1/2 rounded-xl border border-gray-200 bg-gray-900 px-3 py-2.5 shadow-xl"
                    initial={{ opacity: 0, y: 6, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`h-6 w-6 rounded-full bg-gradient-to-br ${user.avatar} flex items-center justify-center text-[10px] font-bold text-white`}>
                        {user.name[0]}
                      </div>
                      <span className="text-xs font-bold text-white">
                        {user.isYou ? "You" : user.name}
                      </span>
                      <motion.div
                        className="ml-auto h-2 w-2 rounded-full bg-green-400"
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-300">
                      👁 <span className="text-gray-400">Viewing:</span>{" "}
                      <span className="font-semibold text-gray-100">{user.viewing}</span>
                    </p>
                    {/* Tooltip arrow */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-b border-r border-gray-700 bg-gray-900" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
