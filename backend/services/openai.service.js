import Groq from "groq-sdk";

// Single Groq client instance shared across all controllers
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Send a chat completion request to Groq (LLaMA 3).
 * Keeps the same signature as the original OpenAI service
 * so controllers need zero changes.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} options - optional overrides (temperature, max_tokens)
 * @returns {Promise<string>} - the assistant reply text
 */
export async function chatCompletion(messages, options = {}) {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 1024,
    messages,
  });

  return response.choices[0].message.content.trim();
}
