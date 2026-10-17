/** Presentation access only; database policies remain the security boundary. */
export function canOpenPanel(path: string, isAdmin: boolean) {
  if (isAdmin) return true;
  return ["/inicio", "/agenda", "/ordens", "/ordem/", "/imprimir/ordem/", "/clientes", "/cliente/", "/pedidos/", "/mais"].some(
    (allowed) => allowed.endsWith("/") ? path.startsWith(allowed) : path === allowed,
  );
}

export function canSeeNav(path: string, isAdmin: boolean) {
  return isAdmin || ["/inicio", "/agenda", "/ordens", "/clientes"].includes(path);
}