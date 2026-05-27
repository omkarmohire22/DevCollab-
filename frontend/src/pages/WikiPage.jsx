import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";

import { supabase } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const API = `${API_BASE}/wiki`;

export default function WikiPage() {
  // GET PROJECT ID FROM URL OR LOCALSTORAGE
  const { projectId: urlProjectId } = useParams();
  const [projectId, setProjectId] = useState(urlProjectId || localStorage.getItem("projectId"));
  const { token, user } = useAuth();

  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);

  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");

  // FETCH PAGES
  const fetchPages = async (projId) => {
    setError(null);
    const targetProjId = projId || projectId;
    try {
      if (!targetProjId || !token) return;

      const res = await axios.get(
        `${API}?projectId=${targetProjId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const fetchedPages = res.data.pages || [];

      setPages(fetchedPages);

      if (fetchedPages.length > 0) {
        const firstPage = fetchedPages[0];

        setActivePage(firstPage);
        setEditorTitle(firstPage.title || "");
        setEditorContent(firstPage.content || "");
      } else {
        setActivePage(null);
      }
    } catch (err) {
      console.error("Fetch pages error:", err);
      setError(err.response?.data?.error || err.message || "Failed to load wiki pages");
    }
  };

  useEffect(() => {
    const resolveAndFetch = async () => {
      let activeProjectId = projectId;
      
      // If we don't have projectId, try auto-resolving
      if (!activeProjectId && token) {
        let workspaceId = localStorage.getItem("workspaceId");
        
        // 1. Resolve workspaceId if missing
        if (!workspaceId && user) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("auth_id", user.id || user.auth_id)
              .single();
              
            if (profile) {
              const { data: ws } = await supabase
                .from("workspaces")
                .select("id")
                .eq("owner_id", profile.id)
                .limit(1)
                .single();
              if (ws) {
                workspaceId = ws.id;
                localStorage.setItem("workspaceId", workspaceId);
              }
            }
          } catch (e) {
            console.error("Wiki resolve workspace error:", e);
          }
        }

        // 2. Resolve projectId from workspaceId
        if (workspaceId) {
          try {
            const { data: proj } = await supabase
              .from("projects")
              .select("id")
              .eq("workspace_id", workspaceId)
              .limit(1)
              .single();
            if (proj) {
              activeProjectId = proj.id;
              localStorage.setItem("projectId", activeProjectId);
              setProjectId(activeProjectId);
            }
          } catch (e) {
            console.error("Wiki resolve project error:", e);
          }
        }
      }

      if (activeProjectId && token) {
        fetchPages(activeProjectId);
      }
    };

    resolveAndFetch();
  }, [projectId, token, user]);

  // CREATE PAGE
  const createPage = async () => {
    if (!projectId) {
      alert("No active project. Please select or create a project from the Dashboard first.");
      return;
    }
    try {
      const pageTitle = `Untitled Page ${pages.length + 1}`;

      const slug = pageTitle
        .toLowerCase()
        .replace(/\s+/g, "-") +
        "-" +
        Date.now();

      const res = await axios.post(
        API,
        {
          project_id: projectId,
          title: pageTitle,
          content: "# Start Writing Here...",
          slug,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const newPage = res.data.page;

      setPages((prev) => [newPage, ...prev]);

      setActivePage(newPage);

      setEditorTitle(newPage.title);
      setEditorContent(newPage.content);

      setEditing(true);
    } catch (err) {
      console.error("Create page error:", err.response?.data || err);
      alert("Create page error: " + (err.response?.data?.error || err.message));
    }
  };

  // SAVE PAGE
  const savePage = async () => {
    try {
      if (!activePage) return;

      const res = await axios.put(
        `${API}/${activePage.id}`,
        {
          title: editorTitle,
          content: editorContent,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedPage = res.data.page;

      const updatedPages = pages.map((p) =>
        p.id === updatedPage.id ? updatedPage : p
      );

      setPages(updatedPages);

      setActivePage(updatedPage);

      setEditing(false);
    } catch (err) {
      console.error("Save error:", err);
      alert("Save error: " + (err.response?.data?.error || err.message));
    }
  };

  // DELETE PAGE
  const deletePage = async () => {
    try {
      if (!activePage) return;

      await axios.delete(
        `${API}/${activePage.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const filteredPages = pages.filter(
        (p) => p.id !== activePage.id
      );

      setPages(filteredPages);

      if (filteredPages.length > 0) {
        setActivePage(filteredPages[0]);

        setEditorTitle(filteredPages[0].title);
        setEditorContent(filteredPages[0].content);
      } else {
        setActivePage(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete error: " + (err.response?.data?.error || err.message));
    }
  };

  // MARKDOWN RENDER
  const renderContent = (content = "") => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("# ")) {
        return (
          <h1
            key={i}
            className="text-3xl font-bold mb-4 text-gray-900"
          >
            {line.replace("# ", "")}
          </h1>
        );
      }

      if (line.startsWith("## ")) {
        return (
          <h2
            key={i}
            className="text-xl font-semibold mt-6 mb-2 text-gray-800"
          >
            {line.replace("## ", "")}
          </h2>
        );
      }

      return (
        <p
          key={i}
          className="text-gray-600 mb-2 leading-relaxed"
        >
          {line}
        </p>
      );
    });
  };

  return (
    <AppShell
      title="Wiki"
      subtitle={projectId ? `Project documentation · ${pages.length} pages` : "Project documentation"}
      actions={
        projectId && (
          <div className="flex gap-2">
            {editing ? (
              <button
                onClick={savePage}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Save
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                disabled={!activePage}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 disabled:opacity-50"
              >
                Edit
              </button>
            )}

            <button
              onClick={createPage}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              + New Page
            </button>

            {activePage && (
              <button
                onClick={deletePage}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Delete
              </button>
            )}
          </div>
        )
      }
    >
      {!projectId ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center bg-white border border-gray-100 rounded-2xl shadow-sm h-full p-8">
          <span className="text-4xl mb-3">📄</span>
          <h2 className="text-xl font-bold text-gray-700">No Active Project</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">Please select or create a project from the Dashboard first to access the Project Wiki.</p>
        </div>
      ) : (
        <div className="flex gap-5 h-full">

          {/* SIDEBAR */}
          <div className="w-72 flex-shrink-0 space-y-2">
            <p className="px-2 text-xs font-bold uppercase tracking-widest text-gray-400">
              Pages
            </p>

            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => {
                  setActivePage(page);
                  setEditorTitle(page.title);
                  setEditorContent(page.content);
                  setEditing(false);
                }}
                className={`w-full rounded-xl p-3 text-left transition ${
                  activePage?.id === page.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-gray-100 hover:bg-gray-50"
                }`}
              >
                <p className="truncate font-semibold">
                  📄 {page.title}
                </p>

                <p className="mt-1 text-xs opacity-70">
                  {new Date(page.updated_at).toLocaleString()}
                </p>
              </button>
            ))}
          </div>

          {/* MAIN CONTENT */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage?.id || "empty"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"
            >
              {error ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-6 bg-red-50 rounded-2xl border border-red-100">
                  <span className="text-4xl mb-3">⚠️</span>
                  <h2 className="text-xl font-bold text-red-700">Wiki Error</h2>
                  <p className="mt-2 text-red-600 max-w-md">{error}</p>
                  <button
                    onClick={() => fetchPages(projectId)}
                    className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-white font-semibold shadow-md"
                  >
                    Try Again
                  </button>
                </div>
              ) : !activePage ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <h2 className="text-2xl font-bold text-gray-700">
                    No pages yet
                  </h2>

                  <p className="mt-2 text-gray-500">
                    Create your first wiki document
                  </p>

                  <button
                    onClick={createPage}
                    className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-white font-semibold"
                  >
                    + Create First Page
                  </button>
                </div>
              ) : editing ? (
                <div className="space-y-4">

                  {/* PAGE NAME */}
                  <input
                    type="text"
                    value={editorTitle}
                    onChange={(e) =>
                      setEditorTitle(e.target.value)
                    }
                    placeholder="Enter page name"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-3xl font-bold outline-none focus:border-indigo-400"
                  />

                  {/* CONTENT */}
                  <textarea
                    value={editorContent}
                    onChange={(e) =>
                      setEditorContent(e.target.value)
                    }
                    placeholder="Write your documentation..."
                    className="h-[600px] w-full rounded-xl border border-gray-200 p-4 outline-none focus:border-indigo-400"
                  />
                </div>
              ) : (
                <div className="prose max-w-none">
                  <h1 className="mb-6 text-4xl font-bold text-gray-900">
                    {activePage.title}
                  </h1>

                  {renderContent(activePage.content)}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </AppShell>
  );
}