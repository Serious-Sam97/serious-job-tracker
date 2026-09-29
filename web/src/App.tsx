import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChartColumn, Columns3, ListTodo, LogOut, Plus, Search, Sun, Users } from "lucide-react";
import { api } from "./api";
import { Spinner } from "./components/ui";
import ErrorBoundary from "./components/ErrorBoundary";
import CommandPalette from "./components/CommandPalette";
import { useToday } from "./hooks";
import Today from "./pages/Today";
import Workspace, { PaneEmpty } from "./pages/Workspace";
import ApplicationDetail from "./pages/ApplicationDetail";
import ApplicationForm from "./pages/ApplicationForm";
import BoardPage from "./pages/BoardPage";
import Insights from "./pages/Insights";
import Contacts from "./pages/Contacts";
import Login from "./pages/Login";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export default function App() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: api.me, staleTime: Infinity });
  const { pathname } = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (!pathname.startsWith("/applications")) window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const onAuth = () => qc.invalidateQueries({ queryKey: ["me"] });
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("auth:required", onAuth);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("auth:required", onAuth);
      window.removeEventListener("keydown", onKey);
    };
  }, [qc]);

  if (me.isPending) return <Spinner />;
  if (me.data && !me.data.authenticated) return <Login />;

  const logout = async () => {
    await api.logout();
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
    qc.setQueryData(["me"], { authEnabled: true, authenticated: false });
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-mark">S</span>
          <span>
            <em>Serious</em> Job Tracker
          </span>
        </Link>
        <button className="side-btn side-search" onClick={() => setPaletteOpen(true)} aria-label="Search">
          <Search />
          <span>Search</span>
          <kbd>{isMac ? "⌘" : "Ctrl"} K</kbd>
        </button>
        <Link to="/applications/new" className="btn btn-primary side-new" aria-label="New application">
          <Plus />
          <span>New application</span>
        </Link>
        <nav className="nav">
          <NavLink to="/" end>
            <Sun />
            <span>Today</span>
            <TodayCount />
          </NavLink>
          <NavLink to="/applications">
            <ListTodo />
            <span>Applications</span>
          </NavLink>
          <NavLink to="/board">
            <Columns3 />
            <span>Board</span>
          </NavLink>
          <NavLink to="/insights">
            <ChartColumn />
            <span>Insights</span>
          </NavLink>
          <NavLink to="/contacts">
            <Users />
            <span>Contacts</span>
          </NavLink>
        </nav>
        {me.data?.authEnabled && (
          <div className="sidebar-foot">
            <button className="side-btn" onClick={logout}>
              <LogOut />
              <span>Log out</span>
            </button>
          </div>
        )}
      </aside>

      <main className="main">
        <ErrorBoundary key={pathname.split("/")[1]}>
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/applications" element={<Workspace />}>
              <Route index element={<PaneEmpty />} />
              <Route path="new" element={<ApplicationForm />} />
              <Route path=":id" element={<ApplicationDetail />} />
              <Route path=":id/edit" element={<ApplicationForm />} />
            </Route>
            <Route path="/board" element={<BoardPage />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}

function TodayCount() {
  const { needsYou } = useToday();
  return needsYou.length ? <span className="nav-count">{needsYou.length}</span> : null;
}
