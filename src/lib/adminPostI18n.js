// 관리자(공식 안내글) 게시물 다국어 처리
// DB에 저장된 관리자 글은 한국어 원문이 고정이라, 한국어 원문 → 언어별 번역을 매핑해
// 현재 언어로 치환한다. 매핑이 없으면 원문(한국어)을 그대로 반환한다.

export const ADMIN_ID = "a44420e9-826b-4b55-ae14-63950e111495";

// 한국어 제목 원문 → { en, ja, de, es, fr, id, it, pt }
const TITLE_MAP = {
  "Vocal 포지션 페이지의 포스트 카드 입니다.": {
    en: "This is the post board for the Vocal position.",
    ja: "Vocalポジションの投稿ボードです。",
    de: "Dies ist das Beitragsboard für die Vocal-Position.",
    es: "Este es el tablón de publicaciones para la posición de Vocal.",
    fr: "Ceci est le tableau des publications pour le poste de Vocal.",
    id: "Ini adalah papan postingan untuk posisi Vocal.",
    it: "Questa è la bacheca dei post per la posizione Vocal.",
    pt: "Este é o quadro de publicações para a posição de Vocal.",
  },
  "Rappper 포지션 페이지 입니다.": {
    en: "This is the Rapper position page.", ja: "Rapperポジションのページです。", de: "Dies ist die Rapper-Positionsseite.", es: "Esta es la página de la posición de Rapper.", fr: "Ceci est la page du poste de Rapper.", id: "Ini adalah halaman posisi Rapper.", it: "Questa è la pagina della posizione Rapper.", pt: "Esta é a página da posição de Rapper.",
  },
  "Rapper 포지션 페이지 입니다.": {
    en: "This is the Rapper position page.", ja: "Rapperポジションのページです。", de: "Dies ist die Rapper-Positionsseite.", es: "Esta es la página de la posición de Rapper.", fr: "Ceci est la page du poste de Rapper.", id: "Ini adalah halaman posisi Rapper.", it: "Questa è la pagina della posizione Rapper.", pt: "Esta é a página da posição de Rapper.",
  },
  "프로듀서 포지션 페이지 입니다.": {
    en: "This is the Producer position page.", ja: "Producerポジションのページです。", de: "Dies ist die Producer-Positionsseite.", es: "Esta es la página de la posición de Producer.", fr: "Ceci est la page du poste de Producer.", id: "Ini adalah halaman posisi Producer.", it: "Questa è la pagina della posizione Producer.", pt: "Esta é a página da posição de Producer.",
  },
  "엔지니어 포지션 페이지 입니다.": {
    en: "This is the Engineer position page.", ja: "Engineerポジションのページです。", de: "Dies ist die Engineer-Positionsseite.", es: "Esta es la página de la posición de Engineer.", fr: "Ceci est la page du poste d'Engineer.", id: "Ini adalah halaman posisi Engineer.", it: "Questa è la pagina della posizione Engineer.", pt: "Esta é a página da posição de Engineer.",
  },
  "뮤직 크리에이터 포지션 페이지 입니다.": {
    en: "This is the Music Creator position page.", ja: "Music Creatorポジションのページです。", de: "Dies ist die Music-Creator-Positionsseite.", es: "Esta es la página de la posición de Music Creator.", fr: "Ceci est la page du poste de Music Creator.", id: "Ini adalah halaman posisi Music Creator.", it: "Questa è la pagina della posizione Music Creator.", pt: "Esta é a página da posição de Music Creator.",
  },
};

