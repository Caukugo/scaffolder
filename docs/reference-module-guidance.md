# Guia do Módulo de Referência (Tasks) e Criação de Novos Módulos

Este documento explica como o módulo de referência pedagógica `tasks` está estruturado e fornece instruções detalhadas sobre como **estudar**, **renomear**, **remover** ou **criar novos módulos** sobre o template AppStart.

---

## 🏛️ Arquitetura do Módulo de Referência

O módulo `tasks` implementa um ciclo CRUD completo ponta a ponta com padrões de produção:

1. **Persistência (Prisma ORM & PostgreSQL):**
   - Entidade `Task` com chaves estrangeiras, índices e tipos enumerados (`TaskStatus`, `TaskPriority`).
   - Suporte a **Remoção Lógica (*Soft Delete*)** através do campo `deletedAt`.
   - Relação de propriedade com o perfil do usuário (`UserProfile`).

2. **Regras de Negócio e Autorização:**
   - **Controle de Propriedade (*Ownership*):** Usuários comuns (`USER`) só podem consultar, editar e excluir suas próprias tarefas. Usuários administradores (`ADMIN`) possuem visão global.
   - **Validação de Prazos:** A data limite (`dueDate`) não pode ser definida no passado na criação ou alteração.
   - **Transição de Estados:** Tarefas com status `COMPLETED` não podem ter títulos ou descrições alteradas sem antes serem reabertas (`PENDING` ou `IN_PROGRESS`).

3. **Contrato OpenAPI & Cliente Tipado:**
   - DTOs anotados com `@ApiProperty()` e `class-validator` em `apps/api/src/tasks/task.dto.ts`.
   - Geração automática de endpoints no cliente frontend via `pnpm api:generate` (Orval).

4. **Interface Web (React + TanStack Query):**
   - Listagem paginada com busca por texto, filtros de status/prioridade e ordenação sincronizados na URL.
   - Formulários com validação rigorosa usando **React Hook Form** e **Zod**.
   - Estados visuais completos: Carregamento (*Loading*), Vazio (*Empty*), Erro (*Error*) e Sucesso (*ActionFeedback*).

---

## 🏷️ Extensão do Módulo: Categorias de Tarefas

O módulo `categories` (`apps/api/src/categories/`) é um segundo módulo de domínio que se relaciona com `tasks` e demonstra como estender o template sem quebrar as fronteiras existentes:

1. **Persistência:**
   - Entidade `Category` com `ownerId`, `color` hexadecimal e remoção lógica (`deletedAt`).
   - `Task.categoryId` é uma FK **opcional** com `ON DELETE SET NULL`: excluir a categoria nunca apaga tarefas.
   - Migration versionada em `apps/api/prisma/migrations/20260928_task_categories/`.

2. **Regras de Negócio e Autorização:**
   - **Nome único por usuário:** duas categorias ativas do mesmo dono não podem ter o mesmo nome (comparação *case-insensitive*, resposta `409 Conflict`).
   - **Ownership:** um usuário só vê e altera as próprias categorias; `ADMIN` possui visão global.
   - **Remoção lógica com desvínculo:** ao excluir uma categoria, as tarefas ativas são desvinculadas (`categoryId = null`) na mesma transação.
   - **Categoria sempre do dono da tarefa:** ao criar ou editar uma tarefa, o `TasksService` chama `CategoriesService.resolveOwnedCategory()` para impedir o vínculo com categoria de outro usuário — inclusive quando quem edita é um `ADMIN`.

3. **Fronteira entre módulos:**
   - `TasksModule` importa `CategoriesModule` e recebe `CategoriesService` por injeção de dependência. O acoplamento fica em uma interface pública explícita, e não em consultas espalhadas pelo Prisma.

4. **Interface Web:**
   - Tela dedicada em `apps/web/src/pages/categories-page.tsx` (CRUD, contador de tarefas por categoria e seletor de cor).
   - Em `tasks-page.tsx`: seletor de categoria nos formulários, etiqueta colorida no cartão e filtro `categoryId` sincronizado na URL.
   - As mutações de categoria invalidam as queries `['categories']` e `['tasks']`, pois a tarefa exibe o rótulo da categoria.

---

## 🔄 Como Renomear o Módulo

Caso deseje transformar o módulo `tasks` em outro domínio (ex.: `projects`, `products`, `orders`):

1. **Renomear Entidade no Prisma:**
   - No arquivo `apps/api/prisma/schema.prisma`, renomeie o modelo `model Task` para `model Project`.
   - Crie uma migration versionada e aplique com `pnpm db:migrate`.
   - Execute `pnpm --dir apps/api exec prisma generate --schema prisma/schema.prisma`.

2. **Renomear Módulo no Backend:**
   - Renomeie o diretório `apps/api/src/tasks/` para `apps/api/src/projects/`.
   - Atualize os nomes das classes (`ProjectsModule`, `ProjectsController`, `ProjectsService`, `CreateProjectDto`).
   - Atualize a importação em `apps/api/src/app.module.ts`.

3. **Regenerar Contrato e Cliente:**
   - Execute `pnpm api:generate`.

4. **Renomear Página no Frontend:**
   - Renomeie `apps/web/src/pages/tasks-page.tsx` para `apps/web/src/pages/projects-page.tsx`.
   - Atualize as rotas em `apps/web/src/App.tsx` e o menu em `apps/web/src/components/layout/auth-layout.tsx`.

---

## 🗑️ Como Remover o Módulo Limpamente

Se você preferir iniciar sua aplicação a partir de uma base totalmente limpa:

1. **Remover no Backend:**
   - Exclua o diretório `apps/api/src/tasks/`.
   - Em `apps/api/src/app.module.ts`, remova a importação e o módulo `TasksModule` do array `imports`.
   - No `apps/api/prisma/schema.prisma`, remova o `model Task`, os enums `TaskStatus`/`TaskPriority` e o campo `tasks Task[]` em `UserProfile`.
   - Crie uma migration de exclusão ou reset com `pnpm db:migrate`.

2. **Remover no Frontend:**
   - Exclua `apps/web/src/pages/tasks-page.tsx` e `apps/web/src/pages/tasks-page.spec.tsx`.
   - Remova a rota `/tasks` em `apps/web/src/App.tsx`.
   - Remova o link de Tarefas em `apps/web/src/components/layout/auth-layout.tsx`.

3. **Regenerar e Validar:**
   - Execute `pnpm api:generate`.
   - Execute `pnpm --dir apps/api test && pnpm --dir apps/web test && pnpm --dir apps/web build && pnpm api:check`.
