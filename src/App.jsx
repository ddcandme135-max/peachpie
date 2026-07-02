import { lazy, Suspense, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { Routes, Route, useLocation } from "react-router-dom";
import { PlayerProvider, usePlayer } from "./context/PlayerContext";
import { AppProvider } from "./context/AppContext";
import { ToastProvider } from "./context/ToastContext";
import { LangProvider } from "./context/LangContext";
import MiniPlayer from "./components/MiniPlayer";
import MobileDock from "./components/MobileDock";
import { useIsMobile } from "./lib/useIsMobile";

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
const Privacy         = lazy(() => import("./pages/Privacy"));

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

// 전역 모바일 하단 독 — 라우트 밖에서 한 번만 렌더(탭 이동 시 리마운트 없음 → CD 깜빡임/회전 리셋 방지).
// 채팅은 목록/스레드 전환 로직이 있어 자체 독을 사용하므로 여기선 제외.
function MobileDockGate() {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const show = isMobile && (pathname === "/" || pathname === "/search" || pathname === "/search-results" || pathname === "/library");
  if (!show) return null;
  return <MobileDock />;
}

function ConditionalMiniPlayer() {
  const { pathname } = useLocation();
  const { currentTrack, sidebarPlayer } = usePlayer();
  // 모바일 홈/검색은 자체 플로팅 독(미니 플레이어)을 렌더하므로 전역 미니플레이어 숨김
  const isMobileDock = typeof window !== "undefined" && window.innerWidth < 768 && (pathname === "/" || pathname === "/search" || pathname === "/search-results" || pathname === "/library");
  const hiddenRoute = isMobileDock || pathname === "/chat" || pathname === "/admin" || /^\/(track|song|collabo|project)\//.test(pathname);
  const visible = !hiddenRoute && !!currentTrack && !sidebarPlayer;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("miniplayer-visibility", { detail: { visible } }));
  }, [visible]);
  if (hiddenRoute) return null;
  return <MiniPlayer />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
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
      <ScrollToTop />
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
            <Route path="/privacy"       element={<Privacy />} />
          </Routes>
        </Suspense>
        <ConditionalMiniPlayer />
        <MobileDockGate />
      </div>
    </PlayerProvider>
    </AppProvider>
    </LangProvider>
    </ToastProvider>
  );
}
