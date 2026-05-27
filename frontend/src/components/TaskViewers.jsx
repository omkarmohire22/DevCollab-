import {
  motion,
  AnimatePresence,
} from "framer-motion";

import { useEffect } from "react";

import { useRealtime } from "../context/RealtimeContext";

const AVATAR_COLORS = {

  You:
    "from-indigo-500 to-violet-600",

  Ankush:
    "from-pink-400 to-rose-500",

  Riya:
    "from-blue-400 to-indigo-500",

  Sneha:
    "from-emerald-400 to-teal-500",

  Dev:
    "from-amber-400 to-orange-500",
};

export default function TaskViewers({
  taskId,
  taskTitle,
}) {

  const realtime =
    useRealtime?.();

  // SAFETY
  if (!realtime) {

    return null;
  }

  const {
    taskViewers = {},
    setViewingTask,
  } = realtime;

  /* register viewer */

  useEffect(() => {

    if (
      !taskId ||
      !setViewingTask
    ) {

      return;
    }

    const cleanup =
      setViewingTask(
        taskId,
        taskTitle
      );

    return () => {

      if (
        typeof cleanup ===
        "function"
      ) {

        cleanup();
      }
    };

  }, [
    taskId,
    taskTitle,
    setViewingTask,
  ]);

  // SAFE ACCESS
  const viewers =
    taskViewers?.[
    taskId
    ] || [];

  if (
    !Array.isArray(
      viewers
    ) ||
    viewers.length === 0
  ) {

    return null;
  }

  return (
    <motion.div
      className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2"
      initial={{
        opacity: 0,
        y: -6,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.3,
      }}
    >

      {/* EYE ICON */}

      <motion.div
        animate={{
          scale: [
            1,
            1.2,
            1,
          ],
        }}
        transition={{
          duration: 1.5,
          repeat:
            Infinity,
        }}
        className="text-sm text-indigo-500"
      >
        👁
      </motion.div>

      {/* AVATARS */}

      <div className="flex -space-x-1.5">

        <AnimatePresence>

          {viewers.map(
            (
              name,
              i
            ) => (

              <motion.div
                key={`${name}-${i}`}
                className={`flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gradient-to-br ${AVATAR_COLORS[
                  name
                ] ||
                  "from-gray-300 to-gray-400"
                  } text-[8px] font-bold text-white`}
                initial={{
                  scale: 0,
                  x: -4,
                }}
                animate={{
                  scale: 1,
                  x: 0,
                }}
                exit={{
                  scale: 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  delay:
                    i * 0.05,
                }}
                title={name}
              >
                {
                  name?.[0]
                }
              </motion.div>

            )
          )}

        </AnimatePresence>

      </div>

      {/* TEXT */}

      <p className="text-[11px] font-medium text-indigo-700">

        {viewers.length ===
          1
          ? `${viewers[0]} is viewing this task`
          : viewers.length ===
            2
            ? `${viewers[0]} and ${viewers[1]} are viewing`
            : `${viewers[0]} and ${viewers.length - 1
            } others are viewing`}

      </p>
    </motion.div>
  );
}