"use client";

import { useState } from "react";
import { LOUIS_COPY } from "@/backend/louis";

type Step = 0 | 1 | 2 | 3;

/**
 * Cascading Oui/Non quiz for Louis. Answers stay in French on purpose.
 */
export function LouisLoginQuiz() {
  const [step, setStep] = useState<Step>(0);
  const [wrong, setWrong] = useState(false);

  function onOui(from: Step) {
    setWrong(false);
    if (from === 0) setStep(1);
    else if (from === 1) setStep(2);
    else setStep(3);
  }

  function onNon() {
    setWrong(true);
  }

  const choiceBtn =
    "min-w-[5.5rem] border px-4 py-2.5 font-display text-base transition-colors";

  return (
    <section
      aria-label="Quiz Louis"
      className="relative overflow-hidden border border-border bg-accent-soft/60 px-5 py-6"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
        Accès VIP · ESSEC
      </p>
      <p className="mt-2 max-w-[18rem] font-display text-lg leading-snug text-ink">
        Trois questions. Pas de triche.
      </p>

      <ol className="mt-6 space-y-5">
        <li className="louis-quiz-step">
          <p className="text-sm font-medium text-ink">{LOUIS_COPY.q1}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onOui(0)}
              className={`${choiceBtn} border-accent bg-accent text-canvas hover:bg-accent-strong`}
            >
              {LOUIS_COPY.oui}
            </button>
            <button
              type="button"
              onClick={onNon}
              className={`${choiceBtn} border-border bg-canvas text-ink-muted hover:border-ink-faint hover:text-ink`}
            >
              {LOUIS_COPY.non}
            </button>
          </div>
        </li>

        {step >= 1 && (
          <li className="louis-quiz-step">
            <p className="text-sm font-medium text-ink">{LOUIS_COPY.q2}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOui(1)}
                className={`${choiceBtn} border-accent bg-accent text-canvas hover:bg-accent-strong`}
              >
                {LOUIS_COPY.oui}
              </button>
              <button
                type="button"
                onClick={onNon}
                className={`${choiceBtn} border-border bg-canvas text-ink-muted hover:border-ink-faint hover:text-ink`}
              >
                {LOUIS_COPY.non}
              </button>
            </div>
          </li>
        )}

        {step >= 2 && (
          <li className="louis-quiz-step">
            <p className="text-sm font-medium text-ink">{LOUIS_COPY.q3}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOui(2)}
                className={`${choiceBtn} border-accent bg-accent text-canvas hover:bg-accent-strong`}
              >
                {LOUIS_COPY.oui}
              </button>
              <button
                type="button"
                onClick={() => onOui(2)}
                className={`${choiceBtn} border-accent bg-accent text-canvas hover:bg-accent-strong`}
              >
                {LOUIS_COPY.oui}
              </button>
            </div>
          </li>
        )}
      </ol>

      {wrong && step < 3 && (
        <p className="mt-4 font-mono text-xs text-accent" role="status">
          {LOUIS_COPY.wrong}
        </p>
      )}

      {step >= 3 && (
        <div
          className="louis-quiz-reveal mt-6 border border-dashed border-accent bg-canvas px-4 py-4"
          role="status"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            Indice final
          </p>
          <p className="mt-2 font-display text-xl leading-snug text-accent">
            {LOUIS_COPY.passwordHint}
          </p>
        </div>
      )}
    </section>
  );
}
