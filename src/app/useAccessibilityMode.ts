import { useEffect, useState } from "react";

const storageKey = "awaaz-accessible-review";
const changeEvent = "awaaz-accessibility-change";

function initialMode() {
  if (new URLSearchParams(window.location.search).get("access") === "1") return true;
  try {
    return localStorage.getItem(storageKey) === "on";
  } catch {
    return false;
  }
}

export function useAccessibilityMode() {
  const [enabled, setEnabled] = useState(initialMode);
  useEffect(() => {
    const receive = (event: Event) => setEnabled((event as CustomEvent<boolean>).detail);
    window.addEventListener(changeEvent, receive);
    return () => window.removeEventListener(changeEvent, receive);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.accessibleReview = enabled ? "on" : "off";
    try {
      localStorage.setItem(storageKey, enabled ? "on" : "off");
    } catch {
      // Preference storage is optional.
    }
  }, [enabled]);
  function setMode(value: boolean) {
    setEnabled(value);
    try {
      localStorage.setItem(storageKey, value ? "on" : "off");
    } catch {
      // The mode still works when preference storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent(changeEvent, { detail: value }));
  }
  return [enabled, setMode] as const;
}
