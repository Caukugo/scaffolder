import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: any;

  const mockUser = {
    id: 'user-uuid-1',
    role: 'USER',
  };

  const mockOtherUser = {
    id: 'user-uuid-2',
    role: 'USER',
  };

  const mockAdmin = {
    id: 'admin-uuid-1',
    role: 'ADMIN',
  };

  const mockCategory = {
    id: 'category-uuid-1',
    name: 'Infraestrutura',
    description: 'Tarefas de plataforma e ambiente',
    color: '#2563EB',
    ownerId: 'user-uuid-1',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      category: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      task: {
        count: vi.fn().mockResolvedValue(0),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    service = new CategoriesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates category for authenticated user', async () => {
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(mockCategory);

      const result = await service.create(mockUser.id, {
        name: 'Infraestrutura',
        description: 'Tarefas de plataforma e ambiente',
        color: '#2563eb',
      });

      expect(result.id).toBe(mockCategory.id);
      expect(result.ownerId).toBe(mockUser.id);
      expect(result.taskCount).toBe(0);
      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Infraestrutura', color: '#2563EB' }),
        }),
      );
    });

    it('rejects duplicated active name for the same owner', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);

      await expect(service.create(mockUser.id, { name: 'infraestrutura' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.category.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('restricts query to own categories for regular users', async () => {
      prisma.category.count.mockResolvedValue(1);
      prisma.category.findMany.mockResolvedValue([{ ...mockCategory, _count: { tasks: 2 } }]);

      const result = await service.findAll(mockUser, { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].taskCount).toBe(2);
      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            ownerId: mockUser.id,
          }),
        }),
      );
    });

    it('allows admin to query categories from all users', async () => {
      prisma.category.count.mockResolvedValue(1);
      prisma.category.findMany.mockResolvedValue([{ ...mockCategory, _count: { tasks: 0 } }]);

      await service.findAll(mockAdmin, { page: 1, pageSize: 20 });

      expect(prisma.category.findMany.mock.calls[0][0].where.ownerId).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('returns category with the number of active tasks', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);
      prisma.task.count.mockResolvedValue(5);

      const result = await service.findById(mockUser, mockCategory.id);

      expect(result.taskCount).toBe(5);
      expect(prisma.task.count).toHaveBeenCalledWith({
        where: { categoryId: mockCategory.id, deletedAt: null },
      });
    });

    it('throws NotFound for missing or logically deleted category', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockUser, 'missing-id')).rejects.toThrow(NotFoundException);
    });

    it('blocks access to category owned by another user', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);

      await expect(service.findById(mockOtherUser, mockCategory.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('renames category when the new name is available', async () => {
      prisma.category.findFirst
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(null);
      prisma.category.update.mockResolvedValue({ ...mockCategory, name: 'Plataforma' });

      const result = await service.update(mockUser, mockCategory.id, { name: 'Plataforma' });

      expect(result.name).toBe('Plataforma');
    });

    it('rejects renaming to a name already used by another active category', async () => {
      prisma.category.findFirst
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce({ ...mockCategory, id: 'category-uuid-2', name: 'Plataforma' });

      await expect(
        service.update(mockUser, mockCategory.id, { name: 'Plataforma' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft deletes the category and detaches its active tasks', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);

      await service.remove(mockUser, mockCategory.id);

      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { categoryId: mockCategory.id, deletedAt: null },
        data: { categoryId: null },
      });
      expect(prisma.category.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCategory.id },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('blocks removal of a category owned by another user', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);

      await expect(service.remove(mockOtherUser, mockCategory.id)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('resolveOwnedCategory', () => {
    it('returns the summary used by the Tasks module', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);

      const result = await service.resolveOwnedCategory(mockUser, mockCategory.id);

      expect(result).toEqual({
        id: mockCategory.id,
        name: mockCategory.name,
        color: mockCategory.color,
      });
    });

    it('rejects a category belonging to another user', async () => {
      prisma.category.findFirst.mockResolvedValue(mockCategory);

      await expect(
        service.resolveOwnedCategory(mockOtherUser, mockCategory.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
