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
});
