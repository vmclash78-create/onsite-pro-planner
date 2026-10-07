export const pageHead = (titulo: string, descricao: string) => () => ({
  meta: [
    { title: `${titulo} — VM Climatização & Acabamentos` },
    { name: "description", content: descricao },
    { property: "og:title", content: `${titulo} — VM Climatização & Acabamentos` },
    { property: "og:description", content: descricao },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
