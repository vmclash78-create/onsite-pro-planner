import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

// Privileged connection is used only by the test runner. All fixtures roll back.
const url = process.env["SUPABASE_DB_URL"];
const db = url ? postgres(url, { max: 1, prepare: false }) : null;
const stop = new Error("ROLLBACK_FIXTURES");
const admin = "e1400000-0000-4000-8000-000000000001";
const tech = "e1400000-0000-4000-8000-000000000002";
const other = "e1400000-0000-4000-8000-000000000003";

async function fixture(run: (sql: postgres.TransactionSql) => Promise<void>) {
  if (!db) throw new Error("SUPABASE_DB_URL is required for security integration tests");
  try {
    await db.begin(async (sql) => {
      for (const id of [admin, tech, other]) {
        await sql`insert into auth.users(id,email) values(${id},${`${id}@security.invalid`})`;
      }
      await sql`insert into public.user_roles(user_id,role) values(${admin},'admin'),(${tech},'tecnico'),(${other},'tecnico')`;
      await run(sql);
      throw stop;
    });
  } catch (e) { if (e !== stop) throw e; }
}

async function asTech(sql: postgres.TransactionSql) {
  await sql`select set_config('request.jwt.claim.sub',${tech},true)`;
  await sql.unsafe("set local role authenticated");
}

afterAll(async () => { await db?.end(); });

describe("Regras reais de segurança (sem persistir dados de teste)", () => {
  it("técnico lê apenas clientes ligados às próprias OS", async () => fixture(async (sql) => {
    const [mine] = await sql`insert into public.clients(nome) values('Teste próprio') returning id`;
    const [hidden] = await sql`insert into public.clients(nome) values('Teste outro') returning id`;
    await sql`insert into public.service_orders(client_id,tecnico_id,categoria,descricao) values(${mine.id},${tech},'Gesso','Teste'),(${hidden.id},${other},'Gesso','Teste')`;
    await asTech(sql);
    const rows = await sql`select id from public.clients where id in (${mine.id},${hidden.id})`;
    expect(rows.map((r) => r.id)).toEqual([mine.id]);
  }));
  it("técnico não cria clientes", async () => fixture(async (sql) => {
    await asTech(sql);
    await expect(sql.savepoint((s) => s`insert into public.clients(nome) values('Proibido')`)).rejects.toMatchObject({ code: "42501" });
  }));
  it("técnico não lê caixa nem orçamentos", async () => fixture(async (sql) => {
    const [c] = await sql`insert into public.clients(nome) values('Teste') returning id`;
    const [q] = await sql`insert into public.quotes(client_id,descricao) values(${c.id},'Teste') returning id`;
    const [f] = await sql`insert into public.financial_entries(tipo,descricao) values('Entrada','Teste') returning id`;
    await asTech(sql);
    expect(await sql`select id from public.quotes where id=${q.id}`).toHaveLength(0);
    expect(await sql`select id from public.financial_entries where id=${f.id}`).toHaveLength(0);
  }));
  it("técnico não altera valor nem garantia da própria OS", async () => fixture(async (sql) => {
    const [c] = await sql`insert into public.clients(nome) values('Teste') returning id`;
    const [o] = await sql`insert into public.service_orders(client_id,tecnico_id,categoria,descricao,valor) values(${c.id},${tech},'Gesso','Teste',100) returning id`;
    await asTech(sql);
    await expect(sql.savepoint((s) => s`update public.service_orders set valor=1 where id=${o.id}`)).rejects.toThrow('administradores');
    await expect(sql.savepoint((s) => s`update public.service_orders set garantia_dias=365 where id=${o.id}`)).rejects.toThrow('administradores');
  }));
  it("conclusão pelo técnico baixa estoque uma vez e impede manipulação do indicador", async () => fixture(async (sql) => {
    const [c] = await sql`insert into public.clients(nome) values('Teste') returning id`;
    const [o] = await sql`insert into public.service_orders(client_id,tecnico_id,categoria,descricao) values(${c.id},${tech},'Gesso','Teste') returning id`;
    const [item] = await sql`insert into public.stock_items(nome,quantidade) values('Teste',10) returning id`;
    await sql`insert into public.service_order_items(service_order_id,stock_item_id,quantidade) values(${o.id},${item.id},2)`;
    await asTech(sql);
    await expect(sql.savepoint((s) => s`update public.service_orders set estoque_baixado=true where id=${o.id}`)).rejects.toThrow('administradores');
    await sql`update public.service_orders set status='Concluída' where id=${o.id}`;
    await sql`update public.service_orders set status='Concluída' where id=${o.id}`;
    const [stock] = await sql`select quantidade from public.stock_items where id=${item.id}`;
    expect(Number(stock.quantidade)).toBe(8);
  }));
  it("técnico não consulta fotos de outra ordem ou identidade", async () => fixture(async (sql) => {
    const [c] = await sql`insert into public.clients(nome) values('Teste') returning id`;
    const [o] = await sql`insert into public.service_orders(client_id,tecnico_id,categoria,descricao) values(${c.id},${other},'Gesso','Teste') returning id`;
    await asTech(sql);
    const [r] = await sql`select public.pode_acessar_foto(${`os/${o.id}/antes.jpg`},false) allowed, public.tecnico_da_os(${other},${o.id}) probe`;
    expect(r.allowed).toBe(false); expect(r.probe).toBe(false);
  }));
  it("pedido aceita no máximo 3 fotos", async () => fixture(async (sql) => {
    await expect(sql.savepoint((s) => s`insert into public.appointments(nome_contato,whatsapp,categoria,tipo,fotos) values('Teste','(88) 99999-9999','Gesso','Reparo',array['a','b','c','d'])`)).rejects.toMatchObject({ code: "23514" });
  }));
  it("serviço longo bloqueia todos os horários do período", async () => fixture(async (sql) => {
    await sql`insert into public.appointments(nome_contato,whatsapp,categoria,tipo,data,hora,origem) values('Teste','(88) 99999-9999','Refrigeração','Instalação','2099-01-05','08:00','site')`;
    await expect(sql.savepoint((s) => s`insert into public.appointments(nome_contato,whatsapp,categoria,tipo,data,hora,origem) values('Teste','(88) 99999-9999','Gesso','Reparo','2099-01-05','10:00','site')`)).rejects.toThrow('HORARIO_OCUPADO');
  }));
  it("não permite remover o último administrador", async () => fixture(async (sql) => {
    await sql`delete from public.user_roles where role='admin' and user_id<>${admin}`;
    await expect(sql.savepoint((s) => s`delete from public.user_roles where user_id=${admin} and role='admin'`)).rejects.toThrow('último administrador');
  }));
});