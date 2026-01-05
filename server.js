const http = require("http");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const dev = false;

const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    http
      .createServer((req, res) => handle(req, res))
      .listen(port, "0.0.0.0", () => {
        console.log(`Next.js running on port ${port}`);
      });
  })
  .catch((err) => {
    console.error("Failed to start Next.js:", err);
    process.exit(1);
  });
