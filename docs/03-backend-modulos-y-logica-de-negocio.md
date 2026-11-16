# 03. Backend (NestJS): Módulos, Endpoints REST y Lógica de Negocio

Este documento detalla la estructura interna de `backend/`, cada endpoint disponible y el funcionamiento exacto de las reglas de negocio críticas (especialmente órdenes transaccionales, llaves digitales, descuentos, cupones y reseñas).

---

## 1. Cómo funciona el código en base general (Nivel Técnico)

### 1.1 Arranque HTTP y Validación Global ([main.ts](../backend/src/main.ts))

El servidor NestJS arranca en el puerto `process.env.PORT || 3000` **sin prefijo global** (las rutas son directamente `/games`, `/orders`, `/auth/login`, etc.). Configura:
- **CORS habilitado** (`app.enableCors()`).
- **`ValidationPipe` global** con:
  - `whitelist: true` y `forbidNonWhitelisted: true`: rechaza con `400 Bad Request` cualquier propiedad extra no declarada en el DTO.
  - `transform: true` y `enableImplicitConversion: true`: convierte parámetros y DTOs a sus tipos esperados.

### 1.2 Utilidades transversales (`backend/src/common/`)

- **Paginación** ([pagination.util.ts](../backend/src/common/pagination.util.ts)): `normalizePagination({ limit, offset })` limita `take` al rango `[1, 200]` (por defecto `100`) y `skip >= 0` en listados de alto volumen (`games`, `orders`, `digital-keys`, `users`, `user-libraries`, `wishlists`, `reviews`).
- **Validación de rangos de fechas** ([date-validation.util.ts](../backend/src/common/date-validation.util.ts)): `validateActivationDateRange()` valida que la fecha de fin sea estrictamente posterior a la fecha de inicio y que las fechas de activación o modificación no sean anteriores al inicio del día actual (`getStartOfToday()`). Se utiliza tanto en `PromotionsService` como en `GamesService`.

### 1.3 Mapa completo de Endpoints y Módulos

