export function formatDate(isoString, t) {
  if (!isoString) return "";
  const dt = new Date(isoString);
  const diff = Date.now() - dt.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("time.justNow");
  if (min < 60) return t("time.minutesAgo", { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t("time.hoursAgo", { n: h });
  const d = Math.floor(h / 24);
  if (d === 1) return t("time.yesterday");
  if (d < 7) return t("time.daysAgo", { n: d });
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(dt);
}
