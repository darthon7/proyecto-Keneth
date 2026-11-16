import { z } from 'zod';
import { isBeforeToday } from './format';

export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  ISO_COUNTRY: /^[A-Za-z]{2}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  PLATFORM_CODE: /^[A-Za-z0-9_-]{2,20}$/,
  COUPON_CODE: /^[A-Za-z0-9_-]{2,50}$/,
  HTTP_URL: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
  URL_OR_PATH: /^(\/[^\s]*|https?:\/\/[^\s/$.?#].[^\s]*)$/i,
  USERNAME: /^(?=.*\S)[a-zA-ZÀ-ÿ0-9._\-\s]{2,100}$/,
  ENTITY_NAME: /^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,&'()/:|+!?¡¿-]{1,200}$/,
  DIGITAL_KEY_CODE: /^[A-Za-z0-9]{2,10}(?:-[A-Za-z0-9]{2,10}){1,7}$/,
  BATCH_ID: /^[A-Za-z0-9_-]{2,50}$/,
  ESRB_RATING: /^(EC|E|E10\+|T|M|AO|RP)$/i,
  ISO_DATE: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  CARD_HOLDER: /^(?=.*\S)[a-zA-ZÀ-ÿ\s.'-]{3,100}$/,
  CARD_NUMBER: /^\d{12,19}$/,
  CARD_EXPIRY: /^(0[1-9]|1[0-2])\/\d{2}$/,
  CARD_CVV: /^\d{3,4}$/,
  DECIMAL_PRICE: /^\d+(\.\d{1,2})?$/,
  DIRECTX_VERSION: /^(?=.*\S)[a-zA-Z0-9.\s_+-]{2,50}$/,
  HARDWARE_SPEC: /^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,/()+_™®-]{2,150}$/,
  NON_WHITESPACE_PASSWORD: /^\S(?:.*\S)?$/,
  POSITIVE_INT: /^\d+$/,
  NON_NEGATIVE_NUMBER: /^\d+(\.\d+)?$/,
} as const;

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
  pattern?: RegExp;
  patternMessage?: string;
  /** Exige que la fecha/hora no sea anterior al día de hoy (en creación o al modificarla). */
  notBeforeToday?: boolean;
  /** Nombre de otro campo fecha/hora respecto al cual este debe ser estrictamente posterior. */
  afterField?: string;
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
      const minLimit = field.min ?? 0;
      const minMessage =
        minLimit >= 0
          ? `${field.label} no puede ser negativo (mínimo ${minLimit})`
          : `${field.label} debe ser al menos ${minLimit}`;
      let schema = z
        .number({ error: `${field.label} debe ser un número válido` })
        .min(minLimit, minMessage);
      if (field.max !== undefined) {
        schema = schema.max(field.max, `${field.label} no puede ser mayor a ${field.max}`);
      }
      if (field.step === undefined || field.step === 1) {
        schema = schema.int(`${field.label} debe ser un número entero`);
      }

      const normalizeNumericInput = (value: unknown): unknown => {
        if (value === null || value === undefined) {
          return field.required ? Number.NaN : undefined;
        }
        if (typeof value === 'number') {
          if (Number.isNaN(value)) {
            return field.required ? Number.NaN : undefined;
          }
          return Number.isFinite(value) ? value : Number.NaN;
        }
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed === '') {
            return field.required ? Number.NaN : undefined;
          }
          if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
            return Number.NaN;
          }
          return Number(trimmed);
        }
        return Number.NaN;
      };

      return z.preprocess(
        normalizeNumericInput,
        field.required ? schema : schema.optional(),
      );
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
      let schema = z.string().trim();
      if (field.required) {
        schema = schema.min(1, `${field.label} es obligatorio`);
      }
      if (field.minLength !== undefined) {
        schema = schema.min(field.minLength, `${field.label} es muy corto`);
      }
      if (field.maxLength !== undefined) {
        schema = schema.max(field.maxLength, `${field.label} es muy largo`);
      }
      if (field.pattern) {
        schema = schema.regex(
          field.pattern,
          field.patternMessage ?? `${field.label} tiene un formato inválido`,
        );
      }
      if (field.required) return schema;
      return z.preprocess(
        (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
        schema.optional(),
      );
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
      let schema = field.type === 'password' ? z.string() : z.string().trim();
      if (field.required) {
        schema = schema.min(1, `${field.label} es obligatorio`);
      }
      if (field.type === 'email') {
        schema = schema
          .email('Introduce un correo válido')
          .regex(VALIDATION_PATTERNS.EMAIL, 'Introduce un correo válido');
      }
      if (field.minLength !== undefined) {
        schema = schema.min(field.minLength, `${field.label} es muy corto`);
      }
      if (field.maxLength !== undefined) {
        schema = schema.max(field.maxLength, `${field.label} es muy largo`);
      }
      if (field.pattern) {
        schema = schema.regex(
          field.pattern,
          field.patternMessage ?? `${field.label} tiene un formato inválido`,
        );
      }
      if (field.required) return schema;
      return z.preprocess(
        (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
        schema.optional(),
      );
    }
  }
}

