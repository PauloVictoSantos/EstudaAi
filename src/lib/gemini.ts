// Cliente do Gemini (Google). Usado pela ingestão (leitura de páginas com texto corrompido) e pelo app
// (explicações, correção de redação, temas). Sem GEMINI_API_KEY tudo continua funcionando sem IA.
import { ApiError, GoogleGenAI, type Part } from "@google/genai";
import type { z } from "zod";

export const hasGemini = () =>
  !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
export const geminiModel = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";

let client: GoogleGenAI | null = null;
const ai = () =>
  (client ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  }));

export type Input = string | { image: Buffer | Uint8Array; mime: string };

/** Uma chamada com resposta JSON validada pelo schema. Repete em limite de taxa/erro do servidor. */
export async function askJson<T>(
  schema: z.ZodType<T>,
  jsonSchema: Record<string, unknown>,
  system: string,
  input: Input[],
  opts: { temperature?: number } = {}
): Promise<T> {
  const parts: Part[] = input.map((i) =>
    typeof i === "string"
      ? { text: i }
      : {
          inlineData: {
            mimeType: i.mime,
            data: Buffer.from(i.image).toString("base64"),
          },
        }
  );
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await ai().models.generateContent({
        model: geminiModel(),
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          temperature: opts.temperature ?? 0.2,
        },
      });
      let data: unknown;
      try {
        data = JSON.parse(res.text ?? "");
      } catch {
        throw new Error("LLM_INVALID_OUTPUT");
      }
      const parsed = schema.safeParse(data);
      if (!parsed.success) throw new Error("LLM_INVALID_OUTPUT");
      return parsed.data;
    } catch (e) {
      const retryable = e instanceof ApiError && e.status >= 500;
      if (!retryable || attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
  }
}

export const S = {
  str: { type: "string" },
  int: { type: "integer" },
  obj: (props: Record<string, unknown>, required = Object.keys(props)) => ({
    type: "object",
    properties: props,
    required,
  }),
  arr: (items: unknown) => ({ type: "array", items }),
  enum: (values: string[]) => ({ type: "string", enum: values }),
};
