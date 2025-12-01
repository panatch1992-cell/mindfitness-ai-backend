// api/vent.js
// Accept vent text, run a quick AI risk-check, return analysis.
// Persistence to DB is not implemented here (next step) — this returns analysis JSON.
// Note: Edge runtime has built-in fetch, no import needed

export const config = { runtime: "edge" };

export default async function (req) {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const body = await req.json();
    const text = (body.text || "").trim();
    const lang = body.lang || "th";

    if (!text) return new Response(JSON.stringify({ success: false, error: "empty" }), { status: 400 });

    // Build a short prompt to detect crisis / severity & safe reply.
    const prompt = `
You are an empathetic, safety-first assistant. The user writes:
"${text}"

Please do two things (in JSON format):
1) "analysis": a short classification: "risk": "none"|"low"|"medium"|"high" and "tags": [emotions keywords]
2) "reply": a brief empathetic reply (1-3 sentences) in ${lang}.

Return strictly JSON like:
{"analysis": {"risk":"low", "tags":["sad","lonely"]}, "reply":"..."}
`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 400
      })
    });

    const openaiJson = await openaiRes.json();
    const reply = openaiJson?.choices?.[0]?.message?.content || openaiJson?.choices?.[0]?.text || "";

    // parse
    let parsed;
    try { parsed = JSON.parse(reply); }
    catch (e) {
      // fallback: return raw text as reply
      parsed = { analysis: { risk: "unknown", tags: [] }, reply };
    }

    // Note: not saving to DB yet. Return analysis and suggested reply.
    return new Response(JSON.stringify({ success: true, analysis: parsed.analysis, reply: parsed.reply }), {
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
