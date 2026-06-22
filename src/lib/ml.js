import i18n from "../i18n";

// 다국어 인라인 문자열용 헬퍼: ml("k001") → 현재 언어의 번역 반환
// 보간 지원: ml("followedHandle", { handle }) 등
export function ml(key, opts) {
  return i18n.t(`ml.${key}`, opts);
}

// 상대 시간 표시 헬퍼 (time.* 키 재사용, 모든 언어 번역 완료)
export function timeAgo(isoString) {
  if (!isoString) return "";
  const dt = new Date(isoString);
  const diff = Date.now() - dt.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return i18n.t("time.justNow");
  if (min < 60) return i18n.t("time.minutesAgo", { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return i18n.t("time.hoursAgo", { n: h });
  const d = Math.floor(h / 24);
  if (d === 1) return i18n.t("time.yesterday");
  if (d < 7) return i18n.t("time.daysAgo", { n: d });
  const lng = (i18n.language || "en").slice(0, 2);
  return new Intl.DateTimeFormat(lng, { month: "long", day: "numeric" }).format(dt);
}
