import { z } from 'zod';
import { VALIDATION_PATTERNS } from './fields';
import { isBeforeToday } from './format';
import { extractYouTubeId } from './youtube';

export const profileSettingsSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(2, 'El nombre de usuario debe tener entre 2 y 100 caracteres.')
      .max(100, 'El nombre de usuario debe tener entre 2 y 100 caracteres.')
      .regex(
        VALIDATION_PATTERNS.USERNAME,
        'El nombre de usuario solo permite letras, números, espacios, puntos, guiones y guion bajo.',
      ),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(150, 'Ingresa un correo electrónico válido.')
      .regex(VALIDATION_PATTERNS.EMAIL, 'Ingresa un correo electrónico válido.'),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        VALIDATION_PATTERNS.ISO_COUNTRY,
        'El código de país debe tener exactamente 2 letras (ej. MX, US, ES).',
      ),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password) {
      if (data.password.length < 4 || data.password.length > 50) {
        ctx.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'La nueva contraseña debe tener entre 4 y 50 caracteres.',
        });
      } else if (!VALIDATION_PATTERNS.NON_WHITESPACE_PASSWORD.test(data.password)) {
        ctx.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'La contraseña no puede empezar ni terminar con espacios.',
        });
      }
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Las contraseñas no coinciden.',
      });
    }
  });

export type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>;

export const checkoutSchema = z.object({
  cardHolder: z
    .string()
    .trim()
    .regex(
      VALIDATION_PATTERNS.CARD_HOLDER,
      'Ingresa un nombre de titular válido (solo letras y espacios, mínimo 3 caracteres).',
    ),
  cardNumber: z
    .string()
    .refine(
      (value) => VALIDATION_PATTERNS.CARD_NUMBER.test(value.replace(/\s+/g, '')),
      'Ingresa un número de tarjeta válido (12 a 19 dígitos).',
    ),
  cardExpiry: z
    .string()
    .trim()
    .regex(
      VALIDATION_PATTERNS.CARD_EXPIRY,
      'La fecha de expiración debe tener formato MM/AA (ej. 12/28).',
    )
    .refine((value) => {
      const [monthStr, yearStr] = value.split('/');
      const expMonth = Number(monthStr);
      const expYear = 2000 + Number(yearStr);
      const now = new Date();
      return !(
        expYear < now.getFullYear() ||
        (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)
      );
    }, 'La tarjeta está vencida. Ingresa una fecha de expiración vigente.'),
  cardCvv: z
    .string()
    .trim()
    .regex(VALIDATION_PATTERNS.CARD_CVV, 'El CVV debe tener 3 o 4 dígitos.'),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const discountCampaignSchema = z
  .object({
    campaignName: z
      .string()
      .trim()
      .max(120, 'El nombre de la campaña contiene caracteres no válidos o excede 120 caracteres.')
      .refine(
        (value) => !value || VALIDATION_PATTERNS.ENTITY_NAME.test(value),
        'El nombre de la campaña contiene caracteres no válidos o excede 120 caracteres.',
      ),
    discountPercent: z
      .string()
      .trim()
      .refine((value) => {
        const pct = Number(value);
        return (
          VALIDATION_PATTERNS.DECIMAL_PRICE.test(value) &&
          Number.isFinite(pct) &&
          pct >= 1 &&
          pct <= 95
        );
      }, 'Ingresa un porcentaje de descuento válido entre 1% y 95%.'),
    startDate: z.string(),
    endDate: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate) {
      const parsedStart = new Date(data.startDate);
      if (Number.isNaN(parsedStart.getTime())) {
        ctx.addIssue({
          code: 'custom',
          path: ['startDate'],
          message: 'La fecha de inicio no es válida.',
        });
      } else if (isBeforeToday(parsedStart)) {
        ctx.addIssue({
          code: 'custom',
          path: ['startDate'],
          message: 'La fecha de inicio no puede ser anterior al día de hoy.',
        });
      }
    }

    if (data.endDate) {
      const parsedEnd = new Date(data.endDate);
      if (Number.isNaN(parsedEnd.getTime())) {
        ctx.addIssue({
          code: 'custom',
          path: ['endDate'],
          message: 'La fecha de fin no es válida.',
        });
      } else if (isBeforeToday(parsedEnd)) {
        ctx.addIssue({
          code: 'custom',
          path: ['endDate'],
          message: 'La fecha de fin no puede ser anterior al día de hoy.',
        });
      }
    }

    if (
      data.startDate &&
      data.endDate &&
      new Date(data.endDate).getTime() <= new Date(data.startDate).getTime()
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'La fecha de fin debe ser posterior a la fecha de inicio.',
      });
    }
  });

