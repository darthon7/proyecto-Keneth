# 04. Frontend (SPA React 19): Arquitectura, Capas y Pantallas

Este documento explica cómo está construido el frontend en `frontend/`, cómo administra su estado y caché, cómo genera formularios administrativos de forma reutilizable y qué hace cada pantalla.

---

## 1. Cómo funciona el código en base general (Nivel Técnico)

### 1.1 Stack, Arranque y Proveedores ([main.tsx](../frontend/src/main.tsx) y [vite.config.ts](../frontend/vite.config.ts))

- **Build y Dev Server**: Vite 8 en puerto `5173`, alias `@ -> ./src`, Tailwind CSS v4 (`@tailwindcss/vite`) y proxy opcional `/api` hacia `VITE_API_TARGET` (`http://localhost:3000`). Por defecto, `apiClient` apunta directamente a `import.meta.env.VITE_API_URL ?? 'http://localhost:3000'`.
- **Árbol de Proveedores en `main.tsx`**:
  1. `QueryClientProvider` (TanStack Query con `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000` ms).
  2. `BrowserRouter` (React Router v7).
  3. `SessionProvider` (autenticación JWT y usuario activo).
  4. `CartProvider` (carrito persistente).

### 1.2 Capa de API y Manejo de Errores (`frontend/src/api/`)

- **[client.ts](../frontend/src/api/client.ts)**:
  - Crea `apiClient` (Axios con `timeout: 20_000`).
  - **Interceptor de petición**: lee `keneth.authToken` de `localStorage` y agrega `Authorization: Bearer <token>`.
  - **Interceptor de respuesta**: si recibe `401` en una petición autenticada (fuera de `/auth/login` y `/auth/register`), limpia el token y notifica a `SessionProvider` vía `onUnauthorized()` + evento custom `keneth:unauthorized`. Convierte cualquier error de Axios o de red en `ApiError(message, status, details)` con mensajes legibles en español.
- **[resources.ts](../frontend/src/api/resources.ts)**:
  - Define la fábrica genérica `crud<T, TCreate, TUpdate>(resource)` que expone `list()`, `get(id)`, `create(payload)`, `update(id, payload)` y `remove(id)` para todos los recursos estándar.
  - Exporta servicios extendidos para endpoints especiales: `authApi` (`/auth/*`), `ordersApi` (modelando que `POST /orders` retorna `{ order, items }`), `ordersExtraApi.confirmPayment`, `reviewsExtraApi.byGame`, `userLibrariesExtraApi.byUser`, `wishlistsExtraApi.byUser`, `usersExtraApi.updateRole`, `adminApi.summary`, `digitalKeysExtraApi.createBulk`, `gamesExtraApi.applyDiscountCampaign`, `promotionsExtraApi.myCoupons` y `featuredTrailersApi` (`list`, `upsertSlot`, `removeSlot`).

### 1.3 Estado Global (Contextos)

- **`SessionContext`** ([SessionContext.tsx](../frontend/src/context/SessionContext.tsx)):
  - Mantiene `token` en estado + `localStorage`.
  - Ejecuta `useQuery(['auth', 'me', token])` para hidratar `currentUser`.
  - Expone `{ currentUser, currentUserId, token, isAdmin, isLoading, error, setSession, logout }`.
  - Limpia todas las queries protegidas de React Query al cerrar sesión.
- **`CartContext`** ([CartContext.tsx](../frontend/src/context/CartContext.tsx)):
  - Persiste `CartItem[]` (`{ gameEditionId: number, quantity: number }`) en `localStorage` (`keneth.cart`), normalizando cantidades entre `1` y `50`.
  - No guarda precios ni nombres en `localStorage`; las páginas de carrito y checkout cruzan esos IDs contra `gameEditionsApi.list()` para obtener siempre precios y descuentos actualizados del servidor.

### 1.4 Sistema de Diseño y Atomic Design

