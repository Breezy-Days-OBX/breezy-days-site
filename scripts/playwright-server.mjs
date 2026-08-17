import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { createServer as createViteServer } from "vite";

const root = process.cwd();
const dist = resolve(root, "dist");
const host = "127.0.0.1";
const port = Number(process.env.PORT ?? 4321);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

const vite = await createViteServer({
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true },
});
const { createSettingsHandlers } = await vite.ssrLoadModule(
  "/netlify/functions/_shared/settingsService.ts",
);
const protectedHandlers = createSettingsHandlers({
  store: {
    get: async () => null,
    getWithMetadata: async () => null,
    set: async () => ({ modified: false }),
    list: async () => ({ blobs: [] }),
  },
  getUser: async () => null,
  verifyOrigin: () => undefined,
  now: () => new Date("2026-08-17T00:00:00.000Z"),
  createId: () => "playwright",
});

async function sendFunctionResponse(request, response, handler) {
  const origin = `http://${request.headers.host ?? `${host}:${port}`}`;
  const body = ["GET", "HEAD"].includes(request.method ?? "GET") ? undefined : request;
  const functionResponse = await handler(
    new Request(new URL(request.url ?? "/", origin), {
      method: request.method,
      headers: request.headers,
      ...(body ? { body, duplex: "half" } : {}),
    }),
  );
  response.writeHead(functionResponse.status, Object.fromEntries(functionResponse.headers));
  response.end(Buffer.from(await functionResponse.arrayBuffer()));
}

function fileForPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const requested = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const cleanRoute = requested.endsWith("/") ? `${requested}index.html` : requested;
  const candidate = resolve(
    dist,
    cleanRoute.includes(".") ? cleanRoute : `${cleanRoute}/index.html`,
  );
  return candidate.startsWith(`${dist}${sep}`) ? candidate : null;
}

async function sendStaticResponse(request, response) {
  const pathname = new URL(request.url ?? "/", `http://${host}:${port}`).pathname;
  const candidate = fileForPath(pathname);
  try {
    if (!candidate || !(await stat(candidate)).isFile()) throw new Error("not found");
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(candidate)] ?? "application/octet-stream",
    });
    response.end(await readFile(candidate));
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(await readFile(resolve(dist, "404.html")));
  }
}

const server = createServer(async (request, response) => {
  if (request.url?.startsWith("/.netlify/functions/owner-settings")) {
    await sendFunctionResponse(request, response, protectedHandlers.ownerSettings);
    return;
  }
  await sendStaticResponse(request, response);
});

server.listen(port, host, () =>
  console.log(`Playwright local Function boundary listening on ${host}:${port}`),
);

const close = async () => {
  await new Promise((done) => server.close(done));
  await vite.close();
};
process.on("SIGINT", () => void close().then(() => process.exit(0)));
process.on("SIGTERM", () => void close().then(() => process.exit(0)));
