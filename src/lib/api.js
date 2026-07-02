import { supabase } from "./supabase";

// ── Trending ──────────────────────────────────────
export async function fetchTrending({ limit = 5 } = {}) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: tracks }, { data: projects }] = await Promise.all([
    supabase
      .from("tracks")
      .select("*, profiles!tracks_author_id_fkey(username, avatar_url), likes(id)")
      .eq("type", "song")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("*, likes(id)")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
  ]);

  const scored = [
    ...(tracks ?? []).map(t => ({ ...t, kind: "track", score: (t.likes?.length ?? 0) })),
    ...(projects ?? []).map(p => ({ ...p, kind: "project", score: (p.likes?.length ?? 0) })),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { data: scored };
}

// ── Recommended ───────────────────────────────────
export async function fetchRecommended({ userId, type = "track", limit = 5 }) {
  if (!userId) {
    return fetchTrending({ limit: 10 }).then(({ data }) => ({
      data: data.filter(d => (type === "track" ? d.kind === "track" : d.kind === "project")).slice(5, 10)
    }));
  }

  const table = type === "track" ? "tracks" : "projects";
  const likeFilter = type === "track" ? "track_id" : "project_id";

  const { data: likedItems } = await supabase
    .from("likes")
    .select(`${likeFilter}, ${table}!likes_${likeFilter}_fkey(genre, position)`)
    .eq("user_id", userId)
    .not(likeFilter, "is", null)
    .limit(10);

  if (!likedItems?.length) {
    return fetchTrending({ limit: 10 }).then(({ data }) => ({
      data: data.filter(d => (type === "track" ? d.kind === "track" : d.kind === "project")).slice(5, 10)
    }));
  }

  const genres = [...new Set(likedItems.map(l => l[table]?.genre).filter(Boolean))];
  const likedIds = likedItems.map(l => l[likeFilter]);

  let query = supabase.from(table).select("*").not("id", "in", `(${likedIds.join(",")})`).limit(limit);

  if (genres.length) {
    if (type === "track") {
      query = query.overlaps("genre", genres);
    } else {
      query = query.in("genre", genres);
    }
  }

  const { data } = await query;
  return { data: data ?? [] };
}

// ── Auth ──────────────────────────────────────────
export async function getUid() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// ── Profile ───────────────────────────────────────
export function fetchProfile(uid) {
  return supabase
    .from("profiles")
    .select("id, username, handle, bio, website, avatar_url")
    .eq("id", uid)
    .single();
}

export function upsertProfile(uid, fields) {
  return supabase
    .from("profiles")
    .upsert({ id: uid, ...fields }, { onConflict: "id" });
}

// ── Posts (협업 공고) ─────────────────────────────
export function fetchPosts({ category, limit = 20, page = 0 } = {}) {
  let q = supabase
    .from("posts")
    .select("*, profiles!posts_author_id_fkey(username, handle, avatar_url)")
    .order("created_at", { ascending: false })
    .range(page * limit, page * limit + limit - 1);
  if (category && category !== "전체") q = q.eq("category", category);
  return q;
}

export async function fetchPostById(id) {
  // 1단계: 게시물만 조회 (join 없이)
  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !post) return { data: null, error };

  // 2단계: author_id로 프로필 별도 조회 후 병합
  if (post.author_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, handle, avatar_url")
      .eq("id", post.author_id)
      .single();
    post.profiles = profile ?? null;
  } else {
    post.profiles = null;
  }
  return { data: post, error: null };
}

export function fetchPostsByUser(uid) {
  return supabase
    .from("posts")
    .select("id, title, category, thumb_bg, icon, genre, deadline, like_count, comment_count, created_at, author_id")
    .eq("author_id", uid)
    .order("created_at", { ascending: false });
}

export function createPost(uid, post) {
  return supabase
    .from("posts")
    .insert({ author_id: uid, ...post })
    .select()
    .single();
}

export function updatePost(postId, fields) {
  return supabase.from("posts").update(fields).eq("id", postId).select().single();
}

export function deletePost(postId) {
  return supabase.from("posts").delete().eq("id", postId);
}

// ── Likes ─────────────────────────────────────────
export async function isPostLiked(uid, postId) {
  const { data } = await supabase
    .from("likes")
    .select("user_id")
    .eq("user_id", uid)
    .eq("post_id", postId)
    .maybeSingle();
  return !!data;
}

export async function likePost(uid, postId) {
  await supabase.from("likes").insert({ user_id: uid, post_id: postId });
  await supabase.rpc("increment_like", { pid: postId });
}

export async function unlikePost(uid, postId) {
  await supabase.from("likes").delete().eq("user_id", uid).eq("post_id", postId);
  await supabase.rpc("decrement_like", { pid: postId });
}

export async function incrementComment(postId) {
  await supabase.rpc("increment_comment", { pid: postId });
}

export async function decrementComment(postId) {
  await supabase.rpc("decrement_comment", { pid: postId });
}

// ── Tracks (음원) ─────────────────────────────────
export function fetchTracks({ limit = 20, page = 0 } = {}) {
  return supabase
    .from("tracks")
    .select("*, profiles(username, handle)")
    .eq("type", "song")
    .order("created_at", { ascending: false })
    .range(page * limit, page * limit + limit - 1);
}

export function fetchTrackById(id) {
  return supabase
    .from("tracks")
    .select("*, profiles!tracks_author_id_fkey(username, handle, avatar_url)")
    .eq("id", id)
    .single();
}