- **Estilos** ([index.css](../frontend/src/index.css)): Paleta *Retro Pop / Indie* clara (`#F4F4F6` fondo, `#FFFFFF` tarjetas, `#1E1B4B` índigo de contraste en cabecera/pie/sidebar, `#FF2A5F` acento principal rosa/rojo, `#FFC700` dorado secundario) con tipografías `Inter` + `Outfit` y microinteracciones `btn-nintendo-animation` / `btn-nintendo-shine` (respetando `prefers-reduced-motion`).
- **Componentes por nivel**:
  - `components/atoms/`: `Badge`, `BrandLogo`, `Button`, `Checkbox`, `CoverSlot`, `EmptyState`, `ErrorBanner`, `Input`, `Modal`, `RatingStars`, `SectionHeader`, `Select`, `Spinner`, `Textarea`.
  - `components/molecules/`: `NavBar` (con buscador global `Ctrl+K`, carrito con contador, botón condicional `Panel de Control` si `isAdmin` y menú de usuario; se oculta automáticamente en `/admin/*`), `HeroBannerCarousel`, `LoginModal` (tabs Login / Registro con Zod), `WelcomeCouponPopup` (aviso flotante de `BIENVENIDA10` descartable en `sessionStorage`), `GameCard`, `GameFilters`, `VideoShowcaseSection`, `BudgetSection`, `AccountHeroHeader`, `Pagination`, `Footer`.
  - `components/organisms/`: `AdminRouteGuard`, `AdminControlPanelLayout`, `CrudResourcePage`, `GameFormModal`, `GameStockModal`, `GameReviewsSection`, `ProfileSettingsForm`, `UserProfileTabs`.

### 1.5 Motor Declarativo CRUD ([CrudResourcePage.tsx](../frontend/src/components/organisms/CrudResourcePage.tsx) y [fields.ts](../frontend/src/utils/fields.ts))

Para evitar duplicar formularios y tablas en las pantallas administrativas, `CrudResourcePage` recibe props declarativas (`queryKey`, `fetchList`, `createItem`, `updateItem`, `deleteItem`, `fields: FieldConfig[]`, `columns: CrudColumn<T>[]`) y delega en `fields.ts`:
- `buildSchema(fields, { mode, initialValues })`: genera dinámicamente el esquema **Zod** (tipos, longitudes, regex `VALIDATION_PATTERNS`, fechas `notBeforeToday` y dependencia `afterField`).
- `buildInitialValues(fields, source)`: rellena valores por defecto o de edición.
- `buildPayload(values, fields)`: limpia cadenas vacías, convierte `datetime-local` a ISO 8601 y castea `select` numéricos.

### 1.6 Utilidades y Hooks Compartidos en Frontend

- **[domain.ts](../frontend/src/utils/domain.ts)**: centraliza metadatos de estado (`PAYMENT_STATUS_META`) y helpers compartidos de catálogo (`isNintendoTitle`, `getLowestEdition`, `getMinBasePrice`, `countAvailableKeys`).
- **[useCartSummary.ts](../frontend/src/hooks/useCartSummary.ts)**: unifica la carga de ediciones, validación de cupones vigentes y cálculo de subtotal, descuento y total entre `OrdersPage` y `CheckoutPage`.
- **[useCopyFeedback.ts](../frontend/src/hooks/useCopyFeedback.ts)**: encapsula la copia al portapapeles con confirmación temporal de 2 segundos y limpieza automática de timers (`HomePage`, `MyCouponsPage`, `OrderDetailPage`, `LibraryPage`).
- **[discount.ts](../frontend/src/utils/discount.ts)**:
  - `getActiveGameDiscount(game)`: evalúa `discountPercentage > 0` y vigencia entre `discountStartDate` y `discountEndDate` para calcular el precio rebajado en tarjetas, detalle y carrito.
  - `getCouponStatus(promotion)`: clasifica cada cupón en `'active'`, `'expiring_soon'` (faltan `<= 7 días`) o `'expired'`.
