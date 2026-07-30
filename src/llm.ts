import type { AppConfig } from "./types.js";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chatJson<T>(
  config: AppConfig,
  messages: ChatMessage[],
): Promise<T | null> {
  if (!config.openaiApiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages,
      }),
    });
    if (!res.ok) {
      console.error("[llm]", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error("[llm]", err);
    return null;
  }
}
