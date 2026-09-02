const key = process.env.GEMINI_API_KEY;
const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json", "X-goog-api-key": key },
  body: JSON.stringify({
    contents: [{ parts: [{ text: 'Return {"ok":true} and nothing else.' }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
      temperature: 0,
    },
  }),
});
console.log("HTTP", res.status);
const body = await res.text();
// Print only the shape, never anything that could echo the key back.
console.log(body.slice(0, 400));
