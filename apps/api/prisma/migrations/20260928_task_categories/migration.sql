-- Migration: 20260928_task_categories
-- Description: Módulo de Categorias de tarefas com ownership, soft delete e vínculo opcional a partir de Task

-- Consulta 001: Criação da tabela categories
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#2563EB',
    "ownerId" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- Consulta 002: Índices de consulta por dono, soft delete e busca por nome dentro do dono
CREATE INDEX "categories_ownerId_idx" ON "categories"("ownerId");
CREATE INDEX "categories_deletedAt_idx" ON "categories"("deletedAt");
CREATE INDEX "categories_ownerId_name_idx" ON "categories"("ownerId", "name");

-- Consulta 003: Foreign key relacionando a categoria ao perfil do usuário proprietário
ALTER TABLE "categories" ADD CONSTRAINT "categories_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Consulta 004: Coluna opcional de categoria na tabela tasks
ALTER TABLE "tasks" ADD COLUMN "categoryId" UUID;

-- Consulta 005: Índice para filtrar tarefas por categoria
CREATE INDEX "tasks_categoryId_idx" ON "tasks"("categoryId");

-- Consulta 006: Foreign key opcional de tasks para categories (categoria removida desvincula a tarefa)
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
