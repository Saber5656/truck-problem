import { createDecisionMiddleware } from './decision.mjs';

export function createLocalDecisionPlugin({ apiKey = '', fetchImpl = globalThis.fetch } = {}) {
  const attach = (port) => (server) => {
    server.middlewares.use(createDecisionMiddleware({
      apiKey,
      fetchImpl,
      allowedHosts: [`127.0.0.1:${port}`, `localhost:${port}`],
    }));
  };
  return {
    name: 'local-typesafe-api',
    configureServer: attach(5173),
    configurePreviewServer: attach(4174),
  };
}
