"use client";

import { useEffect } from "react";
import anime from "animejs";
import { prefersReducedMotion } from "./prefers-reduced";
import { VelocityScrollbar } from "./velocity-scrollbar";

function enhanceUnderlines(root: ParentNode) {
  const reduced = prefersReducedMotion();
  const links = root.querySelectorAll<HTMLElement>("a.link-underline");
  links.forEach((link) => {
    if (link.dataset.underlineReady) return;
    link.dataset.underlineReady = "1";

    if (reduced) {
      // Keep a static full underline — no draw animation
      return;
    }

    link.classList.add("link-underline-animated");
    link.style.setProperty("--underline-scale", "0");

    const state = { scale: 0 };

    const onEnter = () => {
      anime.remove(state);
      anime({
        targets: state,
        scale: 1,
        duration: 320,
        easing: "easeOutCubic",
        update() {
          link.style.setProperty("--underline-scale", String(state.scale));
        },
      });
    };
    const onLeave = () => {
      anime.remove(state);
      anime({
        targets: state,
        scale: 0,
        duration: 260,
        easing: "easeInCubic",
        update() {
          link.style.setProperty("--underline-scale", String(state.scale));
        },
      });
    };
    link.addEventListener("mouseenter", onEnter);
    link.addEventListener("mouseleave", onLeave);
    link.addEventListener("focus", onEnter);
    link.addEventListener("blur", onLeave);
  });
}

function wireButtonSquash() {
  function onDown(event: PointerEvent) {
    if (prefersReducedMotion()) return;
    const target = (event.target as HTMLElement | null)?.closest(
      "button, a.button-press",
    );
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.noSquash === "1") return;
    anime.remove(target);
    anime({
      targets: target,
      scale: 0.97,
      duration: 90,
      easing: "easeOutQuad",
    });
  }
  function onUp(event: PointerEvent) {
    if (prefersReducedMotion()) return;
    const target = (event.target as HTMLElement | null)?.closest(
      "button, a.button-press",
    );
    if (!(target instanceof HTMLElement)) return;
    anime.remove(target);
    anime({
      targets: target,
      scale: 1,
      duration: 280,
      easing: "easeOutElastic(1, 0.6)",
    });
  }
  document.addEventListener("pointerdown", onDown);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
  return () => {
    document.removeEventListener("pointerdown", onDown);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
  };
}

/** Global polish: custom scrollbar, underline draw, button squash. */
export function SiteMotion() {
  useEffect(() => {
    enhanceUnderlines(document);
    const observer = new MutationObserver(() => enhanceUnderlines(document));
    observer.observe(document.body, { childList: true, subtree: true });
    const unbindSquash = wireButtonSquash();

    return () => {
      observer.disconnect();
      unbindSquash();
    };
  }, []);

  return <VelocityScrollbar />;
}
