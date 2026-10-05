import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  LayoutDashboard,
  ScanLine,
  BookOpen,
  Code2,
  ArrowUpRight,
  AudioLines,
  ShieldCheck,
  Languages,
  Ear,
} from "lucide-react";
import { motion, MotionConfig } from "framer-motion";
import { App } from "../App";
import { Dashboard } from "./Dashboard";
import { InfoPage } from "./InfoPages";
import type { Locale } from "../../core/types";
import type { SessionOverview } from "./session";
import { deskTransition, useDeskMotion } from "./motion";
import { useAccessibilityMode } from "../useAccessibilityMode";
import "./theme.css";
import "./retro.css";
import "../accessibility.css";

const routes = {
  "/": "dashboard",
  "/review": "review",
  "/guide": "guide",
  "/developers": "developers",
} as const;
function routeFor(
  path: string,
): "dashboard" | "review" | "guide" | "developers" | "notfound" {
  return Object.hasOwn(routes, path)
    ? routes[path as keyof typeof routes]
    : "notfound";
}
export function Site() {
  const [accessible, setAccessible] = useAccessibilityMode();
  const [fileFirst] = useState(
    () => new URLSearchParams(window.location.search).get("flow") !== "intent",
  );
  const { reduced, interact } = useDeskMotion();
  const [location, setLocation] = useState(
    () => window.location.pathname + window.location.search,
  );
  const route = routeFor(location.split("?")[0]);
  const [opened, setOpened] = useState(route === "review");
  const [demoRequest, setDemoRequest] = useState(() =>
    new URLSearchParams(window.location.search).get("demo") === "1" ? 1 : 0,
  );
  const [locale, setLocale] = useState<Locale>("en-IN");
  const [overview, setOverview] = useState<SessionOverview>({
    hasIntent: false,
    hasTransaction: false,
  });
  const content = useRef<HTMLDivElement>(null);
  const hi = locale === "hi-IN",
    t = (en: string, hin: string) => (hi ? hin : en);
  useEffect(() => {
    const pop = () => {
      setLocation(window.location.pathname + window.location.search);
      if (window.location.pathname === "/review") setOpened(true);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    document.title =
      {
        dashboard: "Overview",
        review: "Payment review",
        guide: "How it works",
        developers: "For builders",
        notfound: "Page not found",
      }[route] + " · Awaaz";
    if (route !== "review") document.documentElement.lang = hi ? "hi" : "en";
    content.current
      ?.querySelector<HTMLHeadingElement>("h1")
      ?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [route, hi]);
  function navigate(e: MouseEvent) {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    )
      return;
    const link = (e.target as Element).closest("a");
    const href = link?.getAttribute("href");
    if (
      !href?.startsWith("/") ||
      href.startsWith("//") ||
      link?.target === "_blank" ||
      link?.hasAttribute("download")
    )
      return;
    e.preventDefault();
    const url = new URL(href, window.location.origin);
    if (url.pathname === "/review") {
      setOpened(true);
      if (url.searchParams.get("demo") === "1") setDemoRequest((n) => n + 1);
    }
    const next = url.pathname + url.search;
    if (next !== location) window.history.pushState({}, "", next);
    setLocation(next);
  }
  const nav = [
    {
      path: "/",
      id: "dashboard",
      label: t("Overview", "एक नज़र"),
      icon: LayoutDashboard,
    },
    {
      path: "/review",
      id: "review",
      label: t("Review desk", "भुगतान जाँच"),
      icon: ScanLine,
    },
    {
      path: "/guide",
      id: "guide",
      label: t("How it works", "यह कैसे काम करता है"),
      icon: BookOpen,
    },
    {
      path: "/developers",
      id: "developers",
      label: t("For builders", "डेवलपर्स के लिए"),
      icon: Code2,
    },
  ];
  return (
    <MotionConfig reducedMotion={accessible ? "always" : "user"} transition={deskTransition}>
      <div className="awaaz-site" onClick={navigate}>
        <a
          className="site-skip"
          href={route === "review" ? "#workspace" : "#site-main"}
        >
          {t("Skip to content", "मुख्य जानकारी पर जाएँ")}
        </a>
        <a className="accessible-entry" href="/review?access=1" onClick={() => setAccessible(true)}>
          <Ear size={22} aria-hidden="true" />
          {t("Start accessible review · for low vision and screen readers", "सुलभ जाँच शुरू करें · कम दृष्टि और स्क्रीन रीडर के लिए")}
        </a>
        <aside className="site-sidebar">
          <a className="site-wordmark" href="/" aria-label="Awaaz overview">
            <AudioLines aria-hidden="true" size={32} />
            <span>
              awaaz<small lang="hi">आवाज़</small>
            </span>
          </a>
          <p className="sidebar-caption">
            {t("UNDERSTAND BEFORE YOU SIGN", "साइन से पहले समझें")}
          </p>
          <nav aria-label="Main navigation">
            {nav.map((n) => (
              <motion.a
                key={n.path}
                {...interact}
                whileHover={reduced ? undefined : { x: 3 }}
                href={n.path}
                aria-current={route === n.id ? "page" : undefined}
              >
                <n.icon size={19} aria-hidden="true" />
                <span>{n.label}</span>
                <ArrowUpRight
                  className="nav-arrow"
                  size={14}
                  aria-hidden="true"
                />
              </motion.a>
            ))}
          </nav>
          <div className="sidebar-note">
            <span lang="hi">
              पहले समझो।
              <br />
              फिर फैसला करो।
            </span>
            <p>
              {t(
                "Your wallet holds the keys. You hold the decision.",
                "कुंजी आपके वॉलेट में। निर्णय आपके हाथ में।",
              )}
            </p>
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <div className="sidebar-bottom">
            <span className="connection-dot" />
            {t("Testnet prototype", "टेस्टनेट प्रोटोटाइप")}
            <small>
              v0.3 · {t("No account needed", "खाते की ज़रूरत नहीं")}
            </small>
          </div>
        </aside>
        <div className="site-body">
          <motion.header
            className="site-topbar"
            initial={{ y: reduced ? 0 : -6 }}
            animate={{ y: 0 }}
          >
            <div>
              <span className="topbar-label">AWAAZ /</span>
              <span>
                {nav.find((n) => n.id === route)?.label ??
                  t("Not found", "पेज नहीं मिला")}
              </span>
            </div>
            <div className="topbar-right">
              <button className="accessibility-toggle" type="button" aria-pressed={accessible} onClick={() => setAccessible(!accessible)}>
                <Ear size={22} aria-hidden="true" />
                {t("Accessible mode", "सुलभ मोड")}
                <span>{accessible ? t("On", "चालू") : t("Off", "बंद")}</span>
              </button>
              <span className="privacy-label">
                <ShieldCheck size={15} aria-hidden="true" />
                {t("Session only", "केवल इस सत्र में")}
              </span>
              {route !== "review" && (
                <label className="site-language">
                  <Languages size={16} aria-hidden="true" />
                  <span className="sr-only">Site language</span>
                  <select
                    aria-label="Site language"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as Locale)}
                  >
                    <option value="en-IN">English</option>
                    <option value="hi-IN">हिंदी</option>
                  </select>
                </label>
              )}
            </div>
          </motion.header>
          <div className="site-content" ref={content}>
            {route === "dashboard" && (
              <Dashboard overview={overview} locale={locale} />
            )}
            {(route === "guide" || route === "developers") && (
              <InfoPage kind={route} locale={locale} />
            )}
            {route === "notfound" && (
              <main id="site-main" className="site-info" tabIndex={-1}>
                <span className="section-kicker">404 / AWAAZ</span>
                <h1 tabIndex={-1}>
                  {t("Page not found.", "यह पेज नहीं मिला।")}
                </h1>
                <p>
                  {t(
                    "The review desk is still here. Return to your overview to continue.",
                    "भुगतान जाँच अभी उपलब्ध है। आगे बढ़ने के लिए एक नज़र पेज पर जाएँ।",
                  )}
                </p>
                <a className="site-action" href="/">
                  {t("Back to overview", "एक नज़र पर वापस जाएँ")}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              </main>
            )}
            {opened && (
              <motion.div
                className="site-review"
                hidden={route !== "review"}
                initial={{ y: reduced ? 0 : 8 }}
                animate={{ y: 0 }}
              >
                <App
                  embedded
                  fileFirst={fileFirst}
                  active={route === "review"}
                  demoRequest={demoRequest}
                  onSession={setOverview}
                  onLocaleChange={setLocale}
                />
              </motion.div>
            )}
          </div>
          <footer className="site-bottom">
            <span>
              {t(
                "A little clarity. A decision that’s yours.",
                "थोड़ी स्पष्टता। निर्णय आपका।",
              )}
            </span>
            <a href="/guide">
              {t("Know the limits", "सीमाएँ समझें")}
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <span>TESTNET · {t("NO SIGNING", "बिना साइन")}</span>
          </footer>
        </div>
      </div>
    </MotionConfig>
  );
}
