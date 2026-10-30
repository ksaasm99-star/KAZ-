type RequestWithHeaders = {
  headers?: Record<string, string | string[] | undefined>;
};

declare const process: { env: Record<string, string | undefined> };

function headerValue(request: RequestWithHeaders, name: string): string {
  const headers = request.headers ?? {};
  const value = headers[name.toLowerCase()] ?? headers[name];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function constantTimeEqual(left: string, right: string): boolean {
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export function requireOwnerToken(request: RequestWithHeaders): boolean {
  const configuredToken = process.env.KAZ_OWNER_TOKEN?.trim() ?? "";
  if (!configuredToken) return false;
  const authorization = headerValue(request, "authorization").trim();
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const suppliedToken = match?.[1]?.trim() ?? "";
  return constantTimeEqual(suppliedToken, configuredToken);
}
