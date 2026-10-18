import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/integrations/supabase/types";

const url = process.env["SUPABASE_URL"];
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const publicKey = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_ANON_KEY"];
if (!url || !key || !publicKey) throw new Error("Security tests require server credentials");
const service = createClient<Database>(url, key, { auth: { persistSession: false } });
const technician = createClient<Database>(url, publicKey, { auth: { persistSession: false } });
const users: string[] = [];
let ownClient = "", otherClient = "", ownOrder = "", otherOrder = "", ownStock = "";
let technicianId = "", otherId = "", quoteId = "", entryId = "";
let bootstrapAdminId = "";
const appointments: string[] = [];

beforeAll(async () => {
  const password = crypto.randomUUID()+"Aa1";
  const bootstrap = await service.auth.admin.createUser({email:`reset-admin-${crypto.randomUUID()}@example.com`,password,email_confirm:true});
  if (bootstrap.error || !bootstrap.data.user) throw new Error("Could not create test admin");
  bootstrapAdminId = bootstrap.data.user.id;
  const bootstrapRole = await service.from("user_roles").upsert({user_id:bootstrapAdminId,role:"admin"},{onConflict:"user_id,role"});
  if (bootstrapRole.error) throw bootstrapRole.error;
  for (let n=0; n<2; n++) {
    const email = `security-${crypto.randomUUID()}@example.com`;
    const {data,error} = await service.auth.admin.createUser({email,password,email_confirm:true});
    if (error || !data.user) throw new Error("Could not create security test account");
    users.push(data.user.id);
    if (n===0) { technicianId=data.user.id; const login=await technician.auth.signInWithPassword({email,password}); if(login.error) throw new Error("Could not sign in test technician"); }
    else otherId=data.user.id;
    const role=await service.from("user_roles").insert({user_id:data.user.id,role:"tecnico"}); if(role.error) throw role.error;
  }
  for (const [who,label] of [[technicianId,"own"],[otherId,"other"]] as const) {
    const c=await service.from("clients").insert({nome:`Security test ${label}`}).select("id").single(); if(c.error) throw c.error;
    const o=await service.from("service_orders").insert({client_id:c.data.id,tecnico_id:who,categoria:"Gesso",descricao:"Security test",valor:100}).select("id").single(); if(o.error) throw o.error;
    if(label==="own") {ownClient=c.data.id;ownOrder=o.data.id;} else {otherClient=c.data.id;otherOrder=o.data.id;}
  }
  const s=await service.from("stock_items").insert({nome:"Security test",quantidade:10}).select("id").single(); if(s.error) throw s.error; ownStock=s.data.id;
  const i=await service.from("service_order_items").insert({service_order_id:ownOrder,stock_item_id:ownStock,quantidade:2}); if(i.error) throw i.error;
  const q=await service.from("quotes").insert({client_id:ownClient,descricao:"Security test"}).select("id").single(); if(q.error) throw q.error; quoteId=q.data.id;
  const f=await service.from("financial_entries").insert({tipo:"Entrada",descricao:"Security test"}).select("id").single(); if(f.error) throw f.error; entryId=f.data.id;
}, 30000);

afterAll(async () => {
  if(ownOrder) await service.from("service_orders").update({status:"Aberta"}).eq("id",ownOrder);
  if(ownOrder) await service.from("service_order_items").delete().eq("service_order_id",ownOrder);
  if(quoteId) await service.from("quotes").delete().eq("id",quoteId);
  if(entryId) await service.from("financial_entries").delete().eq("id",entryId);
  for(const id of appointments) await service.from("appointments").delete().eq("id",id);
  for(const id of [ownOrder,otherOrder].filter(Boolean)) await service.from("service_orders").delete().eq("id",id);
  for(const id of [ownClient,otherClient].filter(Boolean)) await service.from("clients").delete().eq("id",id);
  if(ownStock) await service.from("stock_items").delete().eq("id",ownStock);
  for(const id of users) await service.auth.admin.deleteUser(id);
  if (bootstrapAdminId) {
    const removed = await service.auth.admin.deleteUser(bootstrapAdminId);
    expect(removed.error).toBeNull();
    const remaining = await service.from("user_roles").select("id").eq("user_id",bootstrapAdminId);
    expect(remaining.data).toEqual([]);
  }
},30000);

