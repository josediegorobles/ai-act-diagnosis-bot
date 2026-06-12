import { ArrowLeft, ArrowRight, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  evaluateDiagnosis,
  getObligations,
  getQuestions,
  getVisibleQuestions,
  isComplete,
  type Answers,
  type Locale
} from "../lib/decisionTree";
import { hasTelemetryOptIn, setTelemetryOptIn } from "../lib/telemetry";

interface QuestionnaireAppProps {
  locale: Locale;
  resultPath: string;
}

const copy = {
  es: {
    eyebrow: "Diagnostico AI Act",
    progress: "Progreso",
    previous: "Anterior",
    next: "Siguiente",
    seeResults: "Ver resultado",
    reset: "Reiniciar",
    saved: "Guardado en este navegador",
    optIn: "Permitir telemetria anonima de finalizacion",
    optInHelp: "Solo clasificacion y numero de respuestas. Sin PII. No Google Analytics.",
    answered: "respondidas",
    of: "de",
    noPii: "No pedimos nombre, email ni datos personales.",
    required: "Selecciona una opcion para continuar."
  },
  en: {
    eyebrow: "AI Act diagnosis",
    progress: "Progress",
    previous: "Back",
    next: "Next",
    seeResults: "See result",
    reset: "Reset",
    saved: "Saved in this browser",
    optIn: "Allow anonymous completion telemetry",
    optInHelp: "Only classification and answer count. No PII. No Google Analytics.",
    answered: "answered",
    of: "of",
    noPii: "We do not ask for name, email or personal data.",
    required: "Select an option to continue."
  }
} satisfies Record<Locale, Record<string, string>>;

export default function QuestionnaireApp({ locale, resultPath }: QuestionnaireAppProps) {
  const questions = useMemo(() => getQuestions(locale), [locale]);
  const obligations = useMemo(() => getObligations(locale), [locale]);
  const storageKey = `aiActDiagnosis:${locale}`;
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [showRequired, setShowRequired] = useState(false);
  const [telemetry, setTelemetry] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      setAnswers(JSON.parse(raw) as Answers);
    }
    setTelemetry(hasTelemetryOptIn());
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, storageKey]);

  const visibleQuestions = getVisibleQuestions(questions, answers);
  const currentIndex = Math.min(index, Math.max(visibleQuestions.length - 1, 0));
  const current = visibleQuestions[currentIndex];
  const answeredVisible = visibleQuestions.filter((question) => answers[question.id] !== undefined).length;
  const complete = isComplete(questions, answers);
  const progress = visibleQuestions.length === 0 ? 0 : Math.round((answeredVisible / visibleQuestions.length) * 100);

  function answer(questionId: string, value: string) {
    setShowRequired(false);
    setAnswers((previous) => {
      const next = { ...previous, [questionId]: value };
      const nextVisible = getVisibleQuestions(questions, next);
      const visibleIds = new Set(nextVisible.map((question) => question.id));
      return Object.fromEntries(Object.entries(next).filter(([key]) => visibleIds.has(key)));
    });
  }

  function goNext() {
    if (!current || answers[current.id] === undefined) {
      setShowRequired(true);
      return;
    }

    const nextAnswers = answers;
    const nextVisible = getVisibleQuestions(questions, nextAnswers);
    if (currentIndex >= nextVisible.length - 1 && isComplete(questions, nextAnswers)) {
      const result = evaluateDiagnosis(nextAnswers, questions, obligations, locale);
      window.localStorage.setItem(`aiActDiagnosisResult:${locale}`, JSON.stringify({ answers: nextAnswers, result }));
      window.location.href = resultPath;
      return;
    }

    setIndex((previous) => Math.min(previous + 1, nextVisible.length - 1));
  }

  function goBack() {
    setShowRequired(false);
    setIndex((previous) => Math.max(previous - 1, 0));
  }

  function reset() {
    setAnswers({});
    setIndex(0);
    setShowRequired(false);
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(`aiActDiagnosisResult:${locale}`);
  }

  function updateTelemetry(enabled: boolean) {
    setTelemetry(enabled);
    setTelemetryOptIn(enabled);
  }

  if (!current) {
    return null;
  }

  return (
    <section className="jr-container py-10 md:py-14">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)]">
        <div className="jr-panel p-5 md:p-8">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal">{copy[locale].eyebrow}</p>
              <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">{current.title}</h1>
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-signal"
            >
              <RotateCcw size={16} aria-hidden="true" />
              {copy[locale].reset}
            </button>
          </div>

          <p className="mb-6 max-w-3xl text-base leading-7 text-slate-700">{current.help}</p>

          <div className="grid gap-3">
            {current.options.map((option) => {
              const selected = answers[current.id] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => answer(current.id, option.value)}
                  className={`min-h-14 rounded-md border px-4 py-3 text-left text-sm font-semibold transition ${
                    selected
                      ? "border-signal bg-teal-50 text-signal"
                      : "border-line bg-white text-ink hover:border-signal hover:bg-teal-50/50"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {showRequired ? <p className="mt-4 text-sm font-semibold text-clay">{copy[locale].required}</p> : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={currentIndex === 0}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-signal disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              {copy[locale].previous}
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-signal px-4 text-sm font-semibold text-white transition hover:bg-ink"
            >
              {complete && currentIndex === visibleQuestions.length - 1 ? copy[locale].seeResults : copy[locale].next}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <aside className="jr-panel h-fit p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-signal">
            <ShieldCheck size={18} aria-hidden="true" />
            {copy[locale].saved}
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-signal transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-slate-700">
            {answeredVisible} {copy[locale].of} {visibleQuestions.length} {copy[locale].answered}
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-600">{copy[locale].noPii}</p>
          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={telemetry}
              onChange={(event) => updateTelemetry(event.currentTarget.checked)}
              className="mt-1 h-4 w-4 rounded border-line text-signal"
            />
            <span>
              <span className="block font-semibold text-ink">{copy[locale].optIn}</span>
              <span className="block leading-5 text-slate-600">{copy[locale].optInHelp}</span>
            </span>
          </label>
        </aside>
      </div>
    </section>
  );
}
