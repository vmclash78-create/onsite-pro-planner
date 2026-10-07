create type public.app_role as enum ('admin', 'tecnico');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text,
  telefone text,
  especialidade text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id) $$;

create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_staff(auth.uid()) or id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "read own roles or admin" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin insert roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin delete roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text,
  email text,
  documento text,
  observacoes text,
  created_at timestamptz not null default now()
);
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  apelido text not null default 'Principal',
  endereco text not null,
  bairro text,
  cidade text not null default 'Hidrolândia/CE',
  cep text,
  created_at timestamptz not null default now()
);
create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  descricao text not null,
  ultima_manutencao date,
  intervalo_meses int not null default 6,
  created_at timestamptz not null default now()
);
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  tecnico_id uuid references public.profiles(id) on delete set null,
  nome_contato text not null,
  whatsapp text not null,
  cep text,
  endereco text,
  categoria text not null check (categoria in ('Refrigeração','Gesso','Elétrica')),
  tipo text not null,
  data date,
  hora text,
  visita_orcamento boolean not null default false,
  descricao text,
  fotos text[] not null default '{}',
  status text not null default 'Pendente' check (status in ('Pendente','Agendada','Em andamento','Concluída','Cancelada')),
  origem text not null default 'painel',
  ia_tipo text,
  ia_urgencia text,
  ia_justificativa text,
  ia_proximos_passos jsonb,
  ia_analisado_em timestamptz,
  created_at timestamptz not null default now()
);
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  numero serial,
  client_id uuid not null references public.clients(id) on delete cascade,
  descricao text not null,
  valor numeric(12,2) not null default 0,
  status text not null default 'Aguardando' check (status in ('Rascunho','Aguardando','Aprovado','Recusado')),
  enviado_em date default current_date,
  created_at timestamptz not null default now()
);
create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  numero serial,
  client_id uuid not null references public.clients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  tecnico_id uuid references public.profiles(id) on delete set null,
  categoria text not null check (categoria in ('Refrigeração','Gesso','Elétrica')),
  descricao text not null,
  status text not null default 'Aberta' check (status in ('Aberta','Em andamento','Concluída','Cancelada')),
  valor numeric(12,2),
  inicio date default current_date,
  concluida_em date,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.clients, public.locations, public.equipment, public.appointments, public.quotes, public.service_orders to authenticated;
grant all on public.clients, public.locations, public.equipment, public.appointments, public.quotes, public.service_orders to service_role;
grant usage on all sequences in schema public to authenticated, service_role;
alter table public.clients enable row level security;
alter table public.locations enable row level security;
alter table public.equipment enable row level security;
alter table public.appointments enable row level security;
alter table public.quotes enable row level security;
alter table public.service_orders enable row level security;
create policy "staff all" on public.clients for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "staff all" on public.locations for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "staff all" on public.equipment for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "staff all" on public.appointments for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "staff all" on public.quotes for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "staff all" on public.service_orders for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy "staff read pedidos" on storage.objects for select to authenticated using (bucket_id = 'pedidos' and public.is_staff(auth.uid()));
create policy "staff write pedidos" on storage.objects for insert to authenticated with check (bucket_id = 'pedidos' and public.is_staff(auth.uid()));
create policy "staff delete pedidos" on storage.objects for delete to authenticated using (bucket_id = 'pedidos' and public.is_staff(auth.uid()));

insert into public.clients (id, nome, whatsapp, email) values
 ('00000000-0000-0000-0000-000000000001','Francisca Holanda','(85) 98811-2034',null),
 ('00000000-0000-0000-0000-000000000002','Padaria Pão Dourado','(85) 99702-1188','contato@paodourado.com.br'),
 ('00000000-0000-0000-0000-000000000003','José Wellington Rocha','(85) 98620-4471',null),
 ('00000000-0000-0000-0000-000000000004','Clínica Odonto Vida','(85) 3261-7788','adm@odontovida.com.br'),
 ('00000000-0000-0000-0000-000000000005','Antônia Sampaio','(88) 99631-5520',null),
 ('00000000-0000-0000-0000-000000000006','Mercadinho São José','(88) 99640-8812',null);
