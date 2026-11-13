import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { Checkbox } from '@/components/atoms/Checkbox';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Modal } from '@/components/atoms/Modal';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { Textarea } from '@/components/atoms/Textarea';
import { errorMessage } from '@/api';
import { buildInitialValues, buildPayload, buildSchema } from '@/utils/fields';
import type { FieldConfig, FormValues } from '@/utils/fields';

export interface CrudColumn<T> {
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface CrudResourcePageProps<T, TPayload extends object = Record<string, unknown>> {
  title: string;
  description?: string;
  queryKey: string[];
  fetchList: () => Promise<T[]>;
  createItem: (payload: TPayload) => Promise<unknown>;
  updateItem: (id: number | string, payload: TPayload) => Promise<unknown>;
  deleteItem: (id: number | string) => Promise<unknown>;
  fields: FieldConfig[];
  columns: CrudColumn<T>[];
  toFormValues: (item: T) => Record<string, unknown>;
  getId: (item: T) => number | string;
  emptyMessage?: string;
  embedded?: boolean;
}

type ModalState<T> = { mode: 'create' } | { mode: 'edit'; item: T } | null;

export function CrudResourcePage<T, TPayload extends object = Record<string, unknown>>({
  title,
  description,
  queryKey,
  fetchList,
  createItem,
  updateItem,
  deleteItem,
  fields,
  columns,
  toFormValues,
  getId,
  emptyMessage = 'Todavía no hay registros.',
  embedded = false,
}: CrudResourcePageProps<T, TPayload>) {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<ModalState<T> | null>(null);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => buildSchema(fields), [fields]);

  const listQuery = useQuery({
    queryKey,
    queryFn: fetchList,
  });
  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const typedPayload = payload as unknown as TPayload;
      if (modalState?.mode === 'edit') {
        return updateItem(getId(modalState.item), typedPayload);
      }
      return createItem(typedPayload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setModalState(null);
      setFormError(null);
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (item: T) => deleteItem(getId(item)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setItemToDelete(null);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildInitialValues(fields),
  });

  const openCreate = () => {
    form.reset(buildInitialValues(fields));
    setFormError(null);
    setModalState({ mode: 'create' });
  };

  const openEdit = (item: T) => {
    form.reset(buildInitialValues(fields, toFormValues(item)));
    setFormError(null);
    setModalState({ mode: 'edit', item });
  };

  const openDeleteModal = (item: T) => {
    deleteMutation.reset();
    setItemToDelete(item);
  };

  const closeDeleteModal = () => {
    deleteMutation.reset();
    setItemToDelete(null);
  };

  const submit = form.handleSubmit((values) => {
    setFormError(null);
    saveMutation.mutate(buildPayload(values, fields));
  });

  const items = listQuery.data ?? [];

  return (
    <section className={embedded ? 'space-y-6' : 'page-container py-16'}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-extrabold text-[#0F172A]">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-body-sm text-[#475569]">{description}</p>}
        </div>
        <Button variant="brand" data-testid="crud-create-btn" onClick={openCreate}>
          Nuevo registro
        </Button>
      </header>

      <div className="mt-8">
        {listQuery.isLoading && <Spinner label="Cargando registros…" />}

        {listQuery.isError && (
          <ErrorBanner
            message={errorMessage(listQuery.error)}
            onRetry={() => void listQuery.refetch()}
          />
        )}

        {listQuery.isSuccess && items.length === 0 && (
          <EmptyState
            title="Sin registros"
            description={emptyMessage}
            action={<Button variant="brand" onClick={openCreate}>Crear el primero</Button>}
          />
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-xs px-4 py-2">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  {columns.map((column) => (
                    <th
                      key={column.header}
                      scope="col"
                      className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]"
                    >
                      {column.header}
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-3 text-right text-caption font-bold uppercase tracking-wider text-[#475569]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={getId(item)} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC] transition-colors">
                    {columns.map((column) => (
                      <td key={column.header} className={`px-3 py-3 text-body-sm ${column.className ?? 'text-[#0F172A] font-medium'}`}>
                        {column.render(item)}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          data-testid={`crud-edit-btn-${getId(item)}`}
                          onClick={() => openEdit(item)}
                          className="text-body-sm font-semibold text-[#1E1B4B] transition-colors hover:text-[#FF2A5F]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          data-testid={`crud-delete-btn-${getId(item)}`}
                          onClick={() => openDeleteModal(item)}
                          className="text-body-sm font-semibold text-[#EF4444] transition-colors hover:text-[#991B1B]"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState?.mode === 'edit' ? `Editar ${title.toLowerCase()}` : `Nuevo ${title.toLowerCase()}`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalState(null)}>
              Cancelar
            </Button>
            <Button
              variant="brand"
              data-testid="crud-save-btn"
              onClick={submit}
              isLoading={saveMutation.isPending}
            >
              Guardar
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          {formError && <ErrorBanner message={formError} />}

          {fields.map((field) => {
            const fieldError = form.formState.errors[field.name]?.message;
            const errorText = typeof fieldError === 'string' ? fieldError : undefined;

            switch (field.type) {
              case 'textarea':
                return (
                  <Textarea
                    key={field.name}
                    label={field.label}
                    placeholder={field.placeholder}
                    error={errorText}
                    hint={field.help}
                    {...form.register(field.name)}
                  />
                );
              case 'select':
                return (
                  <Select
                    key={field.name}
                    label={field.label}
                    options={field.options ?? []}
                    error={errorText}
                    hint={field.help}
                    placeholder={field.required ? 'Selecciona una opción' : 'Sin asignar'}
                    {...form.register(field.name)}
                  />
                );
              case 'checkbox':
                return (
                  <Checkbox
                    key={field.name}
                    label={field.label}
                    error={errorText}
                    {...form.register(field.name)}
                  />
                );
              case 'number':
                return (
                  <Input
                    key={field.name}
                    type="number"
                    label={field.label}
                    placeholder={field.placeholder}
                    error={errorText}
                    hint={field.help}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    {...form.register(field.name, { valueAsNumber: true })}
                  />
                );
              default:
                return (
                  <Input
                    key={field.name}
                    type={field.type === 'datetime' ? 'datetime-local' : field.type}
                    label={field.label}
                    placeholder={field.placeholder}
                    error={errorText}
                    hint={field.help}
                    {...form.register(field.name)}
                  />
                );
            }
          })}
        </form>
      </Modal>

      <Modal
        isOpen={itemToDelete !== null}
        onClose={closeDeleteModal}
        title="Eliminar registro"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeDeleteModal}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              data-testid="crud-confirm-delete-btn"
              isLoading={deleteMutation.isPending}
              onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete)}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-fog">
          Esta acción no se puede deshacer. ¿Seguro que quieres eliminar este registro?
        </p>
        {deleteMutation.isError && (
          <div className="mt-4">
            <ErrorBanner message={errorMessage(deleteMutation.error)} />
          </div>
        )}
      </Modal>
    </section>
  );
}
