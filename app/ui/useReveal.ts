"use client";

import { useEffect } from "react";

/**
 * Scroll reveals: every element with [data-reveal] fades in through a
 * projector-gate wipe the first time it enters the screen. The hidden state
 * only exists once <html> has the `reveal-ready` class, so the server render
 * and no-JS visitors always see everything.
 */
export function useRevealAll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add("reveal-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    const observe = () =>
      document
        .querySelectorAll("[data-reveal]:not(.is-revealed)")
        .forEach((element) => observer.observe(element));
    observe();
    // Sections that mount later (tabs, modals) join automatically.
    const mutations = new MutationObserver(observe);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [active]);
}
