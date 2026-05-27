import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

const RealtimeContext = createContext(null);
const BACKEND_URL = import.meta.env.VITE_API_URL?.replace(/\/api$/i, "") || "http://localhost:4000";

export function RealtimeProvider({ children }) {
  const { token, user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]); // Sliding toasts queue
  const [dbNotifications, setDbNotifications] = useState([]); // Database persistent list
  const [boardEvents, setBoardEvents] = useState([]);
  const [socket, setSocket] = useState(null);

  // Fetch database persistent notifications
  const fetchDbNotifications = useCallback(async () => {
    if (!token || !user) return;
    try {
      // Find current user's profile ID directly from the authenticated user context object to avoid client-side RLS queries
      const profileId = user.id || user.auth_id;
      
      if (profileId) {
        const { data: notifs, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("recipient_id", profileId)
          .order("created_at", { ascending: false });
        
        if (!error && notifs) {
          setDbNotifications(notifs);
        }
      }
    } catch (e) {
      console.error("Failed to load persistent notifications:", e);
    }
  }, [token, user]);

  const markNotificationRead = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      if (!error) {
        setDbNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (e) {
      console.error("Failed to mark notification read:", e);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (!dbNotifications.length) return;
    const unreadIds = dbNotifications.filter(n => !n.read).map(n => n.id);
    if (!unreadIds.length) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds);
      if (!error) {
        setDbNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (e) {
      console.error("Failed to mark all notifications read:", e);
    }
  }, [dbNotifications]);

  const removeNotification = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (!error) {
        setDbNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete notification:", e);
    }
  }, []);

  useEffect(() => {
    fetchDbNotifications();
  }, [token, user, fetchDbNotifications]);

  useEffect(() => {
    if (!token) return;

    const client = io(BACKEND_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    const handleTaskUpdated = (payload) => {
      setBoardEvents((prev) => [...prev, { id: Date.now(), type: "task-updated", ...payload }]);
    };

    const handleTaskCreated = (payload) => {
      setBoardEvents((prev) => [...prev, { id: Date.now(), type: "task-created", ...payload }]);
    };

    const handleCommentCreated = (payload) => {
      setNotifications((prev) => [{ id: Date.now(), type: "comment", message: payload.message, ...payload }, ...prev].slice(0, 8));
      fetchDbNotifications();
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    client.on("connect", () => {
      if (user?.id) client.emit("join-room", user.id);
      setSocket(client);
    });
    client.on("task-updated", handleTaskUpdated);
    client.on("task-created", handleTaskCreated);
    client.on("comment-created", handleCommentCreated);
    client.on("online-users", handleOnlineUsers);
    client.on("notification", handleCommentCreated);

    return () => {
      client.off("connect", handleTaskUpdated);
      client.off("task-updated", handleTaskUpdated);
      client.off("task-created", handleTaskCreated);
      client.off("comment-created", handleCommentCreated);
      client.off("online-users", handleOnlineUsers);
      client.off("notification", handleCommentCreated);
      client.disconnect();
      setSocket(null);
    };
  }, [token, user, fetchDbNotifications]);

  const emitEvent = (event, payload) => {
    if (!socket) return;
    socket.emit(event, payload);
  };

  const pushNotification = (notification) => {
    setNotifications((prev) => [{ ...notification, id: Date.now() }, ...prev].slice(0, 8));
  };

  const value = useMemo(
    () => ({
      onlineUsers,
      notifications,
      dbNotifications,
      boardEvents,
      emitEvent,
      pushNotification,
      fetchDbNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      removeNotification,
      socket,
    }),
    [onlineUsers, notifications, dbNotifications, boardEvents, socket, fetchDbNotifications, markNotificationRead, markAllNotificationsRead, removeNotification]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);
