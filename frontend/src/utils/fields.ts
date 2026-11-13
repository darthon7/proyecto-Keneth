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

function createOptionalNumberSchema(numberSchema: z.ZodType = z.coerce.number()) {
  return z.preprocess(
    (value) =>
      value === '' ||
      value === null ||
      value === undefined ||
      (typeof value === 'number' && Number.isNaN(value))
        ? undefined
        : value,
    numberSchema.optional(),
  );
}

function fieldSchema(field: FieldConfig): z.ZodType {
  switch (field.type) {
    case 'number': {
      let schema = z.coerce.number({ error: `${field.label} debe ser un número válido` });
      if (field.min !== undefined) {
        schema = schema.min(field.min);
      } else if (field.required) {
        schema = schema.min(0);
      }
      if (field.max !== undefined) schema = schema.max(field.max);
      if (field.step === undefined || field.step === 1) {
        schema = schema.int();
      }
      if (field.required) {
        return z.preprocess(
          (value) => (value === '' || value === null || value === undefined ? NaN : value),
          schema,
        );
      }
      return createOptionalNumberSchema(schema);
    }
    case 'checkbox':
      return z.boolean().default(false);
    case 'select': {
      const numeric = field.options?.some((option) => typeof option.value === 'number');
      if (numeric) {
        if (field.required) {
          const message = `Selecciona una opción válida para ${field.label}`;
          return z.preprocess(
            (value) => (value === '' || value === null || value === undefined ? NaN : value),
            z.coerce
              .number({ error: message })
              .refine((val) => Number.isFinite(val) && val >= 1, { message }),
          );
        }
        return createOptionalNumberSchema();
      }
      const schema = z.string();
      return field.required
        ? schema.min(1, `Selecciona una opción válida para ${field.label}`)
        : schema.optional();
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
      const numericValue = Number(value);
      if (Number.isNaN(numericValue)) continue;
      payload[field.name] = numericValue;
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
