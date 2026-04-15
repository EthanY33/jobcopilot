import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { buildCoverLetterRequest, parseCoverLetterResponse } from "../src/cover-letter";

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const RUBRICS_DIR = path.join(__dirname, "rubrics");

interface Rubric {
  name: string;
  checks: RubricCheck[];
}

type RubricCheck =
  | { kind: "length_words"; min: number; max: number }
  | { kind: "contains_company_name"; required: boolean }
  | { kind: "contains_job_title"; required: boolean }
  | { kind: "banned_phrase"; phrases: string[] }
  | { kind: "alternate_openings_count"; exact: number }
  | { kind: "distinct_openings"; required: boolean };

interface Fixture {
  id: string;
  inputs: {
    company: string;
    title: string;
    jobPostingText: string;
    variantEmphasis: string[];
  };
  rubric: string;
}

const BASELINE = {
  baseResumeText:
    "Ethan Yucetepe - CS student at NJIT, Dec 2026. Founder of goneIdle indie studio shipping TideWane to Steam. Built ATS with Next.js + Claude API. PrivacyPulse Chrome extension. OpenClaw quantitative trading with multi-agent Claude orchestration.",
  skills: ["TypeScript", "Python", "Next.js", "Claude API", "React", "Supabase"],
  targetRoles: ["Software Engineer", "Data Science", "AI Engineer"],
  toneGuidance: "Direct, concrete, specific. Lead with evidence. No filler.",
};

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set. Load it from root .env or export it before running evals.");
    process.exit(1);
  }
  const client = new Anthropic({ apiKey });
  const fixtures = fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, f), "utf8")) as Fixture);

  let pass = 0;
  let fail = 0;

  for (const fx of fixtures) {
    const rubric = JSON.parse(
      fs.readFileSync(path.join(RUBRICS_DIR, `${fx.rubric}.json`), "utf8"),
    ) as Rubric;

    const req = buildCoverLetterRequest({
      cached: BASELINE,
      jobPostingText: fx.inputs.jobPostingText,
      company: fx.inputs.company,
      title: fx.inputs.title,
      variantEmphasis: fx.inputs.variantEmphasis,
    });

    const res = await client.messages.create(req);
    const parsed = parseCoverLetterResponse(res);
    const failures = runChecks(parsed, rubric, fx.inputs);

    if (failures.length === 0) {
      console.log(`PASS: ${fx.id}`);
      pass++;
    } else {
      console.log(`FAIL: ${fx.id}`);
      failures.forEach((f) => console.log(`  - ${f}`));
      fail++;
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

function runChecks(
  output: { body: string; alternateOpenings: string[] },
  rubric: Rubric,
  inputs: Fixture["inputs"],
): string[] {
  const failures: string[] = [];
  for (const check of rubric.checks) {
    switch (check.kind) {
      case "length_words": {
        const words = output.body.trim().split(/\s+/).length;
        if (words < check.min || words > check.max) {
          failures.push(`length_words: ${words} not in [${check.min}, ${check.max}]`);
        }
        break;
      }
      case "contains_company_name":
        if (check.required && !output.body.includes(inputs.company)) {
          failures.push(`missing company name: ${inputs.company}`);
        }
        break;
      case "contains_job_title": {
        const t = inputs.title.toLowerCase();
        if (check.required && !output.body.toLowerCase().includes(t)) {
          failures.push(`missing job title: ${inputs.title}`);
        }
        break;
      }
      case "banned_phrase":
        for (const phrase of check.phrases) {
          if (output.body.toLowerCase().includes(phrase.toLowerCase())) {
            failures.push(`banned phrase present: "${phrase}"`);
          }
        }
        break;
      case "alternate_openings_count":
        if (output.alternateOpenings.length !== check.exact) {
          failures.push(`alternate openings: ${output.alternateOpenings.length} != ${check.exact}`);
        }
        break;
      case "distinct_openings": {
        const normalized = output.alternateOpenings.map((s) => s.trim().toLowerCase());
        if (new Set(normalized).size !== normalized.length) {
          failures.push("alternate openings not distinct");
        }
        break;
      }
    }
  }
  return failures;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