insert into public.locations (id, client_id, apelido, endereco, bairro, cidade) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Casa','Rua Tibúrcio Cavalcante, 1820','Aldeota','Fortaleza/CE'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','Loja','Av. Bezerra de Menezes, 2210','São Gerardo','Fortaleza/CE'),
 ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','Apartamento','Rua Pe. Valdevino, 455','Joaquim Távora','Fortaleza/CE'),
 ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000004','Clínica','Av. Santos Dumont, 3131','Papicu','Fortaleza/CE'),
 ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000005','Casa','Rua Cel. Alexanzito, 88','Centro','Hidrolândia/CE'),
 ('10000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000006','Mercado','Rua Aniceta Ferreira, 410','Centro','Hidrolândia/CE');
insert into public.equipment (location_id, descricao, ultima_manutencao, intervalo_meses) values
 ('10000000-0000-0000-0000-000000000004','Split Samsung 12.000 BTU — consultório 1', current_date - 215, 6),
 ('10000000-0000-0000-0000-000000000004','Split Samsung 12.000 BTU — consultório 2', current_date - 200, 6),
 ('10000000-0000-0000-0000-000000000001','Split Midea 9.000 BTU — quarto', current_date - 190, 6),
 ('10000000-0000-0000-0000-000000000006','Cassete LG 36.000 BTU — salão', current_date - 90, 6);
insert into public.appointments (client_id, location_id, nome_contato, whatsapp, endereco, categoria, tipo, data, hora, descricao, status, origem) values
 ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Francisca Holanda','(85) 98811-2034','Rua Tibúrcio Cavalcante, 1820 — Aldeota','Refrigeração','Limpeza',current_date,'08:00','Limpeza de split 12.000 BTU','Concluída','painel'),
 ('00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Padaria Pão Dourado','(85) 99702-1188','Av. Bezerra de Menezes, 2210 — São Gerardo','Elétrica','Quadro',current_date,'09:00','Troca de quadro de distribuição','Em andamento','painel'),
 ('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003','José Wellington Rocha','(85) 98620-4471','Rua Pe. Valdevino, 455 — Joaquim Távora','Gesso','Forro',current_date,'10:00','Forro em drywall na sala','Agendada','painel'),
 ('00000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000004','Clínica Odonto Vida','(85) 3261-7788','Av. Santos Dumont, 3131 — Papicu','Refrigeração','Manutenção',current_date,'14:00','Manutenção preventiva — 2 aparelhos','Agendada','painel'),
 ('00000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000005','Antônia Sampaio','(88) 99631-5520','Rua Cel. Alexanzito, 88 — Centro, Hidrolândia','Elétrica','Ponto novo',current_date,'15:00','Ponto novo de tomada 220V na cozinha','Agendada','painel'),
 (null,null,'Raimundo Nonato Lima','(88) 99712-3340','CEP 62270-000','Refrigeração','Conserto',current_date + 1,'08:00','Ar-condicionado parou de gelar e está pingando água dentro do quarto.','Pendente','site');
insert into public.quotes (client_id, descricao, valor, status, enviado_em) values
 ('00000000-0000-0000-0000-000000000006','Instalação de 2 splits 18.000 BTU',4280,'Aguardando',current_date - 6),
 ('00000000-0000-0000-0000-000000000001','Sanca de gesso com iluminação — sala',2150,'Aguardando',current_date - 3),
 ('00000000-0000-0000-0000-000000000004','Revisão elétrica completa',1890,'Aguardando',current_date - 2),
 ('00000000-0000-0000-0000-000000000003','Conserto de split — vazamento de gás',480,'Aguardando',current_date - 1),
 ('00000000-0000-0000-0000-000000000002','Iluminação da vitrine',950,'Aprovado',current_date - 12);
insert into public.service_orders (client_id, categoria, descricao, status, valor, inicio, concluida_em) values
 ('00000000-0000-0000-0000-000000000002','Elétrica','Troca de quadro de distribuição','Em andamento',1350,current_date,null),
 ('00000000-0000-0000-0000-000000000003','Gesso','Forro em drywall — sala e corredor (3 dias)','Em andamento',3200,current_date - 1,null),
 ('00000000-0000-0000-0000-000000000004','Refrigeração','Manutenção preventiva','Em andamento',600,current_date,null),
 ('00000000-0000-0000-0000-000000000001','Refrigeração','Limpeza de split','Concluída',180,current_date,current_date),
 ('00000000-0000-0000-0000-000000000005','Elétrica','Troca de chuveiro','Concluída',120,current_date - 5,current_date - 5),
 ('00000000-0000-0000-0000-000000000006','Refrigeração','Instalação split 12.000 BTU','Concluída',650,current_date - 9,current_date - 9);
