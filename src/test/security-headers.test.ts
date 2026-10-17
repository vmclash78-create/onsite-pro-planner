import { expect, it } from "vitest";
import { comCabecalhosSeguranca } from "@/lib/security-headers";

it("protege respostas HTTPS preservando corpo, status e cookies", async () => {
  const r = comCabecalhosSeguranca(new Response("ok", { status: 201, headers: { "set-cookie": "example=1; HttpOnly" } }), new Request("https://example.com"));
  expect(r.status).toBe(201);
  expect(await r.text()).toBe("ok");
  expect(r.headers.get("set-cookie")).toBe("example=1; HttpOnly");
  expect(r.headers.get("x-content-type-options")).toBe("nosniff");
  expect(r.headers.get("content-security-policy")).toBe("object-src 'none'; base-uri 'self'");
  expect(r.headers.get("strict-transport-security")).toBe("max-age=31536000");
});
it("preserva políticas existentes e não envia HSTS em HTTP", () => {
  const r = comCabecalhosSeguranca(new Response("", { headers: { "content-security-policy": "default-src 'self'" } }), new Request("http://localhost:8080"));
  expect(r.headers.get("content-security-policy")).toBe("default-src 'self'");
  expect(r.headers.has("strict-transport-security")).toBe(false);
});