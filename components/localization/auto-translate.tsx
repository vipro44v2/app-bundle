"use client";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
// Language changes flow through React; never mutate text nodes owned by React.
export function LanguageBootstrap() {
  useEffect(() => {
    const update = (language: string) => {
      document.documentElement.lang = language;
      try {
        localStorage.setItem("bundle-language", language);
      } catch {}
    };
    i18n.on("languageChanged", update);
    try {
      const saved = localStorage.getItem("bundle-language");
      if (saved === "en" || saved === "vi") void i18n.changeLanguage(saved);
    } catch {
      /* Storage can be blocked in embedded browsers. */
    }
    document.documentElement.lang = i18n.resolvedLanguage ?? "en";
    return () => {
      i18n.off("languageChanged", update);
    };
  }, []);
  return null;
}
export default function LanguageSwitcher() {
  const { t, i18n: instance } = useTranslation();
  return (
    <label className="language-control">
      {t("Interface language")}
      <select
        aria-label={t("Interface language")}
        value={instance.resolvedLanguage ?? "en"}
        onChange={(event) => void instance.changeLanguage(event.target.value)}
      >
        <option value="en">English</option>
        <option value="vi">Tiếng Việt</option>
      </select>
    </label>
  );
}
