import { z } from 'zod';

export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'textarea'
  | 'date'
  | 'datetime'
  | 'select'
  | 'checkbox';

export interface FieldOption {
  value: string | number;
  label: string;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: FieldOption[];
  placeholder?: string;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  /** Valor inicial usado al abrir el modal de creación. */
  defaultValue?: string | number | boolean;
}

export type FormValues = Record<string, unknown>;

const optionalNumber = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : value),
  z.coerce.number().optional(),
);

function fieldSchema(field: FieldConfig): z.ZodType {
  switch (field.type) {
    case 'number': {
      let schema = z.coerce.number();
      if (field.required) {
        schema = schema.min(field.min ?? 0);
      }
      if (field.max !== undefined) schema = schema.max(field.max);
      if (field.step === 1 || field.type === 'number') {
        if (field.step === undefined) schema = schema.int();
      }
      return field.required ? schema : optionalNumber;
    }
    case 'checkbox':
      return z.boolean().default(false);
    case 'select': {
      const numeric = field.options?.some((option) => typeof option.value === 'number');
      if (numeric) {
        const schema = z.coerce.number();
        return field.required ? schema : optionalNumber;
      }
      const schema = z.string();
      return field.required ? schema : schema.optional();
    }
    case 'textarea': {
      const schema = z.string();
      return field.required ? schema.min(1, `${field.label} es obligatorio`) : schema.optional();
    }
    case 'date':
    case 'datetime': {
      const schema = z.string();
      return field.required ? schema.min(1, `${field.label} es obligatorio`) : schema.optional();
    }
    case 'text':
    case 'password':
    case 'email':
    default: {
      let schema = z.string();
      if (field.type === 'email') {
        schema = schema.email('Introduce un correo válido');
      }
      if (field.required) schema = schema.min(1, `${field.label} es obligatorio`);
      if (field.minLength !== undefined) {
        schema = schema.min(field.minLength, `${field.label} es muy corto`);
      }
      if (field.maxLength !== undefined) {
        schema = schema.max(field.maxLength, `${field.label} es muy largo`);
      }
      if (field.required) return schema;
      return z.union([z.literal(''), schema]).optional();
    }
  }
}

/** Construye el esquema Zod a partir de la configuración declarativa de campos. */
export function buildSchema(fields: FieldConfig[]): z.ZodType<FormValues, FormValues> {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    shape[field.name] = fieldSchema(field);
  }
  return z.object(shape) as unknown as z.ZodType<FormValues, FormValues>;
}

/** Genera los valores iniciales del formulario a partir de la configuración. */
export function buildInitialValues(
  fields: FieldConfig[],
  source: Record<string, unknown> = {},
): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    const fromSource = source[field.name];
    if (fromSource !== undefined && fromSource !== null) {
      values[field.name] = fromSource;
      continue;
    }
    if (field.defaultValue !== undefined) {
      values[field.name] = field.defaultValue;
      continue;
    }
    values[field.name] = field.type === 'checkbox' ? false : '';
  }
  return values;
}

/**
 * Normaliza los valores del formulario al payload esperado por el backend:
 * descarta cadenas vacías, convierte `datetime-local` a ISO y castea selects numéricos.
 */
export function buildPayload(
  values: FormValues,
  fields: FieldConfig[],
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    const value = values[field.name];

    if (field.type === 'checkbox') {
      payload[field.name] = Boolean(value);
      continue;
    }

    if (value === undefined || value === null || value === '') continue;

    if (field.type === 'datetime') {
      payload[field.name] = new Date(String(value)).toISOString();
      continue;
    }

    if (field.type === 'number') {
      payload[field.name] = Number(value);
      continue;
    }

    if (field.type === 'select') {
      const numeric = field.options?.some((option) => typeof option.value === 'number');
      payload[field.name] = numeric ? Number(value) : value;
      continue;
    }

    payload[field.name] = value;
  }

  return payload;
}
