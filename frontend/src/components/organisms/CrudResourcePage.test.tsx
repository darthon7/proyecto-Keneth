import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import type { Publisher } from '@/types';
import type { FieldConfig } from '@/utils/fields';

interface PageProps {
  title: string;
  queryKey: string[];
  fetchList: () => Promise<Publisher[]>;
  createItem: (payload: Record<string, unknown>) => Promise<unknown>;
  updateItem: (id: number | string, payload: Record<string, unknown>) => Promise<unknown>;
  deleteItem: (id: number | string) => Promise<unknown>;
  fields: FieldConfig[];
  columns: { header: string; render: (item: Publisher) => string }[];
  toFormValues: (item: Publisher) => Record<string, unknown>;
  getId: (item: Publisher) => number | string;
}

const publishers: Publisher[] = [
  {
    id: 1,
    name: 'Nintendo',
    websiteUrl: null,
    supportEmail: null,
    country: 'JP',
  },
];

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nombre', type: 'text', required: true },
  { name: 'country', label: 'País (ISO-2)', type: 'text', minLength: 2, maxLength: 2 },
];

function renderPage(overrides: Partial<PageProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const props: PageProps = {
    title: 'Publishers',
    queryKey: ['publishers'],
    fetchList: vi.fn(async () => publishers),
    createItem: vi.fn(async () => publishers[0]),
    updateItem: vi.fn(async () => publishers[0]),
    deleteItem: vi.fn(async () => publishers[0]),
    fields,
    columns: [{ header: 'Nombre', render: (item: Publisher) => item.name }],
    toFormValues: (item: Publisher) => ({ name: item.name, country: item.country ?? '' }),
    getId: (item: Publisher) => item.id,
    ...overrides,
  };

  render(
    <QueryClientProvider client={queryClient}>
      <CrudResourcePage<Publisher, Record<string, unknown>> {...props} />
    </QueryClientProvider>,
  );

  return props;
}

describe('CrudResourcePage', () => {
  it('lista los registros recibidos de la API', async () => {
    renderPage();

    expect(await screen.findByText('Nintendo')).toBeInTheDocument();
  });

  it('crea un registro con los datos del formulario', async () => {
    const user = userEvent.setup();
    const props = renderPage();

    await user.click(await screen.findByRole('button', { name: 'Nuevo registro' }));
    await user.type(await screen.findByLabelText('Nombre'), 'Capcom');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(props.createItem).toHaveBeenCalledWith({ name: 'Capcom' });
    });
  });

  it('no envía el formulario si faltan campos obligatorios', async () => {
    const user = userEvent.setup();
    const props = renderPage();

    await user.click(await screen.findByRole('button', { name: 'Nuevo registro' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Nombre es obligatorio')).toBeInTheDocument();
    expect(props.createItem).not.toHaveBeenCalled();
  });
});
