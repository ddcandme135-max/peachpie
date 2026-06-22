import { lazy, Suspense, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { Routes, Route, useLocation } from "react-router-dom";
import { PlayerProvider, usePlayer } from "./context/PlayerContext";
import { AppProvider } from "./context/AppContext";
import { ToastProvider } from "./context/ToastContext";
import { LangProvider } from "./context/LangContext";
import MiniPlayer from "./components/MiniPlayer";

const Home            = lazy(() => import("./pages/Home"));
const Library         = lazy(() => import("./pages/Library"));
const Chat            = lazy(() => import("./pages/Chat"));
const NewSongs        = lazy(() => import("./pages/NewSongs"));
const RecentlyPlayed  = lazy(() => import("./pages/RecentlyPlayed"));
const ForYou          = lazy(() => import("./pages/ForYou"));
const PostDetail      = lazy(() => import("./pages/PostDetail"));
const CollaboBoard    = lazy(() => import("./pages/CollaboBoard"));
const ArtistProfile   = lazy(() => import("./pages/ArtistProfile"));
const ProjectDetail   = lazy(() => import("./pages/ProjectDetail"));
const TrackDetail     = lazy(() => import("./pages/TrackDetail"));
const CollabFeed      = lazy(() => import("./pages/CollabFeed"));
const PositionPage    = lazy(() => import("./pages/PositionPage"));
const SearchResults   = lazy(() => import("./pages/SearchResults"));
const Admin           = lazy(() => import("./pages/Admin"));
const Playlist        = lazy(() => import("./pages/Playlist"));

function PageLoader() {
  return (
    <div style={{ minHeight: "100vh", background: "#000000", display: "grid", placeItems: "center" }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
        <path d="M12 3a9 9 0 0 1 9 9">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );
}

function SpacebarHandler() {
  const { togglePlay } = usePlayer();
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.code !== "Space") return;
      if (e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.contentEditable === "true") return;
      e.preventDefault();
      togglePlay();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay]);
  return null;
}

function ConditionalMiniPlayer() {
  const { pathname } = useLocation();
  if (pathname === "/chat" || pathname === "/admin") return null;
  if (/^\/(track|song|collabo|project)\//.test(pathname)) return null;
  return <MiniPlayer />;
}

export default function App() {
  useEffect(() => {
    async function fixAudioNames() {
      const { data: tracks } = await supabase
        .from("tracks")
        .select("id, audio_url, audio_name")
        .eq("type", "song")
        .is("audio_name", null);
      if (!tracks?.length) return;
      for (const t of tracks) {
        if (!t.audio_url) continue;
        const filename = decodeURIComponent(
          t.audio_url.split("/").pop().split("?")[0]
        );
        await supabase.from("tracks")
          .update({ audio_name: filename })
          .eq("id", t.id);
      }
      console.log("audio_name 업데이트 완료");
    }
    fixAudioNames();
  }, []);

  return (
    <ToastProvider>
    <LangProvider>
    <AppProvider>
    <PlayerProvider>
      <SpacebarHandler />
      <div className="text-white min-h-screen" style={{ background: "#000000" }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"              element={<Home />} />
            <Route path="/library"       element={<Library />} />
            <Route path="/search"        element={<SearchResults />} />
            <Route path="/chat"          element={<Chat />} />
            <Route path="/new-songs"     element={<NewSongs />} />
            <Route path="/recently-played" element={<RecentlyPlayed />} />
            <Route path="/for-you" element={<ForYou />} />
            <Route path="/post/:id"      element={<PostDetail />} />
            <Route path="/collabo-board" element={<CollaboBoard />} />
            <Route path="/position/:key"  element={<PositionPage />} />
            <Route path="/artist"        element={<ArtistProfile />} />
            <Route path="/profile/:id"   element={<ArtistProfile />} />
            <Route path="/project"       element={<ProjectDetail />} />
            <Route path="/project/:id"   element={<ProjectDetail />} />
            <Route path="/track/:id"     element={<TrackDetail />} />
            <Route path="/song/:id"      element={<TrackDetail />} />
            <Route path="/collabo/:id"   element={<TrackDetail />} />
            <Route path="/search-results" element={<SearchResults />} />
            <Route path="/board"         element={<CollabFeed />} />
            <Route path="/admin"         element={<Admin />} />
            <Route path="/playlist/:id"  element={<Playlist />} />
          </Routes>
        </Suspense>
        <ConditionalMiniPlayer />
      </div>
    </PlayerProvider>
    </AppProvider>
    </LangProvider>
    </ToastProvider>
  );
}
