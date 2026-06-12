import { CalendarCheck, FileText, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  evaluateDiagnosis,
  getObligations,
  getQuestions,
  type Answers,
  type DiagnosisResult,
  type Locale
} from "../lib/decisionTree";
import { trackCompletion } from "../lib/telemetry";
import PdfExport from "./PdfExport";

interface ResultsAppProps {
  locale: Locale;
  questionnairePath: string;
  calendlyUrl: string;
}

const copy = {
  es: {
    eyebrow: "Resultado orientativo",
    cta: "Reserva un diagnostico tecnico completo (1.500€) con Jose Robles",
    ctaSecondary: "Abrir Calendly",
    obligations: "Obligaciones aplicables",
    annex: "Senales de Anexo detectadas",
    flags: "Notas de revision",
    noAnnex: "No se detecto una categoria concreta de Anexo III en tus respuestas.",
    restart: "Rehacer cuestionario",
    emptyTitle: "Aun no hay respuestas guardadas",
    emptyBody: "Completa el cuestionario para generar tu clasificacion y el PDF.",
    disclaimer:
      "Esta herramienta provee una clasificación orientativa basada en el Reglamento (UE) 2024/1689 (AI Act). No constituye asesoramiento legal. Verifica con abogado especializado antes de tomar decisiones de cumplimiento."
  },
  en: {
    eyebrow: "Orientative result",
    cta: "Book a complete technical diagnosis (€1,500) with Jose Robles",
    ctaSecondary: "Open Calendly",
    obligations: "Applicable obligations",
    annex: "Detected Annex signals",
    flags: "Review notes",
    noAnnex: "No specific Annex III category was detected in your answers.",
    restart: "Retake questionnaire",
    emptyTitle: "No saved answers yet",
    emptyBody: "Complete the questionnaire to generate your classification and PDF.",
    disclaimer:
      "This tool provides an orientative classification based on Regulation (EU) 2024/1689 (AI Act). It does not constitute legal advice. Verify with a specialised lawyer before making compliance decisions."
  }
} satisfies Record<Locale, Record<string, string>>;

const flagLabels = {
  es: {
    gpai: "Revisar Art. 51 si el modelo GPAI puede presentar riesgo sistemico.",
    "data-protection-review": "Cruzar con RGPD, seguridad, base juridica y evaluacion de impacto cuando proceda."
  },
  en: {
    gpai: "Review Art. 51 if the GPAI model may present systemic risk.",
    "data-protection-review": "Cross-check GDPR, security, legal basis and impact assessment where relevant."
  }
} satisfies Record<Locale, Record<string, string>>;

export default function ResultsApp({ locale, questionnairePath, calendlyUrl }: ResultsAppProps) {
  const questions = useMemo(() => getQuestions(locale), [locale]);
  const obligations = useMemo(() => getObligations(locale), [locale]);
  const [answers, setAnswers] = useState<Answers | null>(null);

  useEffect(() => {
    const resultRaw = window.localStorage.getItem(`aiActDiagnosisResult:${locale}`);
    const answersRaw = window.localStorage.getItem(`aiActDiagnosis:${locale}`);
    if (resultRaw) {
      const parsed = JSON.parse(resultRaw) as { answers: Answers };
      setAnswers(parsed.answers);
      return;
    }
    if (answersRaw) {
      setAnswers(JSON.parse(answersRaw) as Answers);
    }
  }, [locale]);

  const result: DiagnosisResult | null = useMemo(() => {
    if (!answers) {
      return null;
    }
    return evaluateDiagnosis(answers, questions, obligations, locale);
  }, [answers, locale, obligations, questions]);

  useEffect(() => {
    if (result) {
      trackCompletion(result.classification, result.answeredCount);
    }
  }, [result]);

  if (!result) {
    return (
      <section className="jr-container py-12">
        <div className="jr-panel max-w-2xl p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal">{copy[locale].eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold text-ink">{copy[locale].emptyTitle}</h1>
          <p className="mt-3 text-slate-700">{copy[locale].emptyBody}</p>
          <a
            href={questionnairePath}
            className="mt-6 inline-flex min-h-11 items-center rounded-md bg-signal px-4 text-sm font-semibold text-white transition hover:bg-ink"
          >
            {copy[locale].restart}
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="jr-container py-10 md:py-14">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.66fr)_minmax(300px,0.34fr)]">
        <article className="jr-panel p-5 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal">{copy[locale].eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold text-ink md:text-4xl">{result.label}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">{result.summary}</p>

          <div className="mt-7 rounded-md border border-line bg-paper p-4">
            <h2 className="text-base font-bold text-ink">{copy[locale].annex}</h2>
            {result.annexMatches.length > 0 ? (
              <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                {result.annexMatches.map((match) => (
                  <li key={match} className="rounded-md bg-white px-3 py-2">
                    {match}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-600">{copy[locale].noAnnex}</p>
            )}
          </div>

          <h2 className="mt-8 text-xl font-bold text-ink">{copy[locale].obligations}</h2>
          <div className="mt-4 grid gap-3">
            {result.obligations.map((obligation) => (
              <div key={obligation.id} className="rounded-md border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-ink">{obligation.title}</h3>
                  <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-bold text-signal">{obligation.article}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{obligation.summary}</p>
              </div>
            ))}
          </div>

          {result.flags.length > 0 ? (
            <>
              <h2 className="mt-8 text-xl font-bold text-ink">{copy[locale].flags}</h2>
              <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                {result.flags.map((flag) => (
                  <li key={flag} className="rounded-md border border-line bg-white px-3 py-2">
                    {flagLabels[locale][flag as keyof (typeof flagLabels)[typeof locale]] ?? flag}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </article>

        <aside className="jr-panel h-fit p-5">
          <div className="mb-5 flex items-center gap-2 text-sm font-bold text-signal">
            <FileText size={18} aria-hidden="true" />
            PDF
          </div>
          <PdfExport result={result} locale={locale} />
          <a
            href={calendlyUrl}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-signal px-4 text-center text-sm font-semibold text-white transition hover:bg-ink"
          >
            <CalendarCheck size={18} aria-hidden="true" />
            {copy[locale].ctaSecondary}
          </a>
          <p className="mt-4 text-sm font-semibold leading-6 text-ink">{copy[locale].cta}</p>
          <a
            href={questionnairePath}
            className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-signal"
          >
            <RotateCcw size={16} aria-hidden="true" />
            {copy[locale].restart}
          </a>
          <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-slate-600">{copy[locale].disclaimer}</p>
        </aside>
      </div>
    </section>
  );
}
