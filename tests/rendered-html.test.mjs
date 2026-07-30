import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Premiere 22 home route", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Premiere 22/i);
  assert.match(html, /Ra(?:ú|Ãº)l Garc(?:í|Ã­)a/i);
  assert.match(html, /Angine de Poitrine/i);
  assert.match(html, /Live on KEXP/i);
  assert.match(html, /Material recuperado/i);
  assert.match(html, /producci(?:ó|Ã³)n real/i);
  assert.doesNotMatch(html, /Your site is taking shape/i);
});

test("server-renders the M00NW4LK.EXE route and loading shell", async () => {
  const response = await render("/walk-exe");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /M00NW4LK\.EXE/i);
  assert.match(html, /INICIALIZANDO MOTOR 3D/i);
  assert.match(html, /walk-loading/i);
  assert.match(html, /walk-exe/i);
});
