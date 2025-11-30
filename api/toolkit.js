// api/toolkit.js
// Vercel / Next Edge function style (JS)
import fetch from "node-fetch";

export const config = { runtime: "edge" };

export default async function (req) {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const body = await req.json();
    const mood = body.mood || "";
    const userWork = body.userWork || "";
    const lang = body.lang || "th";

    const prompt = `
You are an evidence-based clinical assistant. Create 3 short, practical, personalized "toolkit" interventions
for the user based on the following inputs. Keep each toolkit concrete, easy to do, and tied to a short psychological rationale.

- User mood/label: ${mood}
- User description / work-sample: ${userWork}
- Language: ${lang}

Output JSON:
{
  "toolkits": [
    { "title": "...", "steps": ["...","..."], "why": "short psychological rationale" },
    ...
  ]
}
Make output strictly JSON (no extra commentary).
`;

    // Call OpenAI Chat Completions endpoint
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.85,
        max_tokens: 800
      })
    });

    const openaiJson = await openaiRes.json();
    const reply = openaiJson?.choices?.[0]?.message?.content || openaiJson?.choices?.[0]?.text || "";

    // Try to parse JSON from reply
    let parsed;
    try { parsed = JSON.parse(reply); }
    catch(e) {
      // fallback: return raw text
      return new Response(JSON.stringify({ success: true, raw: reply }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
