import { convertForWordDelivery } from "../src/word-delivery/delivery-bridge.js";

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const payload = await readBody(req);
    const result = convertForWordDelivery(payload.text ?? "");
    res.status(200).json({
      segments: result.segments,
      html: result.html,
      ooxml: result.ooxml,
      plainText: result.plainText,
      errors: result.errors,
      stats: result.stats,
      docxBase64: result.docx.toString("base64")
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: message });
  }
}
