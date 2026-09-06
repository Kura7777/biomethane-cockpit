import type { Plugin, ViteDevServer, PreviewServer } from 'vite';
import { handleApiRequest } from './apiServer';
import { attachWebSocketServer } from './wsServer';

export function apiServerPlugin(): Plugin {
  const attachMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url && req.url.startsWith('/api/v1')) {
        const handled = await handleApiRequest(req, res);
        if (handled) return;
      }
      next();
    });

    if (server.httpServer) {
      attachWebSocketServer(server.httpServer);
    }
  };

  return {
    name: 'vite-plugin-biomethane-api-server',
    configureServer(server) {
      attachMiddleware(server);
    },
    configurePreviewServer(server) {
      attachMiddleware(server);
    },
  };
}

