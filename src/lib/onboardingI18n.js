// 온보딩 버튼/문구 다국어 (ko, en, ja, de, es, fr, id, it, pt)
const STR = {
  browse:      { ko: "둘러보기",        en: "Browse",        ja: "探す",                de: "Entdecken",        es: "Explorar",        fr: "Explorer",            id: "Jelajahi",       it: "Esplora",        pt: "Explorar" },
  uploadSong:  { ko: "음원 업로드",      en: "Upload song",   ja: "音源をアップロード",   de: "Song hochladen",   es: "Subir canción",   fr: "Importer un morceau", id: "Unggah lagu",    it: "Carica brano",   pt: "Enviar música" },
  addPlaylist: { ko: "플레이리스트 추가", en: "Add playlist",  ja: "プレイリストを追加",   de: "Playlist hinzufügen", es: "Añadir lista",  fr: "Ajouter une playlist", id: "Tambah playlist", it: "Aggiungi playlist", pt: "Adicionar playlist" },
  create:      { ko: "생성하기",        en: "Create",        ja: "作成",                de: "Erstellen",        es: "Crear",           fr: "Créer",               id: "Buat",           it: "Crea",           pt: "Criar" },

  noLikedSongs:       { ko: "좋아요 누른 음원이 없습니다",   en: "No liked songs yet",        ja: "いいねした音源がありません",            de: "Noch keine gelikten Songs",        es: "Aún no hay canciones que te gusten", fr: "Aucun morceau aimé pour l'instant",   id: "Belum ada lagu yang disukai",          it: "Nessun brano apprezzato",            pt: "Nenhuma música curtida ainda" },
  noUploadedSongs:    { ko: "아직 업로드 한 음원이 없어요",   en: "No uploaded songs yet",     ja: "アップロードした音源がまだありません",   de: "Noch keine hochgeladenen Songs",   es: "Aún no hay canciones subidas",       fr: "Aucun morceau importé pour l'instant", id: "Belum ada lagu yang diunggah",        it: "Nessun brano caricato",              pt: "Nenhuma música enviada ainda" },
  noPlaylists:        { ko: "아직 생성된 플레이리스트가 없어요", en: "No playlists yet",        ja: "プレイリストがまだありません",          de: "Noch keine Playlists",             es: "Aún no hay listas de reproducción",  fr: "Aucune playlist pour l'instant",      id: "Belum ada playlist",                   it: "Nessuna playlist",                   pt: "Nenhuma playlist ainda" },
  noProjects:         { ko: "아직 표시할 프로젝트가 없습니다", en: "No projects to show yet",   ja: "表示するプロジェクトがまだありません",   de: "Noch keine Projekte vorhanden",    es: "Aún no hay proyectos para mostrar",  fr: "Aucun projet à afficher pour l'instant", id: "Belum ada proyek untuk ditampilkan", it: "Nessun progetto da mostrare",        pt: "Nenhum projeto para mostrar ainda" },
  noPosts:            { ko: "아직 표시할 포스트가 없습니다",   en: "No posts to show yet",      ja: "表示する投稿がまだありません",          de: "Noch keine Beiträge vorhanden",    es: "Aún no hay publicaciones para mostrar", fr: "Aucune publication à afficher pour l'instant", id: "Belum ada postingan untuk ditampilkan", it: "Nessun post da mostrare",     pt: "Nenhuma publicação para mostrar ainda" },
  noUploadedProjects: { ko: "아직 업로드한 프로젝트가 없어요", en: "No uploaded projects yet",  ja: "アップロードしたプロジェクトがまだありません", de: "Noch keine hochgeladenen Projekte", es: "Aún no hay proyectos subidos",    fr: "Aucun projet importé pour l'instant", id: "Belum ada proyek yang diunggah",      it: "Nessun progetto caricato",           pt: "Nenhum projeto enviado ainda" },
  noRecentlyPlayed:   { ko: "최근 재생한 음원이 없습니다",   en: "No recently played songs",  ja: "最近再生した音源がありません",          de: "Keine kürzlich gespielten Songs",  es: "No hay canciones reproducidas recientemente", fr: "Aucun morceau écouté récemment", id: "Belum ada lagu yang baru diputar", it: "Nessun brano riprodotto di recente", pt: "Nenhuma música reproduzida recentemente" },
  noResults:          { ko: "아직은 해당 결과가 없어요..",   en: "No results yet..",          ja: "まだ該当する結果がありません..",        de: "Noch keine Ergebnisse..",          es: "Aún no hay resultados..",            fr: "Aucun résultat pour l'instant..",     id: "Belum ada hasil..",                    it: "Ancora nessun risultato..",          pt: "Ainda sem resultados.." },
};

export function ob(key, lang) {
  const code = (lang || "en").slice(0, 2);
  return STR[key]?.[code] ?? STR[key]?.en ?? "";
}
