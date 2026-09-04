import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/convert.js";

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    }
  };
}

test("Vercel convert API returns Word and clipboard artifacts", async () => {
  const req = { method: "POST", body: { text: "Energy: $E=mc^2$." } };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.stats.mathCount, 1);
  assert.match(res.body.html, /<math/);
  assert.match(res.body.ooxml, /<m:oMath/);
  assert.ok(res.body.docxBase64.length > 500);
});

test("Vercel convert API rejects non-POST requests", async () => {
  const req = { method: "GET" };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: "Method not allowed" });
});
