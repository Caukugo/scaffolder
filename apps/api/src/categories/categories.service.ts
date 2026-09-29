import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CategoryDto,
  CategorySummaryDto,
  CreateCategoryDto,
  ListCategoriesQueryDto,
  PaginatedCategoriesResponseDto,
  UpdateCategoryDto,
} from './category.dto';

interface UserContext {
  id: string;
  role: string;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateCategoryDto): Promise<CategoryDto> {
    const name = dto.name.trim();
    await this.assertNameIsAvailable(ownerId, name);

    const created = await this.prisma.category.create({
      data: {
        name,
        description: dto.description?.trim() || null,
        color: dto.color?.toUpperCase() || '#2563EB',
        ownerId,
      },
    });

    return this.serializeCategory(created, 0);
  }

  async findAll(
    user: UserContext,
    query: ListCategoriesQueryDto,
  ): Promise<PaginatedCategoriesResponseDto> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    // Autorização: usuários comuns veem apenas suas próprias categorias; ADMIN vê todas
    if (user.role !== 'ADMIN') {
      where.ownerId = user.id;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const allowedSortFields = ['name', 'createdAt'];
    const sortBy = allowedSortFields.includes(query.sortBy || '') ? query.sortBy! : 'name';
    const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

    const [total, items] = await Promise.all([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              tasks: { where: { deletedAt: null } },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      data: items.map((item: any) => this.serializeCategory(item, item._count?.tasks ?? 0)),
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async findById(user: UserContext, id: string): Promise<CategoryDto> {
    const category = await this.loadOwnedCategory(user, id);

    const taskCount = await this.prisma.task.count({
      where: { categoryId: id, deletedAt: null },
    });

    return this.serializeCategory(category, taskCount);
  }

  async update(user: UserContext, id: string, dto: UpdateCategoryDto): Promise<CategoryDto> {
    const existing = await this.loadOwnedCategory(user, id);

    const name = dto.name?.trim();
    if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
      await this.assertNameIsAvailable(existing.ownerId, name, id);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.color !== undefined ? { color: dto.color.toUpperCase() } : {}),
      },
    });

    const taskCount = await this.prisma.task.count({
      where: { categoryId: id, deletedAt: null },
    });

    return this.serializeCategory(updated, taskCount);
  }

  async remove(user: UserContext, id: string): Promise<void> {
    await this.loadOwnedCategory(user, id);

    // Regra de negócio: remover a categoria não remove tarefas.
    // As tarefas ativas são desvinculadas na mesma transação para nunca apontar
    // para uma categoria logicamente excluída.
    await this.prisma.$transaction([
      this.prisma.task.updateMany({
        where: { categoryId: id, deletedAt: null },
        data: { categoryId: null },
      }),
      this.prisma.category.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);
  }

  /**
   * Fronteira pública consumida pelo módulo Tasks: garante que a categoria
   * informada existe, está ativa e pertence ao usuário que criou/editou a tarefa.
   */
  async resolveOwnedCategory(user: UserContext, categoryId: string): Promise<CategorySummaryDto> {
    const category = await this.loadOwnedCategory(user, categoryId);

    return {
      id: category.id,
      name: category.name,
      color: category.color,
    };
  }

  private async loadOwnedCategory(user: UserContext, id: string): Promise<any> {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    if (user.role !== 'ADMIN' && category.ownerId !== user.id) {
      throw new ForbiddenException('Você não tem permissão para acessar esta categoria.');
    }

    return category;
  }

  private async assertNameIsAvailable(
    ownerId: string,
    name: string,
    ignoreId?: string,
  ): Promise<void> {
    const duplicated = await this.prisma.category.findFirst({
      where: {
        ownerId,
        deletedAt: null,
        name: { equals: name, mode: 'insensitive' },
        ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
      },
    });

    if (duplicated) {
      throw new ConflictException(`Já existe uma categoria ativa chamada "${name}".`);
    }
  }

  private serializeCategory(category: any, taskCount: number): CategoryDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      ownerId: category.ownerId,
      taskCount,
      createdAt: new Date(category.createdAt).toISOString(),
      updatedAt: new Date(category.updatedAt).toISOString(),
    };
  }
}