| Módulo / Controlador | Ruta base | Endpoints y Permisos | Archivo |
| :--- | :--- | :--- | :--- |
| `AppController` | `/` | `GET /` (Público), `GET /admin/summary` (`ADMIN`), `GET /seed` (`ADMIN`) | [app.controller.ts](../backend/src/app.controller.ts) |
| `AuthModule` | `/auth` | `POST /auth/login` (Público + RateLimit), `POST /auth/register` (Público + RateLimit), `GET /auth/me` (JWT) | [auth.controller.ts](../backend/src/auth/auth.controller.ts) |
| `PublishersModule` | `/publishers` | `GET /`, `GET /:id` (Público); `POST`, `PATCH /:id`, `DELETE /:id` (`ADMIN`) | [publishers.controller.ts](../backend/src/publishers/publishers.controller.ts) |
| `DevelopersModule` | `/developers` | `GET /`, `GET /:id` (Público); `POST`, `PATCH /:id`, `DELETE /:id` (`ADMIN`) | [developers.controller.ts](../backend/src/developers/developers.controller.ts) |
| `GenresModule` | `/genres` | `GET /`, `GET /:id` (Público); `POST`, `PATCH /:id`, `DELETE /:id` (`ADMIN`) | [genres.controller.ts](../backend/src/genres/genres.controller.ts) |
| `PlatformsModule` | `/platforms` | `GET /`, `GET /:id` (Público); `POST`, `PATCH /:id`, `DELETE /:id` (`ADMIN`) | [platforms.controller.ts](../backend/src/platforms/platforms.controller.ts) |
| `GamesModule` | `/games` | `GET /` (paginado), `GET /:id` (Público); `POST`, `POST /discount-campaign`, `PATCH /:id`, `DELETE /:id` (`ADMIN`) | [games.controller.ts](../backend/src/games/games.controller.ts) |
| `SystemRequirementsModule` | `/system-requirements` | `GET /`, `GET /:id` (Público); `POST`, `PATCH /:id`, `DELETE /:id` (`ADMIN`) | [system-requirements.controller.ts](../backend/src/system-requirements/system-requirements.controller.ts) |
| `GameEditionsModule` | `/game-editions` | `GET /`, `GET /:id` (Público); `POST`, `PATCH /:id`, `DELETE /:id` (`ADMIN`) | [game-editions.controller.ts](../backend/src/game-editions/game-editions.controller.ts) |
| `DigitalKeysModule` | `/digital-keys` | Todo `ADMIN`: `POST /`, `POST /bulk`, `GET /` (paginado), `GET /:id`, `PATCH /:id`, `DELETE /:id` | [digital-keys.controller.ts](../backend/src/digital-keys/digital-keys.controller.ts) |
| `PromotionsModule` | `/promotions` | `GET /` (`@Public()` + JWT opcional), `GET /my` (JWT), `GET /:id` (Público); `POST`, `PATCH /:id`, `DELETE /:id` (`ADMIN`) | [promotions.controller.ts](../backend/src/promotions/promotions.controller.ts) |
| `UsersModule` | `/users` | `POST /`, `GET /` (filtro `role`, paginado), `PATCH /:id/role`, `DELETE /:id` (`ADMIN`); `GET /:id`, `PATCH /:id` (Dueño o `ADMIN`) | [users.controller.ts](../backend/src/users/users.controller.ts) |
| `OrdersModule` | `/orders` | `POST /`, `POST /:id/confirm-payment`, `GET /`, `GET /user/:userId`, `GET /:id` (Dueño o `ADMIN`); `PATCH /:id`, `DELETE /:id` (`ADMIN`) | [orders.controller.ts](../backend/src/orders/orders.controller.ts) |
| `UserLibrariesModule` | `/user-libraries` | `GET /user/:userId`, `GET /:id` (Dueño o `ADMIN`); `POST`, `GET /`, `PATCH /:id`, `DELETE /:id` (`ADMIN`) | [user-libraries.controller.ts](../backend/src/user-libraries/user-libraries.controller.ts) |
| `WishlistsModule` | `/wishlists` | `POST /`, `GET /user/:userId`, `GET /:id`, `PATCH /:id`, `DELETE /:id` (Dueño o `ADMIN`); `GET /` (`ADMIN`) | [wishlists.controller.ts](../backend/src/wishlists/wishlists.controller.ts) |
| `ReviewsModule` | `/reviews` | `GET /`, `GET /game/:gameId`, `GET /:id` (Público); `POST /`, `PATCH /:id`, `DELETE /:id` (Dueño o `ADMIN`) | [reviews.controller.ts](../backend/src/reviews/reviews.controller.ts) |
| `FeaturedTrailersModule` | `/featured-trailers` | `GET /` (Público); `PUT /:slot`, `DELETE /:slot` (`ADMIN`, slots `1`, `2` o `3`) | [featured-trailers.controller.ts](../backend/src/featured-trailers/featured-trailers.controller.ts) |

---

### 1.4 Lógica de Negocio Crítica en los Servicios

#### A. Motor Transaccional de Órdenes ([orders.service.ts](../backend/src/orders/orders.service.ts))

Es el corazón transaccional de la aplicación. Separa la **creación/reserva** (`create`) de la **confirmación de pago** (`confirmPayment`), ambas ejecutadas dentro de `this.dataSource.transaction(...)` para garantizar atomicidad (ACID):

