// Offline shell + Android share target. Every build has its own cache, filled in one go,
// so the page and its script always come from the same version. New versions apply on the next launch.
const C = "luz-app-ae206667cb", SHARE = "luz-share";
const ASSETS = ["./", "./app.js", "./fonts.css", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable.png"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" }))))); });
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith("luz-app-") && k !== C) await caches.delete(k);  // only our own old versions
  await self.clients.claim();
})()));
async function handleShare(req) {
  try {
    const fd = await req.formData(), c = await caches.open(SHARE);
    for (const k of await c.keys()) await c.delete(k);
    const parts = [fd.get("title"), fd.get("text"), fd.get("url")].filter(v => typeof v === "string" && v.trim()).map(v => v.trim());
    await c.put("text", new Response([...new Set(parts)].join("\n")));
    let i = 0;
    for (const f of fd.getAll("shots")) if (f && typeof f !== "string" && f.size && i < 10) await c.put("img-" + i++, new Response(f, { headers: { "content-type": f.type || "image/png" } }));
  } catch (e) {}
  return Response.redirect("./?shared=1", 303);
}
self.addEventListener("fetch", e => {
  const req = e.request, u = new URL(req.url);
  if (u.origin !== location.origin || !u.pathname.startsWith(new URL("./", location).pathname)) return;
  if (req.method === "POST" && u.pathname.endsWith("/share")) { e.respondWith(handleShare(req)); return; }
  if (req.method !== "GET") return;
  e.respondWith((async () => {
    const c = await caches.open(C), hit = await c.match(req.mode === "navigate" ? "./" : req, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(req); }
    catch { return new Response("אין חיבור לאינטרנט", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }); }
  })());
});
