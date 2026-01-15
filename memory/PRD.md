# EcoGuard - Sistema de Auto-Fiscalização Ambiental

## Visão Geral do Produto
EcoGuard é uma plataforma completa para gestão de conformidade ambiental, permitindo empresas realizarem auto-fiscalização preventiva e gerenciarem suas licenças ambientais.

## Requisitos Principais

### 1. Gestão de Empresas
- ✅ CRUD completo de empresas/empreendimentos
- ✅ Tipos: Matriz (apenas 1 permitida) ou Filial
- ✅ Campos: Nome, CNPJ, Endereço, Cidade, Estado, Responsável, Telefone

### 2. Sistema de Tickets (Auto-Fiscalização)
- ✅ Cliente envia planta do estabelecimento → cria ticket
- ✅ Gestor (souzaenakhle@gmail.com) mapeia áreas críticas na planta
- ✅ Cliente envia fotos das áreas marcadas
- ✅ Gestor analisa conformidade e finaliza
- ✅ Bloqueio de nova inspeção até finalizar a atual
- ✅ Notificações por email em cada mudança de status (Resend API)

### 3. Gestão de Licenças
- ✅ CRUD de licenças ambientais
- ✅ Campos: Nome, Número, Tipo, Órgão Emissor, Datas, Alertas
- ✅ Status automático: válida, a_vencer, vencida
- ✅ Dashboard de indicadores

### 4. Condicionantes
- ✅ CRUD de condicionantes por licença
- ✅ Acompanhamento de prazos e responsáveis

## Stack Tecnológica
- **Backend**: FastAPI + Python + Motor (MongoDB async)
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Database**: MongoDB
- **Auth**: Google OAuth via Emergent
- **Email**: Resend API

## Implementado em 15/01/2026
- Sistema de emails real com Resend API
- Fluxo completo de tickets de inspeção
- Gestão de empresas com validação Matriz/Filial
- Gestão de licenças e condicionantes
- Dashboard de indicadores

## Tarefas Futuras (Backlog)
- P1: Geração de relatório PDF para tickets finalizados
- P2: Dropdowns dependentes de Estados/Cidades brasileiros
- P2: Gráficos interativos no dashboard de licenças
- P2: Exclusão de tickets/inspeções antigas
- P3: Refatorar server.py em múltiplos arquivos (routers)