1. **`OrdersService.create(createOrderDto, { isAdmin })`**:
   - Valida que `items` no esté vacío (`quantity` entero entre 1 y 50 según `OrderItemDto`).
   - Si viene `couponCode`:
     - Busca el cupón con `PromotionsService.findByCoupon(code, userId)` (normalizado a mayúsculas, `isActive === true`, vigente entre `startDate` y `endDate`, y que sea global `userId: null` o perteneciente a ese `userId`).
     - Verifica con `hasUserClaimed()` que no exista un registro previo en `coupon_redemptions` para `(promotion.id, userId)`.
   - Determina el estado inicial según rol:
     - Si es `CUSTOMER`, **fuerza** `effectivePaymentStatus = PaymentStatus.PENDING` e ignora `paymentGatewayRef` (no permite crear órdenes ya pagadas directamente desde el cliente).
     - Si es `ADMIN`, permite `COMPLETED` (por defecto) o `PENDING`. Rechaza `FAILED`/`REFUNDED`.
   - Dentro de la transacción de base de datos:
     - Para cada ítem solicitado, bloquea la fila de `GameEdition` con `lock: { mode: 'pessimistic_write' }`.
     - **Cálculo autoritativo de precios y doble descuento**:
       1. Verifica si el `Game` tiene una campaña de descuento activa (`discountPercentage > 0` y fechas vigentes).
       2. Aplica primero el descuento de campaña sobre `edition.basePrice` → `priceAfterCampaign`.
       3. Aplica después el porcentaje del cupón sobre `priceAfterCampaign` → `finalSubtotalPerUnit`.
       4. Calcula `discountPerUnit = unitPrice - finalSubtotalPerUnit`.
     - Consulta y bloquea (`pessimistic_write`) exactamente `quantity` registros de `DigitalKey` en estado `AVAILABLE` ordenados por `id ASC`. Si no hay suficientes, aborta toda la transacción (`400 Bad Request`).
     - Cambia el estado de esas llaves a `RESERVED` (si `PENDING`) o `ASSIGNED` (si `COMPLETED`).
     - Genera `orderNumber` (`ORD-<timestamp>-<random>`) y guarda la entidad `Order`.
     - Si se aplicó cupón, vuelve a comprobar dentro de la transacción que no haya sido reclamado e inserta la fila en `CouponRedemption`.
     - Crea **un `OrderItem` por cada clave digital asignada** (si se compró cantidad 2, se crean 2 `OrderItem`, cada uno ligado a su `DigitalKey` individual).
     - Si el pago nació como `COMPLETED` (caso admin), crea 1 entrada en `UserLibrary` por cada `gameEdition.id` distinto.
     - Devuelve `{ order, items }` con `user` sanitizado.

2. **`OrdersService.confirmPayment(orderId)`**:
   - Bloquea la orden (`pessimistic_write`) y exige que su `paymentStatus` sea `PENDING`.
   - Actualiza `paymentStatus = PaymentStatus.COMPLETED` y genera `paymentGatewayRef = PAY-<timestamp>-<orderId>`.
   - Recorre los `items`: cambia cada `DigitalKey` en estado `RESERVED` a `ASSIGNED` y crea una entrada en `UserLibrary` (`isRevoked: false`) por cada `gameEdition` distinta.

3. **`OrdersService.remove(id)`**:
   - Dentro de una transacción con bloqueo `pessimistic_write`, si la orden tenía claves en estado `RESERVED`, las libera devolviéndolas a `AVAILABLE` antes de eliminar la orden.

*(Nota técnica: `OrdersService.update()` permite a un `ADMIN` modificar `paymentStatus` o `paymentGatewayRef` directamente mediante `merge` + `save` para gestión operativa, sin ejecutar la lógica de liberación/asignación de llaves de `confirmPayment`/`remove`).*

#### B. Gestión de Claves Digitales ([digital-keys.service.ts](../backend/src/digital-keys/digital-keys.service.ts))

- **`createBulk(bulkDto)`** (`POST /digital-keys/bulk`):
  - Acepta **modo manual** (`codes: string[]`, sin duplicados en el lote ni colisiones en BD) o **modo automático** (`quantity` entre 1 y 100).
  - Para generar códigos aleatorios usa `crypto.randomInt` sobre el alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (omite caracteres confusos como `0`, `O`, `1`, `I`) en formato `XXXX-XXXX-XXXX-XXXX`.
  - Calcula el hash `SHA-256` (`codeHash`) de cada código, verifica colisiones contra la BD y guarda el lote en estado `AVAILABLE` con `batchId`.

#### C. Campañas Masivas de Descuento ([games.service.ts](../backend/src/games/games.service.ts))

