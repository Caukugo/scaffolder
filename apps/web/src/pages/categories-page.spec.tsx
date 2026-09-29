import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { CategoriesPage } from './categories-page';

vi.mock('../lib/api-client', () => ({
  categoriesControllerFindAll: vi.fn().mockResolvedValue({
    data: {
      data: [
        {
          id: 'category-1',
          name: 'Infraestrutura',
          description: 'Tarefas de plataforma e ambiente',
          color: '#2563EB',
          ownerId: 'usr-1',
          taskCount: 3,
          createdAt: '2026-09-28T10:00:00.000Z',
          updatedAt: '2026-09-28T10:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        pageSize: 9,
        total: 1,
        totalPages: 1,
      },
    },
    status: 200,
    headers: new Headers(),
  }),
  categoriesControllerCreate: vi.fn(),
  categoriesControllerUpdate: vi.fn(),
  categoriesControllerRemove: vi.fn(),
}));

describe('CategoriesPage', () => {
  it('renders categories page with loaded categories', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CategoriesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Categorias de Tarefas')).toBeInTheDocument();
    expect(await screen.findByText('Infraestrutura')).toBeInTheDocument();
    expect(screen.getByText('Tarefas de plataforma e ambiente')).toBeInTheDocument();
    expect(screen.getByText('3 tarefas')).toBeInTheDocument();
  });
});
