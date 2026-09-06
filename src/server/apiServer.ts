import type { IncomingMessage, ServerResponse } from 'node:http';
import { dealLedger } from './dealLedger';
import { marksLedger } from './marksLedger';
import { authService } from './authService';
import { Role } from '../domain/auth/types';
import { DealStatus } from '../domain/deals/types';

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const json = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(json);
}

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';
  const method = req.method?.toUpperCase() || 'GET';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return true;
  }

  // Only handle /api/v1 routes
  if (!url.startsWith('/api/v1')) {
    return false;
  }

  const [pathPart, queryPart] = url.split('?');
  const path = pathPart.replace(/\/+$/, ''); // Strip trailing slashes
  const queryParams = new URLSearchParams(queryPart || '');

  try {
    // -------------------------------------------------------------
    // DEALS LEDGER ENDPOINTS
    // -------------------------------------------------------------
    // 1. GET /api/v1/deals
    if (method === 'GET' && path === '/api/v1/deals') {
      const status = queryParams.get('status') as any;
      const marketId = queryParams.get('marketId') || undefined;
      const originCountry = queryParams.get('originCountry') || undefined;
      const searchQuery = queryParams.get('q') || undefined;

      const deals = dealLedger.getDeals({
        status: status || undefined,
        marketId,
        originCountry,
        searchQuery,
      });
      sendJson(res, 200, { success: true, count: deals.length, deals });
      return true;
    }

    // 2. POST /api/v1/deals
    if (method === 'POST' && path === '/api/v1/deals') {
      const body = await parseJsonBody(req);
      const actor = body.actor || authService.getSession().user.name;
      const actorRole = (body.actorRole || authService.getSession().activeRole) as Role;
      const note = body.note;

      const created = dealLedger.createDeal(body.deal || body, actor, actorRole, note);
      sendJson(res, 201, { success: true, deal: created });
      return true;
    }

    // 3. GET /api/v1/deals/:id/audit
    const auditMatch = path.match(/^\/api\/v1\/deals\/([^/]+)\/audit$/);
    if (method === 'GET' && auditMatch) {
      const dealId = decodeURIComponent(auditMatch[1]);
      const audit = dealLedger.getDealAudit(dealId);
      sendJson(res, 200, { success: true, dealId, audit });
      return true;
    }

    // 4. POST /api/v1/deals/:id/transition
    const transitionMatch = path.match(/^\/api\/v1\/deals\/([^/]+)\/transition$/);
    if (method === 'POST' && transitionMatch) {
      const dealId = decodeURIComponent(transitionMatch[1]);
      const body = await parseJsonBody(req);
      const newStatus = body.status as DealStatus;
      const actor = body.actor || authService.getSession().user.name;
      const actorRole = (body.actorRole || authService.getSession().activeRole) as Role;
      const note = body.note || '';

      if (!newStatus) {
        sendJson(res, 400, { success: false, error: 'Missing target "status" in request body' });
        return true;
      }

      const result = dealLedger.transitionDeal(dealId, newStatus, actor, actorRole, note);
      if (!result.success) {
        sendJson(res, 400, { success: false, error: result.error });
      } else {
        sendJson(res, 200, { success: true, deal: result.deal });
      }
      return true;
    }

    // 5. GET /api/v1/deals/:id
    const dealMatch = path.match(/^\/api\/v1\/deals\/([^/]+)$/);
    if (method === 'GET' && dealMatch) {
      const dealId = decodeURIComponent(dealMatch[1]);
      const deal = dealLedger.getDealById(dealId);
      if (!deal) {
        sendJson(res, 404, { success: false, error: `Deal ${dealId} not found` });
      } else {
        sendJson(res, 200, { success: true, deal });
      }
      return true;
    }

    // -------------------------------------------------------------
    // MARKS ENDPOINTS
    // -------------------------------------------------------------
    // 6. GET /api/v1/marks
    if (method === 'GET' && path === '/api/v1/marks') {
      const marks = marksLedger.getMarks();
      sendJson(res, 200, { success: true, marks });
      return true;
    }

    // 7. POST /api/v1/marks
    if (method === 'POST' && path === '/api/v1/marks') {
      const body = await parseJsonBody(req);
      const updated = marksLedger.saveMarks(body.marks || body);
      sendJson(res, 200, { success: true, marks: updated });
      return true;
    }

    // 8. GET /api/v1/marks/audit
    if (method === 'GET' && path === '/api/v1/marks/audit') {
      const history = marksLedger.getAuditHistory();
      sendJson(res, 200, { success: true, count: history.length, history });
      return true;
    }

    // 9. POST /api/v1/marks/audit
    if (method === 'POST' && path === '/api/v1/marks/audit') {
      const body = await parseJsonBody(req);
      if (body.record) {
        marksLedger.appendAuditRecord(body.record);
      } else {
        marksLedger.appendAuditRecord(body);
      }
      sendJson(res, 201, { success: true });
      return true;
    }

    // -------------------------------------------------------------
    // AUTH ENDPOINTS
    // -------------------------------------------------------------
    // 10. GET /api/v1/auth/session
    if (method === 'GET' && path === '/api/v1/auth/session') {
      const session = authService.getSession();
      sendJson(res, 200, { success: true, session });
      return true;
    }

    // 11. POST /api/v1/auth/role
    if (method === 'POST' && path === '/api/v1/auth/role') {
      const body = await parseJsonBody(req);
      const role = body.role as Role;
      if (!role) {
        sendJson(res, 400, { success: false, error: 'Missing "role" parameter' });
        return true;
      }
      const updatedSession = authService.switchRole(role);
      sendJson(res, 200, { success: true, session: updatedSession });
      return true;
    }

    // 12. GET /api/v1/auth/roles
    if (method === 'GET' && path === '/api/v1/auth/roles') {
      const roles = authService.getRoles();
      sendJson(res, 200, { success: true, roles });
      return true;
    }

    // 404 for unknown /api/v1 paths
    sendJson(res, 404, { success: false, error: `Endpoint ${method} ${path} not found` });
    return true;
  } catch (err: any) {
    console.error('API Server Error:', err);
    sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
    return true;
  }
}