describe("Permissões reais pela API", () => {
  it("não permite apagar diretamente o papel do último administrador", async () => {
    const result = await service.from("user_roles").delete().eq("user_id",bootstrapAdminId).eq("role","admin");
    expect(result.error?.message).toContain("último administrador");
  });
  it("autorização de fotos é privada e consumida apenas uma vez", async () => {
    const ticket = await service.from("booking_upload_authorizations").insert({ proof_hash: "security-test", paths: ["site/test/0.jpg"] }).select("id").single();
    if (ticket.error || !ticket.data) throw new Error("Could not prepare upload authorization test");
    const id = ticket.data.id;
    try {
      const hidden = await technician.from("booking_upload_authorizations").select("id").eq("id", id);
      expect(hidden.error?.code).toBe("42501");
      const consume = () => service.from("booking_upload_authorizations").delete().eq("id", id).eq("proof_hash", "security-test").select("id");
      const results = await Promise.all([consume(), consume()]);
      expect(results.every((r) => !r.error)).toBe(true);
      expect(results.flatMap((r) => r.data ?? [])).toHaveLength(1);
    } finally {
      await service.from("booking_upload_authorizations").delete().eq("id", id);
    }
  });
  it("técnico lê apenas cliente da própria OS", async () => {
    const r=await technician.from("clients").select("id").in("id",[ownClient,otherClient]); expect(r.error).toBeNull(); expect(r.data?.map(x=>x.id)).toEqual([ownClient]);
  });
  it("técnico não cria clientes", async () => {
    const r=await technician.from("clients").insert({nome:"Proibido"}); expect(r.error?.code).toBe("42501");
  });
  it("técnico não lê caixa nem orçamentos", async () => {
    const q=await technician.from("quotes").select("id").eq("id",quoteId); const f=await technician.from("financial_entries").select("id").eq("id",entryId); expect(q.error).toBeNull();expect(f.error).toBeNull();expect(q.data).toEqual([]);expect(f.data).toEqual([]);
  });
  it("técnico não altera valor", async () => {const r=await technician.from("service_orders").update({valor:1}).eq("id",ownOrder);expect(r.error?.message).toContain("administradores");});
  it("técnico não altera garantia", async () => {const r=await technician.from("service_orders").update({garantia_dias:365}).eq("id",ownOrder);expect(r.error?.message).toContain("administradores");});
  it("técnico não manipula estoque_baixado", async () => {const r=await technician.from("service_orders").update({estoque_baixado:true}).eq("id",ownOrder);expect(r.error?.message).toContain("administradores");});
  it("concluir OS baixa estoque apenas uma vez", async () => {
    for(let n=0;n<2;n++){const r=await technician.from("service_orders").update({status:"Concluída"}).eq("id",ownOrder);expect(r.error).toBeNull();}
    const r=await service.from("stock_items").select("quantidade").eq("id",ownStock).single();expect(Number(r.data?.quantidade)).toBe(8);
  });
  it("técnico não consulta foto ou identidade de outro técnico", async () => {
    const r=await technician.rpc("pode_acessar_foto",{_path:`os/${otherOrder}/antes.jpg`,_escrever:false}); expect(r.error).toBeNull();expect(r.data).toBe(false);
    const p=await technician.rpc("tecnico_da_os",{_user:otherId,_os:otherOrder});expect(p.data).toBe(false);
  });
  it("pedido aceita no máximo 3 fotos", async () => {const r=await service.from("appointments").insert({nome_contato:"Teste",whatsapp:"(88) 99999-9999",categoria:"Gesso",tipo:"Reparo",fotos:["a","b","c","d"]});expect(r.error?.code).toBe("23514");});
  it("serviço longo impede reserva sobreposta", async () => {
    const base={nome_contato:"Security test",whatsapp:"(88) 99999-9999",data:"2099-01-05",origem:"site"};
    const a=await service.from("appointments").insert({...base,categoria:"Refrigeração",tipo:"Instalação",hora:"08:00"}).select("id").single();if(a.data)appointments.push(a.data.id);expect(a.error).toBeNull();
    const b=await service.from("appointments").insert({...base,categoria:"Gesso",tipo:"Reparo",hora:"10:00"}).select("id").single();if(b.data)appointments.push(b.data.id);expect(b.error?.message).toContain("HORARIO_OCUPADO");
  });
});
