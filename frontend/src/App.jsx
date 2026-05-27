import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RealtimeProvider } from "./context/RealtimeContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import NotificationToast from "./components/NotificationToast";
import LandingPage from "./pages/LandingPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import DashboardPage from "./pages/DashboardPage";
import KanbanPage from "./pages/KanbanPage";
import SnippetsPage from "./pages/SnippetsPage";
import WikiPage from "./pages/WikiPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import DevPulsePage from "./pages/DevPulsePage";
import ActivityPage from "./pages/ActivityPage";
import CreateWorkspacePage from "./pages/CreateWorkspacePage";
import WorkspaceSettingsPage from "./pages/WorkspaceSettingsPage";
import NewProjectPage from "./pages/NewProjectPage";
import ProfilePage from "./pages/ProfilePage";
import PaymentsPage from "./pages/PaymentsPage";
import WhiteboardPage from "./pages/WhiteboardPage";
import ProjectHealthPage from "./pages/ProjectHealthPage";
import InvitePage from "./pages/InvitePage";

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <ToastProvider>
          <BrowserRouter>
            <NotificationToast />
            <Routes>
              <Route path="/" element={<LandingPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/invite/:token" element={<InvitePage />} />
            <Route path="/create-workspace" element={<CreateWorkspacePage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/new-project"
              element={
                <ProtectedRoute>
                  <NewProjectPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kanban"
              element={
                <ProtectedRoute>
                  <KanbanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/snippets"
              element={
                <ProtectedRoute>
                  <SnippetsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wiki/:projectId"
              element={
                <ProtectedRoute>
                  <WikiPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wiki"
              element={
                <ProtectedRoute>
                  <WikiPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/ai"
              element={
                <ProtectedRoute>
                  <AIAssistantPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pulse"
              element={
                <ProtectedRoute>
                  <DevPulsePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <ActivityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace/settings"
              element={
                <ProtectedRoute>
                  <WorkspaceSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute>
                  <PaymentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/whiteboard"
              element={
                <ProtectedRoute>
                  <WhiteboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/health"
              element={
                <ProtectedRoute>
                  <ProjectHealthPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </RealtimeProvider>
    </AuthProvider>
  );
}
