import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabase";

const TYPE_COLORS = {
  mention: "bg-indigo-100 text-indigo-700",
  assign: "bg-amber-100 text-amber-700",
  task: "bg-green-100 text-green-700",
  snippet: "bg-violet-100 text-violet-700",
  general: "bg-gray-100 text-gray-600",
};

export default function ProfilePage() {
  const [tab, setTab] = useState("profile");
  const [notifications, setNotifications] = useState([]);
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState({ tasksDone: 0, snippets: 0 });
  const [editing, setEditing] = useState(false);

  const [profile, setProfile] = useState({
    id: "",
    name: "",
    role: "",
    bio: "",
    github: "",
    email: "",
    skills: [],
    avatar_url: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      // Logged in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(userError);
        return;
      }

      // Fetch profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      const profileData = {
        id: data.id,
        name:
          data.full_name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "",
        role: data.workspace_role || "Member",
        bio: data.bio || "",
        github: data.github_url || "",
        email: user.email || "",
        skills: data.skills || [],
        avatar_url:
          data.avatar_url ||
          user.user_metadata?.avatar_url ||
          "",
      };

      setProfile(profileData);

      // Fetch real stats: tasks done
      const projectId = localStorage.getItem("projectId");
      if (projectId) {
        const { data: doneTasks } = await supabase
          .from("tasks")
          .select("id", { count: "exact" })
          .eq("project_id", projectId)
          .eq("status", "done");
        const { data: allSnippets } = await supabase
          .from("snippets")
          .select("id", { count: "exact" })
          .eq("created_by", data.id);
        setStats({
          tasksDone: doneTasks?.length ?? 0,
          snippets: allSnippets?.length ?? 0,
        });
      }

      // Fetch real notifications from DB
      const { data: notifData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", data.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (notifData && notifData.length > 0) {
        setNotifications(notifData.map((n) => ({
          id: n.id,
          type: n.type || "general",
          read: n.read || false,
          icon: n.type === "mention" ? "💬" : n.type === "assign" ? "📋" : "🔔",
          text: n.message || n.content || "New notification",
          time: new Date(n.created_at).toLocaleString(),
        })));
      }

      // Fetch real activity: recently updated tasks
      if (projectId) {
        const { data: recentTasks } = await supabase
          .from("tasks")
          .select("title, status, updated_at")
          .eq("project_id", projectId)
          .order("updated_at", { ascending: false })
          .limit(5);
        if (recentTasks && recentTasks.length > 0) {
          setActivity(recentTasks.map((t) => ({
            text: `Task "${t.title}" → ${t.status}`,
            time: new Date(t.updated_at).toLocaleString(),
            icon: t.status === "done" ? "✅" : t.status === "inprogress" ? "🔄" : "📋",
          })));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveProfile = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.name,
          workspace_role: profile.role,
          bio: profile.bio,
          github_url: profile.github,
          skills: profile.skills,
        })
        .eq("id", profile.id);

      if (error) {
        console.error(error);
        alert("Failed to update profile");
        return;
      }

      setEditing(false);
      alert("Profile updated successfully");
    } catch (err) {
      console.error(err);
    }
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <AppShell title="Profile" subtitle="Your account & notifications">
      <div className="mx-auto max-w-4xl space-y-5">

        {/* PROFILE CARD */}
        <motion.div
          className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Cover */}
          <div className="h-28 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 relative">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
          </div>

          {/* Content */}
          <div className="px-6 pb-5">

            {/* Top */}
            <div className="flex items-end justify-between -mt-2 mb-4">

              {/* Avatar */}
              <motion.div
                className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-extrabold text-white shadow-xl"
                whileHover={{ scale: 1.08, rotate: 5 }}
              >
                {
                  profile.name
                    ?.split(" ")
                    .map((word) => word[0])
                    .join("")
                    .toUpperCase() || "U"
                }
              </motion.div>

              {/* Button */}
              <motion.button
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${editing
                  ? "bg-green-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  if (editing) {
                    saveProfile();
                  } else {
                    setEditing(true);
                  }
                }}
              >
                {editing ? "✓ Save Profile" : "✏️ Edit Profile"}
              </motion.button>
            </div>

            {/* EDIT MODE */}
            {editing ? (
              <div className="space-y-3">

                <div className="grid grid-cols-2 gap-3">

                  {/* Name */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">
                      Name
                    </label>

                    <input
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                      value={profile.name}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">
                      Role
                    </label>

                    <input
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                      value={profile.role}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          role: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Github */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">
                      GitHub
                    </label>

                    <input
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                      value={profile.github}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          github: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">
                      Email
                    </label>

                    <input
                      disabled
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-gray-100"
                      value={profile.email}
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">
                    Bio
                  </label>

                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    value={profile.bio}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        bio: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            ) : (
              <>
                {/* VIEW MODE */}

                <h2 className="text-xl font-extrabold text-gray-900">
                  {profile.name}
                </h2>

                <p className="text-sm text-indigo-600 font-medium">
                  {profile.role}
                </p>

                <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-lg">
                  {profile.bio}
                </p>

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">

                  {/* Github */}
                  <a
                    href={`https://${profile.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 hover:text-gray-800"
                  >
                    {profile.github}
                  </a>

                  {/* Email */}
                  <span className="flex items-center gap-1.5">
                    {profile.email}
                  </span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* TABS */}
        <div className="flex gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
          {[
            ["profile", "👤 Profile"],
            ["notifications", `🔔 Notifications (${unread})`],
            ["activity", "📊 Activity"],
          ].map(([id, label]) => (
            <motion.button
              key={id}
              className={`relative flex-1 rounded-xl py-2.5 text-sm font-semibold ${tab === id
                ? "text-white"
                : "text-gray-500 hover:text-gray-700"
                }`}
              onClick={() => setTab(id)}
            >
              {tab === id && (
                <motion.div
                  layoutId="profile-tab"
                  className="absolute inset-0 rounded-xl bg-indigo-600"
                />
              )}

              <span className="relative z-10">{label}</span>
            </motion.button>
          ))}
        </div>

        {/* CONTENT */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >

            {/* PROFILE TAB */}
            {tab === "profile" && (
              <div className="grid grid-cols-2 gap-4">

                {/* Skills */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="mb-3 font-bold text-gray-900">
                    Skills
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, i) => (
                      <motion.span
                        key={i}
                        className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
                      >
                        {skill}
                      </motion.span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="mb-3 font-bold text-gray-900">
                    Stats
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-green-50 p-3 text-center">
                      <p className="text-2xl font-extrabold text-green-600">
                        {stats.tasksDone}
                      </p>
                      <p className="text-xs text-gray-500">
                        Tasks Done
                      </p>
                    </div>

                    <div className="rounded-xl bg-indigo-50 p-3 text-center">
                      <p className="text-2xl font-extrabold text-indigo-600">
                        {stats.snippets}
                      </p>
                      <p className="text-xs text-gray-500">
                        Snippets
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {tab === "notifications" && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="mb-3 flex items-center gap-3"
                  >
                    <div
                      className={`rounded-full px-2 py-1 text-xs ${TYPE_COLORS[n.type]
                        }`}
                    >
                      {n.icon}
                    </div>

                    <p>{n.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ACTIVITY */}
            {tab === "activity" && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                {activity.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <span className="text-3xl mb-2">📊</span>
                    <p className="text-sm text-gray-500">No recent activity yet</p>
                  </div>
                ) : (
                  activity.map((a, i) => (
                    <div
                      key={i}
                      className="mb-3 flex items-center gap-3"
                    >
                      <div>{a.icon}</div>
                      <p className="flex-1 text-sm text-gray-700">{a.text}</p>
                      <span className="text-xs text-gray-400">
                        {a.time}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </AppShell>
  );
}