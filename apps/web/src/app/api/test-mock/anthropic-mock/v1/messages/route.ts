import { NextResponse } from "next/server";

interface AnthropicContentBlock {
  type: string;
  text?: string;
}
interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

function flattenContent(content: AnthropicMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .map((b) => (b.type === "text" && typeof b.text === "string" ? b.text : ""))
    .join("\n");
}

function fingerprint(messages: AnthropicMessage[], system: unknown): string {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => flattenContent(m.content))
    .join("\n");
  const sysText = typeof system === "string" ? system : JSON.stringify(system ?? "");
  return userText + "\n" + sysText;
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("not found", { status: 404 });
  }

  const body = (await req.json()) as {
    messages?: AnthropicMessage[];
    system?: unknown;
  };
  const fp = fingerprint(body.messages ?? [], body.system);

  let text = "{}";
  // Order matters: more specific patterns first.
  // Each regex is anchored to a phrase that actually appears in the
  // corresponding prompt in packages/prompts/src/*.ts.
  if (/extract the job posting data/i.test(fp)) {
    text = JSON.stringify({
      company: "Google",
      title: "Applications Engineer, YouTube Creator Partnerships",
      location: "New York, NY",
      requirements: [
        "Bachelor's degree in Computer Science or equivalent experience",
        "2+ years of experience in software engineering",
        "Experience with large language models or generative AI",
      ],
      description:
        "Build generative AI tools empowering internal partner-facing users to drive success for creators on YouTube.",
      sourceAts: "manual",
    });
  } else if (/candidate resume bullets/i.test(fp)) {
    text = JSON.stringify({
      suggestions: [
        {
          section: "Experience",
          originalBullet: "Built TideWane indie game",
          suggestedBullet:
            "Shipped TideWane to Steam — full-stack TypeScript, Web Audio synthesis, Godot WebView IPC",
          rationale:
            "Adds platform + tech-stack specificity matching the JD's full-stack focus",
        },
      ],
    });
  } else if (/write a 220-280 word cover letter|cover letter/i.test(fp)) {
    text = JSON.stringify({
      body:
        "Dear Google team,\n\nI'm writing about the Applications Engineer role on YouTube " +
        "Creator Partnerships. I'm a December 2026 CS grad at NJIT shipping LLM tooling and " +
        "a Steam indie game in parallel — exactly the work your charter describes. Looking " +
        "forward to talking.\n\nEthan",
      alternateOpenings: [
        "I'm a December 2026 CS grad shipping LLM tooling and a Steam indie game — writing about the Applications Engineer role on YouTube Creator Partnerships.",
        "Your team builds gen-AI tools for internal partners — that's the shape of work I've already chosen.",
        "Hi — writing about the Applications Engineer role on YouTube Creator Partnerships. The charter overlaps directly with what I've built over the last 18 months.",
      ],
    });
  } else if (/extract the resume|parse.*resume|extract.*resume/i.test(fp)) {
    text = JSON.stringify({
      baseResumeText: "Ethan Yucetepe\nNJIT CS, December 2026\nExperience...",
      skills: ["TypeScript", "React", "Node.js", "Anthropic SDK"],
      sections: [
        {
          section: "Experience",
          items: ["Founded goneIdle and shipped TideWane to Steam"],
        },
      ],
    });
  }

  return NextResponse.json({
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-6",
    stop_reason: "end_turn",
    stop_sequence: null,
    content: [{ type: "text", text }],
    usage: { input_tokens: 500, output_tokens: 200 },
  });
}
