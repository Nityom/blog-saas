import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.aicredits.in/v1",
  apiKey: process.env.AICREDITS_API_KEY || "dummy_key_to_bypass_build_error",
});

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  retries = 2,
  model = "openai/gpt-4o-mini"
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      });
      return response.choices[0].message.content ?? "";
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Generation failed after retries");
}
