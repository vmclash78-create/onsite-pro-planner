import { expect, it } from "vitest";
import { authorizedUpload, hashUploadProof } from "@/lib/upload-authorization";

it("stores a deterministic SHA-256 hash rather than the raw proof", async () => {
  expect(await hashUploadProof("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
it("accepts only the complete authorized photo set and valid proof before expiry", () => {
  const ticket = { proof_hash: "hash", paths: ["site/a/0.jpg", "site/a/1.jpg"], expires_at: "2026-10-17T21:00:00Z" };
  const now = Date.parse("2026-10-17T20:00:00Z");
  expect(authorizedUpload(ticket, "hash", ticket.paths, now)).toBe(true);
  expect(authorizedUpload(ticket, "wrong", ticket.paths, now)).toBe(false);
  expect(authorizedUpload(ticket, "hash", ["site/b/0.jpg", "site/b/1.jpg"], now)).toBe(false);
  expect(authorizedUpload(ticket, "hash", ["site/a/0.jpg"], now)).toBe(false);
  expect(authorizedUpload(ticket, "hash", ["site/a/0.jpg", "site/a/0.jpg"], now)).toBe(false);
  expect(authorizedUpload(ticket, "hash", ticket.paths, Date.parse(ticket.expires_at))).toBe(false);
});