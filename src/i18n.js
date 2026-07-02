import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ko from "./locales/ko/translation.json";
import en from "./locales/en/translation.json";
import ja from "./locales/ja/translation.json";
import fr from "./locales/fr/translation.json";
import it from "./locales/it/translation.json";
import id from "./locales/id/translation.json";
import es from "./locales/es/translation.json";
import pt from "./locales/pt/translation.json";
import de from "./locales/de/translation.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
      ja: { translation: ja },
      fr: { translation: fr },
      it: { translation: it },
      id: { translation: id },
      es: { translation: es },
      pt: { translation: pt },
      de: { translation: de },
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    // 사용자가 고른 언어(전용 키) 우선, 없으면 브라우저 언어를 따름. (기존 i18nextLng stale 값 무시)
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"], lookupLocalStorage: "peachpie_lang" },
    react: {
      bindI18n: "languageChanged loaded",
      bindI18nStore: "added removed",
      useSuspense: false,
    },
  });

export default i18n;
