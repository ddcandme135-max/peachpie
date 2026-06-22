import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "./ToastContext";
import i18n from "../i18n";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const navigate         = useNavigate();
  const { showToast }    = useToast();
  const audioRef         = useRef(new Audio());
  const currentTrackRef  = useRef(null);
  const queueRef         = useRef([]);

  const [currentTrack, setCurrentTrack] = useState(() => {
    try {
      const saved = localStorage.getItem('currentTrack');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [isPlaying, setIsPlaying]   = useState(false);
  const [progress, setProgress]     = useState(0);
  const [duration, setDuration]     = useState(0);
  const [sidebarPlayer, setSidebarPlayer] = useState(false);
  const [likedTracks, setLikedTracks]     = useState([]);
  const [followingArtists, setFollowingArtists] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try {
      const saved = localStorage.getItem('recentlyPlayed');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [playHistory, setPlayHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('playHistory');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [queue, setQueue] = useState([]);

  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("player-sidebar-toggle", { detail: { sidebarPlayer } }));
  }, [sidebarPlayer]);

  useEffect(() => {
    if (currentTrack) {
      localStorage.setItem('currentTrack', JSON.stringify(currentTrack));
    } else {
      localStorage.removeItem('currentTrack');
    }
  }, [currentTrack]);

  useEffect(() => {
    localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  useEffect(() => {
    localStorage.setItem('playHistory', JSON.stringify(playHistory));
  }, [playHistory]);

  useEffect(() => {
    if (queue.length > 0) return;
    supabase.from('tracks')
      .select('id, title, artist, cover_url, audio_url, profiles!tracks_author_id_fkey(username)')
      .eq('type', 'song')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data?.length) {
          const mapped = data.map(t => ({
            id: t.id,
            title: t.title,
            artist: t.profiles?.username ?? t.artist ?? '아티스트',
            cover_url: t.cover_url ?? null,
            audio_url: t.audio_url ?? null,
          }));
          setQueue(mapped);
          queueRef.current = mapped;
        }
      });
  }, []);

  // 비로그인(첫 방문)·로그아웃·다른 사용자 → 플레이어 상태 초기화 → 미니 플레이어 비움
  useEffect(() => {
    function clearPlayer() {
      setCurrentTrack(null);
      currentTrackRef.current = null;
      setQueue([]);
      queueRef.current = [];
      setRecentlyPlayed([]);
      setPlayHistory([]);
      setIsPlaying(false);
      setProgress(0);
      localStorage.removeItem('currentTrack');
      localStorage.removeItem('recentlyPlayed');
      localStorage.removeItem('playHistory');
      try { audioRef.current.pause(); audioRef.current.src = ""; } catch {}
    }
    function apply(session) {
      const uid = session?.user?.id ?? null;
      const stored = localStorage.getItem('playerUser');
      if (!uid) {
        // 비로그인 → 항상 비움
        clearPlayer();
        localStorage.removeItem('playerUser');
      } else if (uid !== stored) {
        // 다른/새 사용자 → 비우고 소유자 갱신
        clearPlayer();
        localStorage.setItem('playerUser', uid);
      }
    }
    // 마운트 시 즉시 확인
    supabase.auth.getSession().then(({ data: { session } }) => apply(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMeta = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onEnded      = async () => {
      let current = queueRef.current;

      if (current.length === 0) {
        const { data } = await supabase
          .from('tracks')
          .select('id, title, artist, cover_url, audio_url, profiles!tracks_author_id_fkey(username)')
          .eq('type', 'song')
          .order('created_at', { ascending: false });
        if (data?.length) {
          current = data.map(t => ({
            id: t.id,
            title: t.title,
            artist: t.profiles?.username ?? t.artist ?? '아티스트',
            cover_url: t.cover_url ?? null,
            audio_url: t.audio_url ?? null,
          }));
          setQueue(current);
          queueRef.current = current;
        }
      }

      const idx = current.findIndex(t => t.id === currentTrackRef.current?.id);
      if (idx >= 0 && idx < current.length - 1) {
        const next = current[idx + 1];
        playTrack(next, current);
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    };
    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate",     onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMeta);
    audio.addEventListener("ended",          onEnded);
    audio.addEventListener("play",           onPlay);
    audio.addEventListener("pause",          onPause);

    return () => {
      audio.removeEventListener("timeupdate",     onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMeta);
      audio.removeEventListener("ended",          onEnded);
      audio.removeEventListener("play",           onPlay);
      audio.removeEventListener("pause",          onPause);
    };
  }, []);

  function playTrack(track, trackList) {
    console.log('[playTrack] 호출됨, trackList:', trackList?.length ?? 'undefined');
    const audio = audioRef.current;
    setCurrentTrack(track);
    currentTrackRef.current = track;
    setProgress(0);
    setDuration(0);

    if (trackList?.length > 0) {
      setQueue(trackList);
      queueRef.current = trackList;
    }

    if (track.audio_url) {
      audio.src = track.audio_url;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      audio.src = "";
    }

    if (!track.isProject) {
      setRecentlyPlayed(prev => {
        const filtered = prev.filter(r => r.id !== track.id);
        return [track, ...filtered].slice(0, 7);
      });
      setPlayHistory(prev => {
        const filtered = prev.filter(r => r.id !== track.id);
        return [{ ...track, playedAt: new Date().toISOString() }, ...filtered];
      });
    }

    if (track.id) {
      supabase.from("tracks")
        .update({ last_played_at: new Date().toISOString() })
        .eq("id", track.id)
        .then(({ error }) => {
          console.log("[PlayerContext] last_played_at 업데이트:", track.id, error);
        });
    }
  }

  function playNext(track) {
    if (track) {
      setQueue(prev => {
        // 큐에 이미 있으면 제거(중복 방지)
        const deduped = prev.filter(t => t.id !== track.id);
        const currentIndex = deduped.findIndex(t => t.id === currentTrackRef.current?.id);
        if (currentIndex === -1) return [track, ...deduped];
        const newQueue = [...deduped];
        // 현재 트랙 바로 뒤 = 다음 트랙 리스트 맨 위
        newQueue.splice(currentIndex + 1, 0, track);
        return newQueue;
      });
      showToast(
        i18n.language?.startsWith("ko") ? "다음 재생에 추가됐습니다"
        : i18n.language?.startsWith("ja") ? "次に再生に追加しました"
        : "Added to Up Next",
        "success"
      );
      return;
    }
    const list = queueRef.current.length > 0 ? queueRef.current : [...recentlyPlayed].reverse();
    const idx = list.findIndex(t => t.id === currentTrackRef.current?.id);
    if (idx >= 0 && idx < list.length - 1) playTrack(list[idx + 1]);
  }

  function playPrev() {
    const list = queueRef.current.length > 0 ? queueRef.current : [...recentlyPlayed].reverse();
    const idx = list.findIndex(t => t.id === currentTrackRef.current?.id);
    if (idx > 0) playTrack(list[idx - 1]);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!currentTrack) return;
    if (!audio.src || audio.src === window.location.href) {
      if (!currentTrack.audio_url) return;
      audio.src = currentTrack.audio_url;
      audio.currentTime = 0;
    }
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  function seek(seconds) {
    const audio = audioRef.current;
    if (audio.src && isFinite(audio.duration)) {
      audio.currentTime = Math.max(0, Math.min(seconds, audio.duration));
    }
  }

  function toggleLike(track) {
    setLikedTracks(prev => {
      const key = t => t.id ?? `${t.title}::${t.artist}`;
      const exists = prev.some(t => key(t) === key(track));
      return exists ? prev.filter(t => key(t) !== key(track)) : [track, ...prev];
    });
  }

  function isLiked(track) {
    if (!track) return false;
    const key = t => t.id ?? `${t.title}::${t.artist}`;
    return likedTracks.some(t => key(t) === key(track));
  }

  function toggleFollow(artist) {
    setFollowingArtists(prev => {
      const exists = prev.some(a => a.id === artist.id);
      return exists ? prev.filter(a => a.id !== artist.id) : [artist, ...prev];
    });
  }

  function isFollowing(artist) {
    if (!artist) return false;
    return followingArtists.some(a => a.id === artist.id);
  }

  const upNextTracks = queue.slice(
    queue.findIndex(t => t.id === currentTrack?.id) + 1
  );

  return (
    <PlayerContext.Provider value={{
      currentTrack, currentTrackRef, isPlaying, progress, duration,
      sidebarPlayer, setSidebarPlayer,
      playTrack, togglePlay, seek,
      queue, setQueue, upNextTracks, playNext, playPrev,
      recentlyPlayed,
      playHistory,
      removeFromRecent: (id) => {
        setRecentlyPlayed(prev => prev.filter(t => t.id !== id));
        setPlayHistory(prev => prev.filter(t => t.id !== id));
      },
      restoreToRecent: (track) => {
        setRecentlyPlayed(prev => [track, ...prev.filter(t => t.id !== track.id)].slice(0, 7));
        setPlayHistory(prev => [track, ...prev.filter(t => t.id !== track.id)]);
      },
      likedTracks, toggleLike, isLiked,
      followingArtists, toggleFollow, isFollowing,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
