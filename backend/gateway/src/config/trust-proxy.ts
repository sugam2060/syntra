/**
 * Parses `TRUST_PROXY` into the value Express expects for its `trust proxy` setting:
 * `false` (default, ignore `X-Forwarded-For`), `true` (trust every hop, only safe when the app
 * is reachable solely through the proxy), or a hop count such as `1` for one load balancer.
 */
export function parseTrustProxy(raw: string | undefined): boolean | number {
  const value = (raw ?? '').trim().toLowerCase();
  if (value === '' || value === 'false') return false;
  if (value === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  throw new Error(`Invalid TRUST_PROXY value "${raw}": use true, false or a hop count`);
}
