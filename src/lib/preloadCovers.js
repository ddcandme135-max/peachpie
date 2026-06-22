// 커버 이미지 미리 로드(캐시 워밍) → 렌더 시 즉시 표시
export function preloadCovers(items, key = "cover_url") {
  (items ?? []).forEach(it => {
    const url = it?.[key];
    if (url) { const img = new Image(); img.src = url; }
  });
}
