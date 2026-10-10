/**
 * Every address the router answers (src/app/App.tsx). The helper only turns a "[[go:/route|Label]]"
 * link into a button when the path is in this list; knownRoutes.test.ts compares it with App.tsx so
 * the two cannot drift apart.
 */
export const KNOWN_ROUTES: readonly string[] = [
  '/',
  '/sourcing',
  '/commercial',
  '/desk',
  '/scanner',
  '/brief',
  '/map',
  '/pricing',
  '/marks',
  '/plants',
  '/plants/pipeline',
  '/origination',
  '/registries',
  '/data-sources',
  '/provenance',
  '/fueleu-shipping',
  '/fueleu',
  '/shipping',
  '/ets2',
  '/corporate',
  '/value-stack',
  '/clients',
  '/trade',
  '/deals',
  '/risk',
  '/library',
  '/citations',
  '/connectors',
  '/settings',
  '/assumptions',
  '/regulation-check',
  '/glossary',
  '/ask',
];

const KNOWN = new Set(KNOWN_ROUTES);

/** Characters allowed in a link's query string: enough for ?tab=costs&marketId=NL_GGE, nothing that could carry markup. */
const SAFE_QUERY = /^\?[A-Za-z0-9_=&.,:%+-]{0,200}$/;

export interface GoTarget {
  /** Path plus query, ready for navigate(). */
  to: string;
  path: string;
}

/** A router target if the path exists and the query is plain; otherwise null. */
export function resolveGoTarget(raw: string): GoTarget | null {
  const trimmed = raw.trim();
  const qIndex = trimmed.indexOf('?');
  const path = qIndex === -1 ? trimmed : trimmed.slice(0, qIndex);
  const query = qIndex === -1 ? '' : trimmed.slice(qIndex);
  if (!path.startsWith('/') || !KNOWN.has(path)) return null;
  if (query && !SAFE_QUERY.test(query)) return null;
  return { to: `${path}${query}`, path };
}
