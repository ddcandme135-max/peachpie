import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const loadProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase
      .from("profiles")
      .select("username, handle, bio, website, avatar_url")
      .eq("id", uid)
      .single();
    if (data) setProfile(data);
  }, []);

  // auth 상태 감지 + 프로필 초기 로드
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      loadProfile(session?.user?.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      loadProfile(s?.user?.id);
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // 저장 후 외부에서 호출해 프로필 갱신
  const refreshProfile = useCallback(() => {
    loadProfile(session?.user?.id);
  }, [loadProfile, session]);

  return (
    <UserContext.Provider value={{ session, profile, refreshProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
