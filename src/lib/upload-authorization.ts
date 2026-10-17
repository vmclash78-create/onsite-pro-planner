export async function hashUploadProof(proof: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(proof));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function authorizedUpload(ticket: { proof_hash: string; paths: string[]; expires_at: string }, hash: string, paths: string[], now = Date.now()): boolean {
  return ticket.proof_hash === hash && Date.parse(ticket.expires_at) > now && paths.length > 0 && paths.length === ticket.paths.length && new Set(paths).size === paths.length && paths.every((p) => ticket.paths.includes(p));
}