import { describe, expect, it } from 'vitest';
import { buildInitialValues, buildPayload, buildSchema } from '@/utils/fields';
import type { FieldConfig } from '@/utils/fields';

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nombre', type: 'text', required: true },
  { name: 'websiteUrl', label: 'Sitio web', type: 'text' },
  { name: 'supportEmail', label: 'Correo', type: 'email' },
  { name: 'basePrice', label: 'Precio', type: 'number', required: true, min: 0 },
  { name: 'format', label: 'Formato', type: 'select', required: true, options: [{ value: 'DIGITAL', label: 'Digital' }] },
  { name: 'gameId', label: 'Juego', type: 'select', required: true, options: [{ value: 7, label: 'Juego' }] },
  { name: 'isDlc', label: 'DLC', type: 'checkbox' },
  { name: 'startDate', label: 'Inicio', type: 'datetime', required: true },
];

describe('buildInitialValues', () => {
  it('usa los valores por defecto declarados en la configuración', () => {
    const values = buildInitialValues([
      { name: 'format', label: 'Formato', type: 'select', defaultValue: 'DIGITAL' },
      { name: 'isDlc', label: 'DLC', type: 'checkbox' },
    ]);

    expect(values).toEqual({ format: 'DIGITAL', isDlc: false });
  });

  it('prefiere los valores de la entidad sobre los valores por defecto', () => {
    const values = buildInitialValues(
      [{ name: 'name', label: 'Nombre', type: 'text', defaultValue: 'Nuevo' }],
      { name: 'Existente' },
    );

    expect(values.name).toBe('Existente');
  });
});

describe('buildPayload', () => {
  it('descarta cadenas vacías y conserva solo los campos con valor', () => {
    const payload = buildPayload(
      {
        name: 'Nintendo',
        websiteUrl: '',
        supportEmail: 'press@nintendo.com',
        basePrice: 1299,
        format: 'DIGITAL',
        gameId: '7',
        isDlc: false,
        startDate: '2026-01-01T10:00',
      },
      fields,
    );

    expect(payload.websiteUrl).toBeUndefined();
    expect(payload.name).toBe('Nintendo');
    expect(payload.basePrice).toBe(1299);
    expect(payload.gameId).toBe(7);
    expect(payload.isDlc).toBe(false);
    expect(payload.startDate).toBe(new Date('2026-01-01T10:00').toISOString());
  });
});

describe('buildSchema', () => {
  it('exige los campos obligatorios', () => {
    const schema = buildSchema(fields);
    const result = schema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('acepta un payload válido', () => {
    const schema = buildSchema(fields);
    const result = schema.safeParse({
      name: 'Nintendo',
      basePrice: 1299,
      format: 'DIGITAL',
      gameId: 7,
      isDlc: false,
      startDate: '2026-01-01T10:00',
    });

    expect(result.success).toBe(true);
  });

  it('rechaza correos inválidos', () => {
    const schema = buildSchema([
      { name: 'supportEmail', label: 'Correo', type: 'email', required: true },
    ]);
    const result = schema.safeParse({ supportEmail: 'no-es-un-correo' });

    expect(result.success).toBe(false);
  });

  it('acepta NaN o vacío en campos numéricos opcionales y valida min/max/int si tienen valor', () => {
    const schema = buildSchema([
      { name: 'foundedYear', label: 'Año de fundación', type: 'number', min: 1950, max: 2100 },
    ]);

    expect(schema.safeParse({ foundedYear: Number.NaN })).toEqual({
      success: true,
      data: { foundedYear: undefined },
    });
    expect(schema.safeParse({ foundedYear: '' })).toEqual({
      success: true,
      data: { foundedYear: undefined },
    });
    expect(schema.safeParse({ foundedYear: 2001 })).toEqual({
      success: true,
      data: { foundedYear: 2001 },
    });
    expect(schema.safeParse({ foundedYear: 1900 }).success).toBe(false);
    expect(schema.safeParse({ foundedYear: 2200 }).success).toBe(false);
    expect(schema.safeParse({ foundedYear: 2001.5 }).success).toBe(false);
  });

  it('rechaza cadena vacía, 0 o NaN en selects numéricos requeridos con mensaje claro', () => {
    const schema = buildSchema([
      {
        name: 'gameId',
        label: 'Videojuego',
        type: 'select',
        required: true,
        options: [{ value: 7, label: 'Zelda' }],
      },
    ]);

    const emptyResult = schema.safeParse({ gameId: '' });
    expect(emptyResult.success).toBe(false);
    if (!emptyResult.success) {
      expect(emptyResult.error.issues[0]?.message).toBe(
        'Selecciona una opción válida para Videojuego',
      );
    }

    expect(schema.safeParse({ gameId: 0 }).success).toBe(false);
    expect(schema.safeParse({ gameId: Number.NaN }).success).toBe(false);
    expect(schema.safeParse({ gameId: '7' })).toEqual({
      success: true,
      data: { gameId: 7 },
    });
  });

  it('rechaza fechas anteriores a hoy al crear y exige endDate posterior a startDate', () => {
    const promoFields: FieldConfig[] = [
      { name: 'startDate', label: 'Inicio', type: 'datetime', required: true, notBeforeToday: true },
      {
        name: 'endDate',
        label: 'Fin',
        type: 'datetime',
        required: true,
        notBeforeToday: true,
        afterField: 'startDate',
      },
      { name: 'isActive', label: 'Activo', type: 'checkbox' },
    ];
    const schema = buildSchema(promoFields, { mode: 'create' });

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toLocal = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0);
    const todayMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
    const todayEvening = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0);

    expect(
      schema.safeParse({
        startDate: toLocal(yesterday),
        endDate: toLocal(todayEvening),
        isActive: true,
      }).success,
    ).toBe(false);

    expect(
      schema.safeParse({
        startDate: toLocal(todayEvening),
        endDate: toLocal(todayMorning),
        isActive: true,
      }).success,
    ).toBe(false);

    expect(
      schema.safeParse({
        startDate: toLocal(todayMorning),
        endDate: toLocal(todayEvening),
        isActive: true,
      }).success,
    ).toBe(true);
  });

  it('en edición permite mantener startDate histórico si no se modifica pero impide activar con endDate expirado', () => {
    const promoFields: FieldConfig[] = [
      { name: 'startDate', label: 'Inicio', type: 'datetime', required: true, notBeforeToday: true },
      {
        name: 'endDate',
        label: 'Fin',
        type: 'datetime',
        required: true,
        notBeforeToday: true,
        afterField: 'startDate',
      },
      { name: 'isActive', label: 'Activo', type: 'checkbox' },
    ];
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toLocal = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const pastStart = toLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 10, 0));
    const pastEnd = toLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10, 0));
    const futureEnd = toLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 10, 0));

    const runningEditSchema = buildSchema(promoFields, {
      mode: 'edit',
      initialValues: { startDate: pastStart, endDate: futureEnd, isActive: true },
    });
    expect(
      runningEditSchema.safeParse({ startDate: pastStart, endDate: futureEnd, isActive: true })
        .success,
    ).toBe(true);

    const expiredEditSchema = buildSchema(promoFields, {
      mode: 'edit',
      initialValues: { startDate: pastStart, endDate: pastEnd, isActive: false },
    });
    expect(
      expiredEditSchema.safeParse({ startDate: pastStart, endDate: pastEnd, isActive: true })
        .success,
    ).toBe(false);
    expect(
      expiredEditSchema.safeParse({ startDate: pastStart, endDate: pastEnd, isActive: false })
        .success,
    ).toBe(true);
  });
});
