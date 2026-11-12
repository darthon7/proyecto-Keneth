# 🎮 Keneth — Frontend (Tienda de Videojuegos)

Frontend **SPA** que consume la API REST del backend NestJS (`backend/`) **sin modificarlo**.
El diseño sigue el sistema visual *SoundCloud dark* descrito en [`../DESIGN.md`](../DESIGN.md).

---

## ⚙️ Requisitos

- Node.js 20+ (probado con Node 24)
- Backend NestJS ejecutándose en `http://localhost:3000` (ver [`../README.md`](../README.md))

## 🚀 Puesta en marcha

```bash
cd frontend
npm install
cp .env.example .env     # ajusta VITE_API_URL si el backend no está en localhost:3000
npm run dev              # http://localhost:5173
```

> **Nota sobre la URL base**: el backend **no** define un prefijo global (`setGlobalPrefix`),
> por lo que las rutas reales son `http://localhost:3000/games`, `/orders`, etc.
> `VITE_API_URL` debe apuntar a la raíz del backend (sin `/api`).
> Si prefieres trabajar contra `/api`, el proxy de Vite (`/api` → backend) ya está configurado
> en `vite.config.ts` y también acepta `VITE_API_TARGET`.

## 📜 Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo con HMR en el puerto 5173 |
| `npm run build` | `tsc --noEmit` + build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción |
| `npm run typecheck` | Verificación de tipos |
| `npm run lint` | `oxlint` sobre `src/` |
| `npm test` | Tests unitarios y de componentes con Vitest |

## 🗂️ Estructura

```
src/
  api/          # Cliente axios + un servicio por recurso (contrato con el backend)
  components/
    atoms/      # Button, Input, Select, Textarea, Checkbox, Badge, Modal, Spinner…
    molecules/  # NavBar, SearchBar, GameCard, GameFilters, Pagination, Footer…
    organisms/  # HeroSection, GameGrid, CrudResourcePage
  context/      # SessionContext (usuario activo) y CartContext (carrito persistido)
  hooks/        # useDebounce
  pages/        # Home, Games, GameDetail, catalog/*, Orders, Users, Library, Wishlist, Reviews
  types/        # Interfaces + enums alineados con las entidades y DTOs del backend
  utils/        # format.ts (fechas/moneda) y fields.ts (configuración declarativa de formularios)
```

## 🔌 Endpoints consumidos

Todos los recursos del backend están conectados:

| Recurso | Endpoints |
|---------|-----------|
| Publishers | `GET/POST/PATCH/DELETE /publishers` |
| Developers | `GET/POST/PATCH/DELETE /developers` |
| Genres | `GET/POST/PATCH/DELETE /genres` |
| Platforms | `GET/POST/PATCH/DELETE /platforms` |
| Games | `GET/POST/PATCH/DELETE /games` (+ relaciones publisher, developer, genres) |
| System Requirements | `GET/POST/PATCH/DELETE /system-requirements` |
| Game Editions | `GET/POST/PATCH/DELETE /game-editions` |
| Digital Keys | `GET/POST/PATCH/DELETE /digital-keys` |
| Promotions | `GET/POST/PATCH/DELETE /promotions` |
| Users | `GET/POST/PATCH/DELETE /users` |
| Orders | `GET/POST/PATCH/DELETE /orders` (la creación devuelve `{ order, items }`) |
| User Libraries | `GET /user-libraries`, `GET /user-libraries/user/:userId` |
| Wishlists | `GET/POST/PATCH/DELETE /wishlists`, `GET /wishlists/user/:userId` |
| Reviews | `GET/POST/PATCH/DELETE /reviews`, `GET /reviews/game/:gameId` |

### Particularidades del contrato

- `GET /games` devuelve las ediciones **sin** la relación `platform`; el filtro por plataforma se
  resuelve con `GET /game-editions` (que sí incluye `platform` y `game`).
- `POST /orders` responde `{ order, items }`, no la entidad plana: `ordersApi.create` lo modela así.
- El backend asigna la llave digital y el descuento por cupón dentro de `OrdersService`; el frontend
  solo envía `couponCode` e `items`.
- Las llaves digitales usan **UUID** (`id: string`), el resto de entidades usan `id: number`.
- No existe autenticación en el backend: el frontend permite elegir el *usuario activo* desde la barra
  superior (`SessionContext`) para operar la biblioteca, la wishlist y el checkout.

## 🎨 Sistema de diseño

Los tokens de `DESIGN.md` están declarados en `src/index.css` con `@theme` de Tailwind v4:

- Fondos `#121212` (obsidian) / `#303030` (graphite), texto `#ffffff` / `#999999` (fog).
- `#699fff` (signal blue) **solo** para enlaces y acentos; los CTA son blancos.
- Radio de 4px en botones, inputs y badges; sin sombras ni degradados en superficies.
- Grid de 6 columnas para las tarjetas de juego (2 en móvil, 3 en tablet).
- Tipografía Inter como sustituta de Söhne, con peso 100 para los titulares display.

## 🧪 Testing

```bash
npm test
```

Cubre la capa de formularios (`buildSchema`, `buildPayload`, `buildInitialValues`), el render de
`GameCard` y el flujo CRUD de `CrudResourcePage` (listar, crear con validación y bloquear envíos
inválidos).

---

*Frontend developed con React 19, Vite 8, Tailwind CSS v4, TanStack Query, React Hook Form y Zod.*