- **[youtube.ts](../frontend/src/utils/youtube.ts)**: `extractYouTubeId(input)` extrae el ID de 11 caracteres desde URLs de `youtube.com/watch?v=`, `youtu.be/`, `/embed/`, `/shorts/` o IDs directos.
- **[format.ts](../frontend/src/utils/format.ts)**: formateo de moneda (`es-MX`, `MXN`), fechas (`es-MX`), conversión de fechas locales/ISO y humanización de enums (`UPPER_SNAKE` → legible).

### 1.7 Mapa Completo de Rutas ([App.tsx](../frontend/src/App.tsx))

Todas las páginas se cargan con `React.lazy` dentro de `<Suspense>`.

#### Rutas Públicas y de Cliente
| Ruta | Página | Qué hace |
| :--- | :--- | :--- |
| `/` | `HomePage` | Carrusel hero de 3 slides (5s), grid top 8 con pestañas (`Novedades`, `Más Económicos`, `Alfabético`, `Todos`), `VideoShowcaseSection`, `BudgetSection` ($5/$10/$15/$20) y cupones activos con botón de copiar. |
| `/games` | `GamesPage` | Catálogo completo paginado (`12` por página) con búsqueda y 4 filtros sincronizados en URL (`q`, `genreId`, `platformId`, `maxPrice`, `developerId`). Resuelve plataforma cruzando `game-editions`. |
| `/games/:id` | `GameDetailPage` | Ficha del título: portada + botón Wishlist, metadatos, pestañas (`Descripción`, `Ediciones`, `Requisitos`), tarjeta de compra con selector de edición, stock real de claves `AVAILABLE` y sección de reseñas con modal de publicación. |
| `/promotions` | `PromotionsPublicPage` | Lista todos los videojuegos con campaña de descuento activa ordenados de mayor a menor descuento. |
| `/orders` | `OrdersPage` | Dos pestañas (`Mi Carrito` y `Historial de Compras` vía `?tab=history`), validación en vivo de cupón y acceso al checkout. |
| `/checkout` | `CheckoutPage` | Formulario de tarjeta de prueba con validaciones estrictas. Ejecuta `POST /orders` + `POST /orders/:id/confirm-payment`, vacía el carrito e invalida cachés. |
| `/orders/:id` | `OrderDetailPage` | Recibo detallado de la orden con llaves digitales copiables; si el usuario es `ADMIN`, muestra selector de estado y botón para eliminar orden. |
| `/library` | `LibraryPage` | Colección digital del usuario (`GET /user-libraries/user/:id`), filtros (`all`, `active`, `revoked`), buscador y visor seguro de claves enmascaradas (`••••-••••-••••-XXXX`) con botones **Revelar/Ocultar** y **Copiar**. |
| `/wishlist` | `WishlistPage` | Lista de deseados con aviso de ofertas activas, interruptor `notifyOnSale`, compra rápida y eliminación. |
| `/my-coupons` | `MyCouponsPage` | Cupones globales + personales (`GET /promotions/my`) filtrados por `all`, `available`, `claimed` y `expired`, con alerta visual para cupones por vencer. |
| `/users/:id` | `UserProfilePage` | Perfil completo con hero de usuario, resumen de gasto, pestañas (`Resumen`, `Biblioteca`, `Órdenes`, `Wishlist`, `Reseñas`) y edición de datos/contraseña (`PATCH /users/:id`). |
| `/reviews` | Redirección | Redirige automáticamente a `/games`. |
| `*` | `NotFoundPage` | Pantalla 404. |

#### Panel de Control Administrativo (`/admin/*` bajo `AdminRouteGuard` + `AdminControlPanelLayout`)
Cuando la ruta empieza con `/admin`, `NavBar` se oculta para dar paso a la consola con barra lateral fija:

| Ruta | Página | Implementación |
| :--- | :--- | :--- |
| `/admin` | `AdminOverviewPage` | 6 KPIs desde `GET /admin/summary` + alertas de reposición de stock ordenadas por ediciones con menos claves `AVAILABLE`. |
| `/admin/games` | `GamesAdminPage` | Tabla con stock consolidado, modal de juego (auto-slug, géneros, edición + lote inicial opcional) y modal **"Stock y Claves"** para añadir ediciones y generar lotes de claves inline. |
| `/admin/developers` | `DevelopersPage` | `CrudResourcePage` |
| `/admin/publishers` | `PublishersPage` | `CrudResourcePage` |
| `/admin/genres` | `GenresPage` | `CrudResourcePage` |
| `/admin/platforms` | `PlatformsPage` | `CrudResourcePage` |
| `/admin/editions` | `EditionsPage` | `CrudResourcePage` (muestra stock disponible por edición) |
| `/admin/digital-keys` | `DigitalKeysPage` | `CrudResourcePage` + filtros por edición/estado + modal **"Generar / Cargar Lote"** (`POST /digital-keys/bulk`). |
| `/admin/system-requirements` | `SystemRequirementsPage` | `CrudResourcePage` |
| `/admin/promotions` | `PromotionsPage` | `CrudResourcePage` (cupones de descuento con validación de fechas). |
| `/admin/discount-campaigns` | `DiscountCampaignsPage` | Selección múltiple de juegos para aplicar o retirar campañas masivas (`POST /games/discount-campaign`) con vista previa de precio rebajado. |
| `/admin/featured-trailers` | `FeaturedTrailersPage` | Configuración de los 3 espacios de tráiler (`1`, `2`, `3`) con previsualización de miniatura de YouTube. |
| `/admin/orders` | `AdminOrdersPage` | Tabla global de órdenes con filtro por `PaymentStatus`, cambio rápido de estado y acceso al detalle. |
| `/catalog/*` | Redirecciones | Rutas legacy protegidas con `AdminRouteGuard` que redirigen a `/admin/*`. |

---

## 2. Explicación fácil de entender

Si el backend es la oficina y la bodega, **el frontend es toda la experiencia visual que corre dentro de tu navegador**:

- **¿Por qué carga tan rápido al cambiar de pantalla?**
  1. `App.tsx` usa carga perezosa (`lazy`): si entras a la portada, no descarga el código del Panel de Control Administrativo hasta que un administrador entre allí.
  2. `TanStack Query` actúa como una **memoria de corto plazo inteligente**: si acabas de entrar a un juego y vuelves atrás, no vuelve a pedir todo desde cero al servidor innecesariamente, y cuando compras o editas algo, "invalida" esa memoria para mostrar los datos frescos al instante.
- **¿Cómo recuerda el carrito tus juegos sin que hayas iniciado sesión?**
  `CartContext` guarda únicamente una lista muy pequeña en el navegador (`localStorage`), por ejemplo: *"edición #4, cantidad 1"*. No guarda el precio ahí; cada vez que abres `/orders` o `/checkout`, pregunta los precios reales del servidor para que siempre veas las ofertas vigentes.
- **¿Por qué en el catálogo hay bloques pequeños como `Button`, tarjetas como `GameCard` y pantallas grandes?**
  El código sigue la filosofía **Atomic Design**: primero construye piezas básicas (`atoms`: botones, inputs, estrellas), luego las combina en bloques con sentido (`molecules`: tarjeta de juego, barra de navegación, filtros) y finalmente arma estructuras completas (`organisms`: la tabla CRUD universal o el panel administrativo).
- **El secreto de la productividad en el panel Admin (`CrudResourcePage`)**:
  En lugar de programar 8 pantallas administrativas casi idénticas desde cero, los desarrolladores crearon una "plantilla inteligente" (`CrudResourcePage` + `fields.ts`). Para crear la pantalla de *Géneros*, *Plataformas* o *Publishers*, solo le pasan una lista de qué columnas mostrar y qué campos validar, y la plantilla dibuja automáticamente la tabla, los botones de editar/eliminar, el formulario emergente y sus reglas de error.
- **¿Cómo protege tus claves en "Mi Biblioteca"?**
  Aunque tu clave ya te pertenece, `LibraryPage` la muestra tapada por seguridad (`••••-••••-••••-8NJR`) para que nadie que mire tu pantalla la copie por accidente; solo se descubre al pulsar **"Revelar clave"** o se va directo al portapapeles con **"Copiar"**.