- **`applyDiscountCampaign(dto)`** (`POST /games/discount-campaign`):
  - Recibe `gameIds[]`, `discountPercentage` (`0` a `95`), `discountCampaignName` y fechas opcionales `discountStartDate` / `discountEndDate`.
  - Si `discountPercentage <= 0`, **retira la campaña** limpiando nombre, porcentaje (`0`) y fechas en todos los juegos seleccionados.
  - Si es mayor a 0, valida el rango de fechas con `validateActivationDateRange()` y actualiza en bloque todos los juegos encontrados.

#### D. Cupones Personales, Globales y Reseñas Verificadas

- **`PromotionsService`** ([promotions.service.ts](../backend/src/promotions/promotions.service.ts)):
  - `GET /promotions` (`findAll`) devuelve únicamente cupones globales (`userId IS NULL`). Si el usuario envió un token válido, `attachUsageMetadata()` marca `isClaimed: true/false` y `usageLimitPerUser: 1`.
  - `GET /promotions/my` (`findForUser`) devuelve tanto los cupones globales como los personales (`userId = currentUser.id`, por ejemplo `BIENVENIDA10` creado automáticamente en `AuthService.register()`).
- **`ReviewsService.create`** ([reviews.service.ts](../backend/src/reviews/reviews.service.ts)):
  - Impide que un usuario publique más de una reseña por juego.
  - Consulta `UserLibrary` buscando si el usuario tiene al menos una edición de ese `gameId` con `isRevoked: false`; el resultado determina automáticamente `isVerifiedPurchase`.
- **`FeaturedTrailersService`** ([featured-trailers.service.ts](../backend/src/featured-trailers/featured-trailers.service.ts)):
  - Valida que `slot` sea estrictamente `1`, `2` o `3` y realiza `upsert` o borrado por espacio.

---

## 2. Explicación fácil de entender

Si el backend fuera las oficinas internas de la tienda, cada módulo sería un departamento especializado:

- **La Recepción (`main.ts` y `ValidationPipe`)**: Antes de pasar cualquier solicitud a los departamentos, revisa el formulario. Si falta un dato obligatorio o alguien intenta colar campos inventados (como querer enviar un precio falso en una compra), la recepción lo rechaza en la puerta.
- **El Departamento de Precios y Ofertas (`GamesService` y `PromotionsService`)**:
  - El cliente nunca decide cuánto cuesta algo. Aunque alguien manipule la pantalla del navegador, la caja registradora siempre busca el precio real de la edición en la base de datos.
  - Si el juego tiene una oferta directa (por ejemplo `-30%`) **y además** el cliente trae un cupón (por ejemplo `BIENVENIDA10` del `-10%`), la caja aplica primero la oferta del juego y sobre ese precio rebajado aplica el cupón, garantizando que ese cupón quede marcado como "ya usado" para esa cuenta.
- **La Bodega de Llaves (`DigitalKeysService`)**:
  - Guarda las claves únicas (como `K7QP-9M4X-2WVT-8NJR`). El administrador puede pedirle: *"fabrica 50 llaves nuevas para Elden Ring PC"* y la bodega las crea al instante evitando códigos repetidos o letras fáciles de confundir como la `O` y el `0`.
- **La Caja Registradora Blindada (`OrdersService`)**:
  - ¿Qué pasa si dos personas intentan comprar la **última** clave disponible exactamente en el mismo milisegundo?
  - El código pone un **candado temporal** (`pessimistic_write`) sobre la fila de esa clave mientras atiende al primer comprador. El segundo espera un instante; cuando el primero termina, el segundo ve que ya no quedan claves y recibe un aviso limpio de "sin stock" en lugar de venderse la misma clave a dos personas.
  - Además, la compra ocurre en dos pasos seguros: primero se **aparta** la clave (`PENDING` / `RESERVED`), y al confirmarse el pago se **entrega** (`COMPLETED` / `ASSIGNED`) y se guarda el juego en la Biblioteca del cliente. Si una orden pendiente se borra antes de pagarse, las claves apartadas regresan al estante (`AVAILABLE`).
- **El Verificador de Opiniones (`ReviewsService`)**:
  - Cualquiera con cuenta puede dejar una reseña, pero solo quien realmente tiene el juego en su Biblioteca recibe la etiqueta de **Compra Verificada**, porque el servidor comprueba el historial real de biblioteca antes de publicar el comentario.