export type DiscountCampaignFormValues = z.infer<typeof discountCampaignSchema>;

export const featuredTrailerSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Ingresa el título del juego o tráiler.')
    .refine(
      (value) =>
        value.length >= 2 && value.length <= 180 && VALIDATION_PATTERNS.ENTITY_NAME.test(value),
      'El título debe tener entre 2 y 180 caracteres válidos.',
    ),
  imageUrl: z
    .string()
    .trim()
    .min(1, 'Ingresa la URL de la foto.')
    .max(500, 'Ingresa una URL http(s):// válida o ruta /... para la foto (máx. 500 caracteres).')
    .regex(
      VALIDATION_PATTERNS.URL_OR_PATH,
      'Ingresa una URL http(s):// válida o ruta /... para la foto (máx. 500 caracteres).',
    ),
  youtubeUrl: z
    .string()
    .trim()
    .refine(
      (value) => Boolean(extractYouTubeId(value)),
      'Ingresa una URL o ID de YouTube válido (ej. https://www.youtube.com/watch?v=...).',
    ),
  description: z.string().trim().max(600, 'La descripción no puede superar los 600 caracteres.'),
});

export type FeaturedTrailerFormValues = z.infer<typeof featuredTrailerSchema>;

export const bulkDigitalKeysSchema = z
  .object({
    mode: z.enum(['auto', 'manual']),
    gameEditionId: z
      .string()
      .refine(
        (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
        'Selecciona una edición digital',
      ),
    quantity: z.string(),
    codesText: z.string(),
    batchId: z
      .string()
      .trim()
      .refine(
        (value) => !value || VALIDATION_PATTERNS.BATCH_ID.test(value),
        'El identificador de lote solo permite letras, números, guiones y guion bajo (2 a 50 caracteres).',
      ),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'manual') {
      const codes = data.codesText
        .split(/[\n,;]+/)
        .map((code) => code.trim())
        .filter(Boolean);
      if (codes.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['codesText'],
          message: 'Ingresa al menos una clave digital.',
        });
        return;
      }
      if (codes.some((code) => !VALIDATION_PATTERNS.DIGITAL_KEY_CODE.test(code))) {
        ctx.addIssue({
          code: 'custom',
          path: ['codesText'],
          message:
            'Cada clave debe tener formato alfanumérico separado por guiones (ej. ABCD-EFGH-IJKL-MNOP).',
        });
        return;
      }
      if (new Set(codes.map((code) => code.toUpperCase())).size !== codes.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['codesText'],
          message: 'La lista contiene códigos duplicados.',
        });
      }
      return;
    }

    const trimmedQty = data.quantity.trim();
    if (!/^\d+$/.test(trimmedQty)) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: 'La cantidad debe ser un número entero entre 1 y 100.',
      });
      return;
    }
    const quantity = Number(trimmedQty);
    if (quantity < 1 || quantity > 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: 'La cantidad debe estar entre 1 y 100.',
      });
    }
  });

export type BulkDigitalKeysFormValues = z.infer<typeof bulkDigitalKeysSchema>;

export const quickEditionSchema = z.object({
  editionName: z
    .string()
    .trim()
    .min(2, 'Ingresa un nombre de edición válido (2 a 100 caracteres)')
    .max(100, 'Ingresa un nombre de edición válido (2 a 100 caracteres)')
    .regex(
      VALIDATION_PATTERNS.ENTITY_NAME,
      'Ingresa un nombre de edición válido (2 a 100 caracteres)',
    ),
  platformId: z
    .string()
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
      'Selecciona una plataforma',
    ),
  basePrice: z
    .string()
    .trim()
    .refine((value) => {
      const price = Number(value);
      return (
        VALIDATION_PATTERNS.DECIMAL_PRICE.test(value) &&
        !Number.isNaN(price) &&
        price >= 0 &&
        price <= 99999.99
      );
    }, 'Ingresa un precio válido'),
  keysQty: z
    .string()
    .trim()
    .refine(
      (value) => /^\d+$/.test(value) && Number(value) >= 0 && Number(value) <= 100,
      'La cantidad de claves iniciales debe ser un entero entre 0 y 100',
    ),
  isDlc: z.boolean(),
});

