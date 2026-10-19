/** Máscara de telefone BR: (88) 99640-1373. */
export const maskTel = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
};

/** Telefone válido tem DDD + 8 ou 9 dígitos. */
export const telefoneValido = (v: string) => {
  const n = v.replace(/\D/g, "").length;
  return n === 10 || n === 11;
};
