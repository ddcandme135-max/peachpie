import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const AppContext = createContext(null);

// 삭제된 관리자 시스템 메시지 발신자 — 남아있는 안 읽은 메시지가 배지로 잡히지 않도록 제외
const LEGACY_SYSTEM_SENDER_ID = "aace8d83-2462-4c0e-8cbb-253d535001e0";

export function AppProvider({ children }) {
  const [session, setSession]             = useState(null);
  const [profile, setProfile]             = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [deletedTrackIds, setDeletedTrackIds] = useState(new Set());
  const [deletedPostIds,  setDeletedPostIds]  = useState(new Set());

  const loadProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, username, handle, bio, website, avatar_url")
      .eq("id", uid)
      .single();
    if (data) setProfile(data);
  }, []);

  const loadUnreadCount = useCallback(async (uid) => {
    if (!uid) { setUnreadCount(0); return; }
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", uid)
      .eq("is_read", false)
      .neq("sender_id", LEGACY_SYSTEM_SENDER_ID);
    setUnreadCount(count ?? 0);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      await Promise.all([
        loadProfile(session?.user?.id),
        loadUnreadCount(session?.user?.id),
      ]);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      loadProfile(s?.user?.id);
    });
    return () => subscription.unsubscribe();
  }, [loadProfile, loadUnreadCount]);

  // 읽지 않은 메시지 수 실시간 동기화
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) { setUnreadCount(0); return; }

    loadUnreadCount(uid);

    const ch = supabase
      .channel(`app-unread-${uid}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${uid}` },
        (payload) => { if (payload.new.is_read === false) loadUnreadCount(uid); }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `receiver_id=eq.${uid}` },
        (payload) => { if (payload.new.is_read === true) loadUnreadCount(uid); }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [session?.user?.id, loadUnreadCount]);

  // 프로필 변경 실시간 구독
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    const ch = supabase
      .channel(`profile-changes-${uid}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${uid}`,
      }, (payload) => {
        setProfile(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session?.user?.id]);

  useEffect(() => {
    const ch = supabase
      .channel("global-deletes")
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "tracks" },
        (payload) => {
          const id = payload.old.id;
          setDeletedTrackIds(prev => new Set([...prev, id]));
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" },
        (payload) => {
          const id = payload.old.id;
          setDeletedPostIds(prev => new Set([...prev, id]));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();
    if (data) setProfile(data);
  }, [session?.user?.id]);

  const refreshUnreadCount = useCallback(() => {
    loadUnreadCount(session?.user?.id);
  }, [loadUnreadCount, session?.user?.id]);

  const addNotification = useCallback((note) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, ...note }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{
      session, profile, notifications, loading,
      unreadCount, refreshUnreadCount,
      refreshProfile, addNotification, removeNotification,
      deletedTrackIds, deletedPostIds,
      addDeletedPostId: (id) => setDeletedPostIds(prev => new Set([...prev, id])),
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

// backward-compat alias for components that still import useUser
export { useApp as useUser };
