import http from 'node:http';
import { handleApiRequest } from './apiServer';
import { attachWebSocketServer } from './wsServer';

export function createStandaloneServer(port = 4201): http.Server {
  const server = http.createServer(async (req, res) => {
    const handled = await handleApiRequest(req, res);
    if (!handled) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  });

  attachWebSocketServer(server);
  return server;
}

if (process.argv[1] && process.argv[1].endsWith('standalone.ts')) {
  const port = parseInt(process.env.PORT || '4201', 10);
  const server = createStandaloneServer(port);
  server.listen(port, () => {
    console.log(`[Biomethane Desk API] Standalone server running on http://localhost:${port}`);
  });
}
