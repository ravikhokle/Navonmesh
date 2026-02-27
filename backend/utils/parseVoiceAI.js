/**
 * parseVoiceAI — Uses Cohere AI to extract structured fields (name, phone, description)
 * from a raw voice transcript in English, Hindi, or Marathi.
 */

const COHERE_API_URL = "https://api.cohere.com/v2/chat";

const SYSTEM_PROMPT = `You are an emergency SOS voice transcript parser for an Indian emergency response system.

The user will give you a raw voice-to-text transcript spoken in English, Hindi, or Marathi (or a mix). The transcript comes from a citizen reporting an emergency via voice input.

Your job: Extract EXACTLY three fields from the transcript:
1. **name** — The person's full name. Look for patterns like "my name is...", "mera naam...", "माझे नाव...", "मेरा नाम..." etc. Return ONLY the name, no extra words. If the name appears in Devanagari script, keep it in Devanagari. Clean up any Speech-to-text artifacts (repeated words, filler words).
2. **phone** — The 10-digit Indian mobile number. It may appear as digits, spelled-out digit words (e.g. "nine eight seven six five four three two one zero"), Hindi/Marathi number words (e.g. "नौ आठ सात छह पांच चार तीन दो एक शून्य"), or a mix. Convert ALL digit words to actual digits. Remove +91, country code, spaces, dashes. Return ONLY 10 digits.
3. **description** — The emergency description / what happened. This is everything that describes the problem, accident, medical issue, etc. Remove the name and phone portions from this text. Keep the original language. Clean up repetitions and filler words but preserve meaning. Be concise but don't lose important details.

RULES:
- Return valid JSON only: { "name": "...", "phone": "...", "description": "..." }
- If a field cannot be found, return an empty string "" for that field.
- Do NOT invent or guess information that isn't in the transcript.
- The phone number MUST be exactly 10 digits if found, starting with 6-9 (Indian mobile).
- Keep names in their original script (Latin or Devanagari).
- Fix common speech-to-text errors: "hai" at end of name should be removed, repeated words should be deduplicated.
- Return ONLY the JSON object, no explanations.`;

/**
 * Call Cohere API to parse a voice transcript into { name, phone, description }.
 * @param {string} transcript — Raw voice transcript text
 * @param {string} language — Language code: "en-IN", "hi-IN", or "mr-IN"
 * @returns {Promise<{name: string, phone: string, description: string}>}
 */
export async function parseVoiceWithAI(transcript, language = "en-IN") {
  const apiKey = process.env.COHERE_API_KEY;
  const model = process.env.COHERE_MODEL || "command-a-03-2025";

  if (!apiKey) {
    throw new Error("COHERE_API_KEY not configured");
  }

  const langLabel =
    language === "hi-IN" ? "Hindi" : language === "mr-IN" ? "Marathi" : "English";

  const userMessage = `Language: ${langLabel}\n\nTranscript:\n"${transcript}"`;

  const response = await fetch(COHERE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Cohere API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();

  // Cohere v2 Chat response: data.message.content[0].text
  const rawText =
    data?.message?.content?.[0]?.text ||
    data?.text ||
    data?.message?.text ||
    "";

  // Parse the JSON from the response
  const parsed = JSON.parse(rawText);

  // Validate and sanitize
  const result = {
    name: typeof parsed.name === "string" ? parsed.name.trim() : "",
    phone: typeof parsed.phone === "string" ? parsed.phone.replace(/\D/g, "") : "",
    description:
      typeof parsed.description === "string" ? parsed.description.trim() : "",
  };

  // Validate phone: must be 10 digits starting with 6-9
  if (result.phone && !/^[6-9]\d{9}$/.test(result.phone)) {
    result.phone = ""; // Invalid phone, clear it
  }

  return result;
}
