const EXCLUDED_METHOD_PATHS: Array<{ method: string; path: string }> = [
  { method: 'GET', path: 'api/v1/auth/me' },
  { method: 'GET', path: 'api/v1/profile' },
  { method: '*', path: 'api/v1/user-action-logs' },
  { method: '*', path: 'api/v1/auth/refresh' },
];

function normalizePath(path: string): string {
  return path.split('?')[0].replace(/^\/+/, '');
}

export function shouldLogHttpRequest(method: string, url: string): boolean {
  const verb = method.toUpperCase();
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(verb)) {
    return false;
  }

  const path = normalizePath(url);
  for (const rule of EXCLUDED_METHOD_PATHS) {
    const methodOk = rule.method === '*' || rule.method === verb;
    const pathOk =
      path === rule.path || path.startsWith(`${rule.path}/`);
    if (methodOk && pathOk) {
      return false;
    }
  }

  return true;
}

export function resolveHttpAction(method: string, url: string): string {
  const verb = method.toLowerCase();
  const path = normalizePath(url)
    .replace(/^api\/v1\//, '')
    .replace(/\//g, '.');

  const action = `http.${verb}.${path}`;
  return action.length > 100 ? action.slice(0, 100) : action;
}

export function resolveHttpDescription(method: string, url: string): string {
  return `${method.toUpperCase()} /${normalizePath(url)}`;
}
