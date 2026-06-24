import { readFile } from "node:fs/promises";

const classifications = new Set(["prohibited", "high-risk", "limited", "minimal"]);
const effectTypes = new Set(["classification", "obligation", "annex", "flag", "role"]);

async function readJson(file) {
  return JSON.parse(await readFile(new URL(`../src/data/${file}`, import.meta.url), "utf8"));
}

const [questionsEs, questionsEn, obligationsEs, obligationsEn] = await Promise.all([
  readJson("questions.es.json"),
  readJson("questions.en.json"),
  readJson("obligations.es.json"),
  readJson("obligations.en.json"),
]);

const errors = [];

function fail(message) {
  errors.push(message);
}

function ids(items) {
  return items.map((item) => item.id);
}

function sameOrderedIds(label, left, right) {
  const leftIds = ids(left);
  const rightIds = ids(right);
  if (leftIds.join("\n") !== rightIds.join("\n")) {
    fail(`${label} IDs differ between ES and EN`);
  }
}

sameOrderedIds("Question", questionsEs, questionsEn);
sameOrderedIds("Obligation", obligationsEs, obligationsEn);

const questionIds = new Set(ids(questionsEs));
const obligationIds = new Set(ids(obligationsEs));
const questionsEnById = new Map(questionsEn.map((question) => [question.id, question]));

for (const question of questionsEs) {
  const english = questionsEnById.get(question.id);

  if (question.type !== "single") {
    fail(`${question.id} uses unsupported question type ${question.type}`);
  }

  if (!Array.isArray(question.options)) {
    fail(`${question.id} options must be an array`);
    continue;
  }

  if (question.when) {
    if (!questionIds.has(question.when.question)) {
      fail(`${question.id} depends on missing question ${question.when.question}`);
    }
    const dependency = questionsEs.find((candidate) => candidate.id === question.when.question);
    const values = new Set((dependency?.options ?? []).map((option) => option.value));
    for (const key of ["equals", "notEquals"]) {
      if (question.when[key] !== undefined && !values.has(question.when[key])) {
        fail(`${question.id} condition ${key} references unknown option ${question.when[key]}`);
      }
    }
  }

  if (!english) {
    fail(`${question.id} is missing from EN questions`);
  } else if (!Array.isArray(english.options)) {
    fail(`${question.id} EN options must be an array`);
  } else {
    const optionValues = question.options.map((option) => option.value);
    const englishOptionValues = english.options.map((option) => option.value);
    if (optionValues.join("\n") !== englishOptionValues.join("\n")) {
      fail(`${question.id} option values differ between ES and EN`);
    }
  }

  for (const option of question.options) {
    if (option.effects !== undefined && !Array.isArray(option.effects)) {
      fail(`${question.id}/${option.value} effects must be an array`);
      continue;
    }
    for (const effect of option.effects ?? []) {
      if (!effectTypes.has(effect.type)) {
        fail(`${question.id}/${option.value} has unknown effect type ${effect.type}`);
      }
      if (effect.type === "classification" && !classifications.has(effect.value)) {
        fail(`${question.id}/${option.value} references unknown classification ${effect.value}`);
      }
      if (effect.type === "obligation" && !obligationIds.has(effect.value)) {
        fail(`${question.id}/${option.value} references missing obligation ${effect.value}`);
      }
    }
  }
}

for (const obligation of obligationsEs) {
  if (!Array.isArray(obligation.appliesTo)) {
    fail(`${obligation.id} appliesTo must be an array`);
    continue;
  }
  for (const tag of obligation.appliesTo) {
    if (!classifications.has(tag) && !["provider", "deployer", "gpai"].includes(tag)) {
      fail(`${obligation.id} has unexpected appliesTo tag ${tag}`);
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
