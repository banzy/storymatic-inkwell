import { engineReplySchema, itemKinds, type EngineReply } from "./model";

const string = { type: "string" };
const nullableString = { type: ["string", "null"] };
const object = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
export const REPLY_JSON_SCHEMA = object({
  answer: string,
  proposals: {
    type: "array",
    items: object({
      targetId: nullableString,
      kind: { type: "string", enum: itemKinds },
      title: string,
      body: string,
      commitment: { type: "string", enum: ["tentative", "decided"] },
      origin: { type: "string", enum: ["author", "suggestion"] },
      sourceQuote: nullableString,
      rationale: string,
    }),
  },
  draft: {
    anyOf: [
      object({
        title: string,
        brief: string,
        text: string,
        reviewNotes: { type: "array", items: string },
      }),
      { type: "null" },
    ],
  },
});

export type EngineGenerator = (system: string, input: string) => Promise<EngineReply>;

export const generateEngineReply: EngineGenerator = async (system, input) => {
  const key = process.env["OPENAI_API_KEY"];
  if (!key)
    throw new Error(
      "Set OPENAI_API_KEY on the application server to connect Storymatic. Your message has been saved.",
    );
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model: process.env["STORYMATIC_MODEL"] || "gpt-6-astra",
      store: false,
      instructions: system,
      input,
      max_output_tokens: 12000,
      text: {
        format: {
          type: "json_schema",
          name: "storymatic_collaboration",
          strict: true,
          schema: REPLY_JSON_SCHEMA,
        },
      },
    }),
  });
  if (!response.ok) {
    // Never expose response bodies, credentials or manuscript context in errors.
    if (response.status === 401)
      throw new Error("The OpenAI key was not accepted. Your message has been saved.");
    if (response.status === 429)
      throw new Error(
        "OpenAI is busy or this account has reached its usage limit. Your message has been saved; retry later.",
      );
    throw new Error(
      `Writing assistance could not complete the request (${response.status}). Your message has been saved.`,
    );
  }
  const payload = (await response.json()) as {
    status?: string;
    output?: { type?: string; content?: { type?: string; text?: string }[] }[];
  };
  if (payload.status !== "completed")
    throw new Error("The response did not finish. Your message is saved; try a smaller request.");
  const text = (payload.output ?? [])
    .filter((part) => part.type === "message")
    .flatMap((part) => part.content ?? [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .join("");
  if (!text)
    throw new Error(
      "The writing assistant returned no usable response. Your message has been saved.",
    );
  return engineReplySchema.parse(JSON.parse(text));
};
