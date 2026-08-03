"use client";

import { useEffect } from "react";
import anime from "animejs";
import { EASE_SETTLE, MOTION } from "./easing";
import { prefersReducedMotion } from "./prefers-reduced";

const INTERACTIVE_SELECTOR = [
  "button:not([data-no-squash])",
  "a.button-press",
  "[role='button']:not([data-no-squash])",
  "input[type='submit']",
  "input[type='button']",
  "[data-squash]",
].join(", ");

function enhanceUnderlines(root: ParentNode) {
  const reduced = prefersReducedMotion();
  const links = root.querySelectorAll<HTMLElement>("a.link-underline");
  links.forEach((link) => {
    if (link.dataset.underlineReady) return;
    link.dataset.underlineReady = "1";

    if (reduced) return;

    link.classList.add("link-underline-animated");
    link.style.setProperty("--underline-scale", "0");

    const state = { scale: 0 };

    const onEnter = () => {
      anime.remove(state);
      anime({
        targets: state,
        scale: 1,
        duration: 320,
        easing: EASE_SETTLE,
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
  function resolveTarget(event: Event): HTMLElement | null {
    const target = (event.target as HTMLElement | null)?.closest(
      INTERACTIVE_SELECTOR,
    );
    if (!(target instanceof HTMLElement)) return null;
    if (target.dataset.noSquash === "1") return null;
    if (target.hasAttribute("disabled") || target.getAttribute("aria-disabled") === "true") {
      return null;
    }
    return target;
  }

  function onDown(event: PointerEvent) {
    if (prefersReducedMotion()) return;
    const target = resolveTarget(event);
    if (!target) return;
    anime.remove(target);
    anime({
      targets: target,
      scale: MOTION.squash.downScale,
      duration: MOTION.squash.downDuration,
      easing: MOTION.squash.downEasing,
    });
  }
  function onUp(event: PointerEvent) {
    if (prefersReducedMotion()) return;
    const target = resolveTarget(event);
    if (!target) return;
    anime.remove(target);
    anime({
      targets: target,
      scale: 1,
      duration: MOTION.squash.upDuration,
      easing: MOTION.squash.upEasing,
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

/** Global polish: underline draw, interactive squash/spring. */
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

  return null;
}
