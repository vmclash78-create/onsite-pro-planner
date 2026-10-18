/** Keep the editor iframe and OAuth popups working while tightening browser defaults. */
export function comCabecalhosSeguranca(response: Response, request: Request): Response {
  if (response.status === 101) return response;
  const headers = new Headers(response.headers);
  const defaults: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "Content-Security-Policy": "object-src 'none'; base-uri 'self'",
  };
  if (new URL(request.url).protocol === "https:") defaults["Strict-Transport-Security"] = "max-age=31536000";
  for (const [key, value] of Object.entries(defaults)) if (!headers.has(key)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}