export interface BuildSchemaOptions {
  mode?: 'create' | 'edit';
  initialValues?: FormValues;
}

/** Construye el esquema Zod a partir de la configuración declarativa de campos. */
export function buildSchema(
  fields: FieldConfig[],
  options: BuildSchemaOptions = {},
): z.ZodType<FormValues, FormValues> {
  const { mode = 'create', initialValues } = options;
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    shape[field.name] = fieldSchema(field);
  }
  const fieldsByName = new Map(fields.map((field) => [field.name, field]));

  return z
    .object(shape)
    .superRefine((values, ctx) => {
      for (const field of fields) {
        if (field.type !== 'date' && field.type !== 'datetime') continue;
        const rawValue = values[field.name];
        if (typeof rawValue !== 'string' || rawValue.trim() === '') continue;

        const parsedDate = new Date(rawValue);
        if (Number.isNaN(parsedDate.getTime())) {
          ctx.addIssue({
            code: 'custom',
            path: [field.name],
            message: `${field.label} no es una fecha válida`,
          });
          continue;
        }

        if (field.notBeforeToday) {
          const isModifiedInEdit =
            mode === 'edit' && rawValue !== initialValues?.[field.name];
          const isActivatingExpiredEndDate =
            mode === 'edit' && Boolean(field.afterField) && values.isActive === true;

          if ((mode === 'create' || isModifiedInEdit || isActivatingExpiredEndDate) && isBeforeToday(parsedDate)) {
            ctx.addIssue({
              code: 'custom',
              path: [field.name],
              message:
                isActivatingExpiredEndDate && !isModifiedInEdit
                  ? `No se puede activar con ${field.label.toLowerCase()} anterior al día de hoy`
                  : `${field.label} no puede ser anterior al día de hoy`,
            });
          }
        }

        if (field.afterField) {
          const otherRaw = values[field.afterField];
          if (typeof otherRaw === 'string' && otherRaw.trim() !== '') {
            const otherDate = new Date(otherRaw);
            if (!Number.isNaN(otherDate.getTime()) && parsedDate.getTime() <= otherDate.getTime()) {
              const otherLabel = fieldsByName.get(field.afterField)?.label ?? field.afterField;
              ctx.addIssue({
                code: 'custom',
                path: [field.name],
                message: `${field.label} debe ser posterior a ${otherLabel}`,
              });
            }
          }
        }
      }
    }) as unknown as z.ZodType<FormValues, FormValues>;
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

    if (field.type === 'text' || field.type === 'email' || field.type === 'textarea') {
      const trimmed = String(value).trim();
      if (trimmed === '') continue;
      payload[field.name] = trimmed;
      continue;
    }

    payload[field.name] = value;
  }

  return payload;
}
