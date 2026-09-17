"use client";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
export default function Text({
  text,
  values,
}: {
  text: string;
  values?: Record<string, string | number>;
}) {
  const { t } = useTranslation();
  return <>{t(text, { defaultValue: text, ...values })}</>;
}
