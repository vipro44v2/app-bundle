"use client";

import { Languages } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n, { type Language } from "@/lib/i18n";

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = ["placeholder", "title", "aria-label"];

function translateValue(value: string, language: Language) {
  if (language === "en") return value;
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const content = value.trim();
  if (!content) return value;

  const direct = i18n.t(content, { lng: language, defaultValue: content });
  if (direct !== content) return `${leading}${direct}${trailing}`;

  const welcome = content.match(/^Welcome back, (.+)$/);
  if (welcome)
    return `${leading}${i18n.t("Welcome back, {{name}}", { lng: language, name: welcome[1] })}${trailing}`;
  const orders = content.match(/^(\d+) orders$/);
  if (orders)
    return `${leading}${i18n.t("{{count}} orders", { lng: language, count: Number(orders[1]) })}${trailing}`;
  const products = content.match(/^(\d+) products$/);
  if (products)
    return `${leading}${i18n.t("{{count}} products", { lng: language, count: Number(products[1]) })}${trailing}`;
  const activeBundles = content.match(/^(\d+) active bundles$/);
  if (activeBundles)
    return `${leading}${i18n.t("{{count}} active bundles", { lng: language, count: Number(activeBundles[1]) })}${trailing}`;
  const remaining = content.match(/^(\d+) days remaining$/);
  if (remaining)
    return `${leading}${i18n.t("{{count}} days remaining", { lng: language, count: Number(remaining[1]) })}${trailing}`;
  const showing = content.match(/^Showing (\d+)[–-](\d+) of (\d+) bundles$/);
  if (showing)
    return `${leading}${i18n.t("Showing {{from}}–{{to}} of {{count}} bundles", { lng: language, from: showing[1], to: showing[2], count: Number(showing[3]) })}${trailing}`;
  const step = content.match(/^STEP (\d+) OF (\d+)$/);
  if (step)
    return `${leading}${i18n.t("STEP {{current}} OF {{total}}", { lng: language, current: step[1], total: step[2] })}${trailing}`;
  return value;
}

function translateTree(root: Node, language: Language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  if (root.nodeType === Node.TEXT_NODE) nodes.unshift(root as Text);

  nodes.forEach((node) => {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "CODE"].includes(parent.tagName)) return;
    if (!originalText.has(node)) originalText.set(node, node.data);
    const source = originalText.get(node) ?? node.data;
    const next = translateValue(source, language);
    if (node.data !== next) node.data = next;
  });

  const elements =
    root instanceof Element ? [root, ...root.querySelectorAll("*")] : [];
  elements.forEach((element) => {
    let originals = originalAttributes.get(element);
    if (!originals) {
      originals = new Map();
      originalAttributes.set(element, originals);
    }
    translatedAttributes.forEach((attribute) => {
      const current = element.getAttribute(attribute);
      if (current === null) return;
      if (!originals.has(attribute)) originals.set(attribute, current);
      const source = originals.get(attribute) ?? current;
      const next = translateValue(source, language);
      if (current !== next) element.setAttribute(attribute, next);
    });
  });
}

export default function AutoTranslate() {
  const { t } = useTranslation();
  const language = (i18n.resolvedLanguage ?? "en") as Language;

  useEffect(() => {
    const saved = window.localStorage.getItem("bundle-language");
    const initial: Language =
      saved === "en" || saved === "vi"
        ? saved
        : navigator.language.toLowerCase().startsWith("vi")
          ? "vi"
          : "en";
    void i18n.changeLanguage(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("bundle-language", language);
    translateTree(document.body, language);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) =>
        mutation.addedNodes.forEach((node) => translateTree(node, language)),
      );
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  const nextLanguage: Language = language === "en" ? "vi" : "en";
  const label =
    language === "en"
      ? t("Translate to Vietnamese")
      : t("Switch to English");

  return (
    <button
      type="button"
      className="language-switcher"
      onClick={() => void i18n.changeLanguage(nextLanguage)}
      aria-label={label}
      title={label}
    >
      <Languages size={16} />
      <span>{nextLanguage.toUpperCase()}</span>
    </button>
  );
}