export function fetchTracksByUser(uid) {
  return supabase
    .from("tracks")
    .select("id, title, type, genre, cover_url, thumb_bg, duration, description, created_at, author_id")
    .eq("author_id", uid)
    .order("created_at", { ascending: false });
}

export function createTrack(uid, track) {
  return supabase
    .from("tracks")
    .insert({ author_id: uid, ...track })
    .select()
    .single();
}

export function updateTrack(trackId, fields) {
  return supabase.from("tracks").update(fields).eq("id", trackId).select().single();
}

export function deleteTrack(trackId) {
  return supabase.from("tracks").delete().eq("id", trackId);
}

// ── Storage Uploads ───────────────────────────────
export async function uploadAudio(uid, file) {
  const ext = file.name.split(".").pop();
  const path = `${uid}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("audio").upload(path, file);
  if (error) throw error;
  return supabase.storage.from("audio").getPublicUrl(path).data.publicUrl;
}

export async function uploadCover(uid, file) {
  const ext = file.name.split(".").pop();
  const path = `${uid}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("covers").upload(path, file);
  if (error) throw error;
  return supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
}

// ── Follows ───────────────────────────────────────
export function followUser(followerId, followingId) {
  return supabase
    .from("follows")
    .insert({ follower_id: followerId, following_id: followingId });
}

export function unfollowUser(followerId, followingId) {
  return supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
}

export async function checkFollowing(followerId, followingId) {
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return !!data;
}

export async function getFollowerCount(uid) {
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", uid);
  return count ?? 0;
}

export async function getFollowingCount(uid) {
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", uid);
  return count ?? 0;
}

// ── Messages ──────────────────────────────────────
export function fetchMessages(userId, partnerId) {
  return supabase
    .from("messages")
    .select("id, sender_id, receiver_id, content, created_at, is_read, conversation_id")
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),` +
      `and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
    )
    .order("created_at", { ascending: true });
}

export function sendMessage(senderId, receiverId, content) {
  return supabase
    .from("messages")
    .insert({ sender_id: senderId, receiver_id: receiverId, content })
    .select()
    .single();
}

export function subscribeToMessages(myId, partnerId, onNewMessage) {
  const channel = `chat:${[myId, partnerId].sort().join("_")}`;
  return supabase
    .channel(channel)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${myId}` },
      onNewMessage
    )
    .subscribe();
}

// ── For You (개인화 추천) ──────────────────────────────
export async function fetchForYou({ userId, recentlyPlayed = [], limit = 20 } = {}) {
  const { supabase } = await import("./supabase");

  const CACHE_KEY = `for_you_v2_${userId ?? "guest"}_${limit}`;
  const CACHE_TTL = 12 * 60 * 60 * 1000; // 12시간

  // 캐시 확인 (12시간)
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return { data };
    }
  } catch {}

  // 1. 최근 재생 장르 추출
  const recentIds = recentlyPlayed.map(t => t.id).filter(Boolean).slice(0, 20);

  // 2. 좋아요 누른 트랙 장르 추출
  let likedGenres = [];
  if (userId) {
    const { data: likedTracks } = await supabase
      .from("likes")
      .select("track_id, tracks!likes_track_id_fkey(genre)")
      .eq("user_id", userId)
      .not("track_id", "is", null)
      .limit(20);
    likedGenres = (likedTracks ?? [])
      .map(l => l.tracks?.genre)
      .flat()
      .filter(Boolean)
      .map(g => Array.isArray(g) ? g[0] : g)
      .filter(Boolean);
  }

  // 3. 최근 재생 트랙 장르 추출
  let recentGenres = [];
  if (recentIds.length) {
    const { data: recentTracks } = await supabase
      .from("tracks")
      .select("id, genre")
      .in("id", recentIds);
    recentGenres = (recentTracks ?? [])
      .map(t => Array.isArray(t.genre) ? t.genre[0] : t.genre)
      .filter(Boolean);
  }

  // 4. 장르 빈도 계산
  const allGenres = [...likedGenres, ...recentGenres];
  const genreCount = {};
  allGenres.forEach(g => { genreCount[g] = (genreCount[g] ?? 0) + 1; });
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([g]) => g);

  // 5. 장르 기반 추천 or New Songs 무작위 폴백
  const excludeIds = recentIds;
  let result = [];

  if (topGenres.length) {
    const { data } = await supabase
      .from("tracks")
      .select("id, title, genre, duration, cover_url, audio_url, author_id, profiles!tracks_author_id_fkey(username)")
      .eq("type", "song")
      .or(topGenres.map(g => `genre.ilike.%${g}%`).join(","))
      .not("id", "in", excludeIds.length ? `(${excludeIds.join(",")})` : "(00000000-0000-0000-0000-000000000000)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data?.length) result = data;
  }

  // 개인화 결과가 limit보다 적으면 New Songs로 채워 넣음(항상 풍부한 리스트 유지)
  if (result.length < limit) {
    const haveIds = new Set([...result.map(t => t.id), ...excludeIds]);
    const { data: newSongs } = await supabase
      .from("tracks")
      .select("id, title, genre, duration, cover_url, audio_url, author_id, profiles!tracks_author_id_fkey(username)")
      .eq("type", "song")
      .order("created_at", { ascending: false })
      .limit(50);
    const extra = (newSongs ?? []).filter(t => !haveIds.has(t.id)).sort(() => Math.random() - 0.5);
    result = [...result, ...extra].slice(0, limit);
  }

  // 캐시 저장 (12시간)
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() })); } catch {}
  return { data: result };
}