// 한국어 본문 원문 → { en, ja, ... }
const BODY_MAP = {
  "이곳에서는 해당 포지션을 구하는 게시글을 업로드 할 수 있으며 이미지 , 음원 , 링크 첨부가 가능합니다.  댓글 기능을 자유롭게 사용하시어 필요한 포지션을 찾고 최고의 작업물을 만드시길 바랍니다.": {
    en: "Here you can upload posts seeking this position, with images, audio, and links attached. Feel free to use the comments to find the position you need and create your best work.",
    ja: "ここではこのポジションを募集する投稿をアップロードでき、画像・音源・リンクの添付が可能です。コメント機能を自由に活用して、必要なポジションを見つけ、最高の作品を作ってください。",
    de: "Hier kannst du Beiträge hochladen, in denen du diese Position suchst – mit Bildern, Audio und Links. Nutze die Kommentarfunktion frei, um die gesuchte Position zu finden und großartige Werke zu schaffen.",
    es: "Aquí puedes subir publicaciones buscando esta posición, adjuntando imágenes, audio y enlaces. Usa los comentarios libremente para encontrar la posición que necesitas y crear tu mejor trabajo.",
    fr: "Ici, vous pouvez publier des annonces pour ce poste, avec images, audio et liens en pièce jointe. Utilisez librement les commentaires pour trouver le poste dont vous avez besoin et créer vos meilleures œuvres.",
    id: "Di sini kamu bisa mengunggah postingan yang mencari posisi ini, dengan lampiran gambar, audio, dan tautan. Gunakan fitur komentar dengan bebas untuk menemukan posisi yang kamu butuhkan dan menciptakan karya terbaik.",
    it: "Qui puoi pubblicare annunci per questa posizione, allegando immagini, audio e link. Usa liberamente i commenti per trovare la posizione che ti serve e creare le tue opere migliori.",
    pt: "Aqui você pode publicar anúncios procurando por esta posição, com imagens, áudio e links anexados. Use os comentários livremente para encontrar a posição que precisa e criar seu melhor trabalho.",
  },
  "비트 메이커 , 송 라이터 와 같은 포지션들을 뮤직 크리에이터 라고 표현 하게 되었습니다.  이곳에서는 해당 포지션을 구하는 게시글을 업로드 할 수 있으며 이미지 , 음원 , 링크 첨부가 가능합니다.  댓글 기능을 자유롭게 사용하시어 필요한 포지션을 찾고 최고의 작업물을 만드시길 바랍니다.": {
    en: "Positions such as beat maker and songwriter are now referred to as Music Creator. Here you can upload posts seeking this position, with images, audio, and links attached. Feel free to use the comments to find the position you need and create your best work.",
    ja: "ビートメーカーやソングライターのようなポジションを「Music Creator」と表現することにしました。ここではこのポジションを募集する投稿をアップロードでき、画像・音源・リンクの添付が可能です。コメント機能を自由に活用して、必要なポジションを見つけ、最高の作品を作ってください。",
    de: "Positionen wie Beatmaker und Songwriter werden nun als Music Creator bezeichnet. Hier kannst du Beiträge hochladen, in denen du diese Position suchst – mit Bildern, Audio und Links. Nutze die Kommentarfunktion frei, um die gesuchte Position zu finden und großartige Werke zu schaffen.",
    es: "Posiciones como beat maker y compositor ahora se denominan Music Creator. Aquí puedes subir publicaciones buscando esta posición, adjuntando imágenes, audio y enlaces. Usa los comentarios libremente para encontrar la posición que necesitas y crear tu mejor trabajo.",
    fr: "Des postes tels que beatmaker et auteur-compositeur sont désormais appelés Music Creator. Ici, vous pouvez publier des annonces pour ce poste, avec images, audio et liens en pièce jointe. Utilisez librement les commentaires pour trouver le poste dont vous avez besoin et créer vos meilleures œuvres.",
    id: "Posisi seperti beat maker dan penulis lagu kini disebut sebagai Music Creator. Di sini kamu bisa mengunggah postingan yang mencari posisi ini, dengan lampiran gambar, audio, dan tautan. Gunakan fitur komentar dengan bebas untuk menemukan posisi yang kamu butuhkan dan menciptakan karya terbaik.",
    it: "Posizioni come beat maker e paroliere sono ora indicate come Music Creator. Qui puoi pubblicare annunci per questa posizione, allegando immagini, audio e link. Usa liberamente i commenti per trovare la posizione che ti serve e creare le tue opere migliori.",
    pt: "Posições como beat maker e compositor agora são chamadas de Music Creator. Aqui você pode publicar anúncios procurando por esta posição, com imagens, áudio e links anexados. Use os comentários livremente para encontrar a posição que precisa e criar seu melhor trabalho.",
  },
};

// 공백을 모두 제거해 비교 (띄어쓰기/줄바꿈 차이 무시)
const norm = (s) => (s ?? "").replace(/\s+/g, "");
const NORM_MAP = {};
[TITLE_MAP, BODY_MAP].forEach(m => {
  for (const k in m) NORM_MAP[norm(k)] = m[k];
});

// 제목/본문 구분 없이, 정규화된 텍스트가 맵과 일치하면 번역
function lookup(text, lang) {
  if (!text) return text;
  if (!lang || lang.startsWith("ko")) return text;
  const code = lang.slice(0, 2);
  const entry = NORM_MAP[norm(text)];
  return entry?.[code] ?? text;
}

export function isAdminPost(post) {
  if (!post) return false;
  return (post.author_id ?? post.authorId) === ADMIN_ID;
}

// 텍스트가 안내글 맵과 일치하면 현재 언어로 치환(작성자 무관 — 맵엔 관리자 안내글만 존재).
// 일반 글은 텍스트가 맵에 없어 원문 그대로 반환.
export function translateAdminTitle(post, lang) {
  return lookup(post?.title ?? "", lang);
}

export function translateAdminBody(post, lang) {
  return lookup(post?.text ?? post?.description ?? "", lang);
}

// 문자열 단위 번역 (공유 링크 제목 등) — 맵에 있으면 번역, 없으면 원문
export function translateAdminText(text, lang) {
  return lookup(text, lang);
}
