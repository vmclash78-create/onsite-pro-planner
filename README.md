# Onsite Pro Planner

Crie um sistema SaaS em português (pt-BR) para empresas de serviços de refrigeração, gesso e elétrica. O sistema tem um painel interno para a empresa e uma página pública para clientes agendarem serviços.

CATEGORIAS DE SERVIÇO
Três categorias: Refrigeração, Gesso e Elétrica. Cada uma tem tipos de serviço próprios (ex.: refrigeração = instalação, limpeza, manutenção, conserto; gesso = forro, parede, sanca, reparo; elétrica = instalação, troca de quadro, ponto novo, reparo). Os campos do serviço mudam conforme a categoria.

AUTENTICAÇÃO E PAPÉIS
- Login por e-mail e senha.
- Dois papéis: admin (acesso total, gerencia técnicos e configurações) e técnico (vê apenas sua agenda e as ordens atribuídas a ele).
- Cada registro pertence a uma empresa (company_id), preparado para múltiplas empresas no futuro.

TELAS DO PAINEL
1. Dashboard: cards com agendamentos de hoje, orçamentos pendentes, ordens em andamento e concluídas no mês. Lista rápida dos próximos serviços.
2. Clientes: lista com busca e filtros. Ao abrir um cliente, mostrar dados de contato, locais cadastrados e histórico de serviços.
3. Locais: cada cliente pode ter vários endereços. Cada local tem itens: aparelhos de ar-condicionado (marca, modelo, BTU, data de instalação, último serviço), quadros ou pontos elétricos, e ambientes com metragem para gesso.
4. Orçamentos: criar orçamento com itens editáveis (material e mão de obra, quantidade, valor unitário), total calculado automaticamente, status (rascunho, enviado, aprovado, recusado). Botão para converter orçamento aprovado em ordem de serviço. Gerar link compartilhável do orçamento.
5. Agenda: visão diária e semanal, filtrada por técnico. Serviços de vários dias aparecem como bloco contínuo. Ao criar um agendamento, checar conflito de horário do técnico.
6. Ordens de serviço: status (agendada, em andamento, concluída, cancelada), técnico responsável, data, observações, fotos antes e depois, e registro no histórico do local ou item.
7. Equipe: cadastro de técnicos com nome, telefone e categorias em que atuam.
8. Lembretes: para aparelhos de refrigeração, indicar próxima manutenção preventiva com intervalo configurável (ex.: a cada 6 meses) e mostrar na dashboard os vencidos.

PÁGINA PÚBLICA DE AGENDAMENTO
Acessível sem login, com o nome e a identidade visual da empresa no topo. O cliente:
1. Escolhe a categoria e o tipo de serviço.
2. Preenche nome, telefone, e-mail, endereço e descrição do problema.
3. Pode anexar até 3 fotos.
4. Escolhe um horário disponível ou pede uma visita para orçamento.
5. Recebe uma tela de confirmação com o resumo do pedido.
O pedido entra no painel como agendamento pendente, para o admin confirmar.

REQUISITOS TÉCNICOS
- Banco de dados no Supabase com RLS ativo em todas as tabelas. Clientes anônimos só podem criar pedidos pela página pública, nunca ler dados de outras empresas.
- Tabelas sugeridas: companies, profiles, technicians, clients, locations, equipment, service_types, quotes, quote_items, appointments, service_orders, service_history, photos.
- Layout responsivo, pensado para uso pelo celular pelos técnicos em campo.
- Visual limpo e profissional, com cores neutras e um azul como destaque. Fontes legíveis.
- Datas e moedas no formato brasileiro (dd/mm/aaaa e R$).

Comece criando a estrutura de navegação, a dashboard com dados de exemplo e o layout geral. Depois implementaremos as demais telas uma por vez.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://onsite-pro-planner.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ad836be1-6b27-4ef5-b06f-0281e0bb5dd7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