export type QuickEditionFormValues = z.infer<typeof quickEditionSchema>;

const INITIAL_EDITION_FIELD_MAP: Record<string, keyof GameFormValues> = {
  editionName: 'initialEditionName',
  platformId: 'initialPlatformId',
  basePrice: 'initialPrice',
  keysQty: 'initialKeysQty',
  isDlc: 'initialIsDlc',
};

export const gameFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'El título es obligatorio')
      .max(200)
      .regex(VALIDATION_PATTERNS.ENTITY_NAME, 'El título contiene caracteres no válidos'),
    slug: z
      .string()
      .trim()
      .min(1, 'El slug es obligatorio')
      .max(220)
      .regex(
        VALIDATION_PATTERNS.SLUG,
        'El slug solo permite minúsculas, números y guiones (ej. the-last-of-us)',
      ),
    synopsis: z.string().trim().optional(),
    esrbRating: z
      .string()
      .trim()
      .max(10)
      .regex(
        VALIDATION_PATTERNS.ESRB_RATING,
        'Clasificación ESRB inválida (usa EC, E, E10+, T, M, AO o RP)',
      )
      .optional()
      .or(z.literal('')),
    releaseDate: z
      .string()
      .trim()
      .min(1, 'La fecha de lanzamiento es obligatoria')
      .regex(VALIDATION_PATTERNS.ISO_DATE, 'Formato de fecha inválido (AAAA-MM-DD)'),
    coverImageUrl: z
      .string()
      .trim()
      .max(255)
      .regex(VALIDATION_PATTERNS.URL_OR_PATH, 'Ingresa una URL http(s):// válida o ruta /...')
      .optional()
      .or(z.literal('')),
    publisherId: z.number({ error: 'Selecciona un publisher' }).min(1, 'Selecciona un publisher'),
    developerId: z
      .number({ error: 'Selecciona una desarrolladora' })
      .min(1, 'Selecciona una desarrolladora'),
    setupInitialEdition: z.boolean(),
    initialEditionName: z.string(),
    initialPlatformId: z.string(),
    initialPrice: z.string(),
    initialKeysQty: z.string(),
    initialIsDlc: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.setupInitialEdition) return;
    const parsed = quickEditionSchema.safeParse({
      editionName: data.initialEditionName,
      platformId: data.initialPlatformId,
      basePrice: data.initialPrice,
      keysQty: data.initialKeysQty,
      isDlc: data.initialIsDlc,
    });
    if (parsed.success) return;
    for (const issue of parsed.error.issues) {
      const mappedPath = INITIAL_EDITION_FIELD_MAP[String(issue.path[0] ?? '')];
      if (mappedPath) {
        ctx.addIssue({
          code: 'custom',
          path: [mappedPath],
          message: issue.message,
        });
      }
    }
  });

export type GameFormValues = z.infer<typeof gameFormSchema>;

export const reviewFormSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, 'Selecciona una calificación válida entre 1 y 5 estrellas.')
    .max(5, 'Selecciona una calificación válida entre 1 y 5 estrellas.'),
  title: z
    .string()
    .trim()
    .min(2, 'El título de la reseña debe tener entre 2 y 150 caracteres.')
    .max(150, 'El título de la reseña debe tener entre 2 y 150 caracteres.')
    .regex(
      /^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,!?¡¿'"()&:-]{2,150}$/,
      'El título de la reseña contiene caracteres no válidos.',
    ),
  body: z
    .string()
    .trim()
    .min(3, 'La reseña debe tener entre 3 y 2000 caracteres.')
    .max(2000, 'La reseña debe tener entre 3 y 2000 caracteres.'),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
