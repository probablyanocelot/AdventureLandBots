const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 4173;
const ROOT = path.resolve(__dirname, "../browser");

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function safePathname(urlPath) {
  const normalized = path
    .normalize(decodeURIComponent(urlPath))
    .replace(/^([.][.][/\\])+/, "");
  return normalized === path.sep ? "" : normalized;
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      res.end(err.code === "ENOENT" ? "Not Found" : "Server Error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(
    req.url || "/",
    `http://${req.headers.host || `localhost:${PORT}`}`,
  );
  const rawPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const relativePath = safePathname(rawPath);
  const filePath = path.resolve(ROOT, `.${path.sep}${relativePath}`);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  sendFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Browser bootstrap page: http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop.");
});
