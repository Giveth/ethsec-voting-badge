import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";

export async function buildServer() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: process.env.CORS_ALLOWED_ORIGIN ?? true });
  await app.register(rateLimit, { max: 60, timeWindow: "1 minute" });
  app.get("/health", async () => ({ ok: true }));
  return app;
}

import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3001);
  const app = await buildServer();
  app.listen({ port, host: "0.0.0.0" });
}
