import obligationsEn from "../data/obligations.en.json";
import obligationsEs from "../data/obligations.es.json";
import questionsEn from "../data/questions.en.json";
import questionsEs from "../data/questions.es.json";

export type Locale = "es" | "en";
export type Classification = "prohibited" | "high-risk" | "limited" | "minimal";
export type EffectType = "classification" | "obligation" | "annex" | "flag" | "role";

export interface Effect {
  type: EffectType;
  value: string;
}

export interface QuestionCondition {
  question: string;
  equals?: string;
  notEquals?: string;
}

export interface QuestionOption {
  value: string;
  label: string;
  effects: Effect[];
}

export interface Question {
  id: string;
  title: string;
  help: string;
  type: "single";
  when?: QuestionCondition;
  options: QuestionOption[];
}

export interface Obligation {
  id: string;
  title: string;
  article: string;
  appliesTo: string[];
  summary: string;
}

export type Answers = Record<string, string>;

export interface DiagnosisResult {
  classification: Classification;
  label: string;
  shortLabel: string;
  summary: string;
  confidence: "orientative" | "needs-review";
  obligations: Obligation[];
  annexMatches: string[];
  flags: string[];
  roles: string[];
  answeredCount: number;
}

const priority: Record<Classification, number> = {
  minimal: 1,
  limited: 2,
  "high-risk": 3,
  prohibited: 4
};

const copy: Record<Locale, Record<Classification, { label: string; shortLabel: string; summary: string }>> = {
  es: {
    prohibited: {
      label: "Posible práctica prohibida",
      shortLabel: "Prohibido",
      summary:
        "Hay señales de que el caso podría encajar en una práctica prohibida por el AI Act. Conviene detener el despliegue y revisar el diseño antes de seguir."
    },
    "high-risk": {
      label: "Sistema de alto riesgo",
      shortLabel: "Alto Riesgo",
      summary:
        "El caso toca una categoría del Anexo III, un producto regulado o una decisión con impacto relevante. Activa controles de gestión de riesgos, datos, documentación, logs, transparencia y supervisión humana."
    },
    limited: {
      label: "Riesgo limitado",
      shortLabel: "Riesgo Limitado",
      summary:
        "El sistema parece centrarse en interacción con personas o contenido sintético. Normalmente exige avisos claros de transparencia conforme al Art. 50."
    },
    minimal: {
      label: "Riesgo mínimo",
      shortLabel: "Mínimo",
      summary:
        "No aparecen señales fuertes de alto riesgo o riesgo limitado. Aun así, documenta inventario, responsables, proveedores y usos permitidos."
    }
  },
  en: {
    prohibited: {
      label: "Possible prohibited practice",
      shortLabel: "Prohibited",
      summary:
        "There are signals that the use case may fit a prohibited AI Act practice. Stop deployment and review the design before proceeding."
    },
    "high-risk": {
      label: "High-risk system",
      shortLabel: "High Risk",
      summary:
        "The use case touches an Annex III category, a regulated product or a decision with meaningful impact. It activates risk management, data, documentation, logging, transparency and human oversight controls."
    },
    limited: {
      label: "Limited risk",
      shortLabel: "Limited Risk",
      summary:
        "The system appears focused on human interaction or synthetic content. It usually requires clear transparency notices under Art. 50."
    },
    minimal: {
      label: "Minimal risk",
      shortLabel: "Minimal",
      summary:
        "No strong high-risk or limited-risk signals were found. Still document inventory, ownership, vendors and acceptable uses."
    }
  }
};

export function getQuestions(locale: Locale): Question[] {
  return (locale === "es" ? questionsEs : questionsEn) as Question[];
}

export function getObligations(locale: Locale): Obligation[] {
  return (locale === "es" ? obligationsEs : obligationsEn) as Obligation[];
}

export function conditionMatches(condition: QuestionCondition | undefined, answers: Answers): boolean {
  if (!condition) {
    return true;
  }

  const answer = answers[condition.question];
  if (condition.equals !== undefined) {
    return answer === condition.equals;
  }
  if (condition.notEquals !== undefined) {
    return answer !== undefined && answer !== condition.notEquals;
  }
  return true;
}

export function getVisibleQuestions(questions: Question[], answers: Answers): Question[] {
  return questions.filter((question) => conditionMatches(question.when, answers));
}

export function getSelectedEffects(questions: Question[], answers: Answers): Effect[] {
  return questions.flatMap((question) => {
    const answer = answers[question.id];
    const option = question.options.find((candidate) => candidate.value === answer);
    return option?.effects ?? [];
  });
}

export function evaluateDiagnosis(
  answers: Answers,
  questions: Question[],
  obligationCatalog: Obligation[],
  locale: Locale
): DiagnosisResult {
  const effects = getSelectedEffects(questions, answers);
  const classes = effects
    .filter((effect): effect is Effect & { value: Classification } => effect.type === "classification")
    .map((effect) => effect.value);

  const classification = classes.reduce<Classification>(
    (current, next) => (priority[next] > priority[current] ? next : current),
    "minimal"
  );

  const explicitObligationIds = new Set(
    effects.filter((effect) => effect.type === "obligation").map((effect) => effect.value)
  );
  const flags = unique(effects.filter((effect) => effect.type === "flag").map((effect) => effect.value));
  const roles = unique(effects.filter((effect) => effect.type === "role").map((effect) => effect.value));
  const annexMatches = unique(effects.filter((effect) => effect.type === "annex").map((effect) => effect.value));

  const appliesTo = new Set<string>([classification, ...flags, ...roles]);
  const obligations = obligationCatalog.filter(
    (obligation) => explicitObligationIds.has(obligation.id) || obligation.appliesTo.some((tag) => appliesTo.has(tag))
  );

  const resultCopy = copy[locale][classification];

  return {
    classification,
    ...resultCopy,
    confidence: classification === "minimal" ? "orientative" : "needs-review",
    obligations: uniqueBy(obligations, (obligation) => obligation.id),
    annexMatches,
    flags,
    roles,
    answeredCount: Object.keys(answers).length
  };
}

export function isComplete(questions: Question[], answers: Answers): boolean {
  const visibleQuestions = getVisibleQuestions(questions, answers);
  return visibleQuestions.every((question) => answers[question.id] !== undefined);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const id = key(value);
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}
