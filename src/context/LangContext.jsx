import { createContext, useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { formatDate as formatDateFn } from "../utils/formatDate";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language?.slice(0, 2) ?? "en");
  const [, setTick] = useState(0);

  useEffect(() => {
    const onLangChange = (lng) => setLang(lng.slice(0, 2));
    i18n.on("languageChanged", onLangChange);
    return () => i18n.off("languageChanged", onLangChange);
  }, [i18n]);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (isoString) => formatDateFn(isoString, lang);

  return (
    <LangContext.Provider value={{ lang, formatDate }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
