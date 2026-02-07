"use client";

import { useState, useEffect } from "react";

const CONSENT_KEY = "odds-compare-consent";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setShow(false);
  };

  const dismiss = () => {
    localStorage.setItem(CONSENT_KEY, "dismissed");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-900 px-4 py-3 md:px-8"
      role="banner"
      aria-label="Cookie consent"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-400">
          We use anonymous analytics to improve the site. By continuing you
          accept our use of cookies.
        </p>
        <div className="flex gap-2">
          <button
            onClick={dismiss}
            className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={accept}
            className="rounded bg-emerald-800/50 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-800/70 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
