export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Parses "AAAA-MM-DD" as a local date (avoids the UTC off-by-one-day shift). */
const toDate = (d: Date | string) =>
  typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : new Date(d);

export const dataBR = (d: Date | string) =>
  toDate(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const horaBR = (d: Date | string) =>
  new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Local "AAAA-MM-DD" for a date (default: today). */
export const isoLocal = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const addDias = (iso: string, n: number) => {
  const d = toDate(iso);
  d.setDate(d.getDate() + n);
  return isoLocal(d);
};

export const diasEntre = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 864e5);
