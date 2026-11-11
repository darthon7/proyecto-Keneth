# 🎮 Backend Tienda de Videojuegos (NestJS + TypeORM + MySQL)

API REST tradicional y modular desarrollada para la plataforma de distribución y venta de videojuegos.

## 🚀 Requisitos y Configuración

- **Node.js:** v20+ (probado en v24)
- **Base de Datos:** MySQL
  - Host: `localhost`
  - Puerto: `3306`
  - Usuario: `root`
  - Contraseña: `1111`
  - Base de datos: `tienda_videojuegos`

El archivo `.env` ya se encuentra configurado en la raíz de `backend/`.

## 📦 Instalación y Ejecución

```bash
# Entrar a la carpeta del backend
cd backend

# Instalar dependencias (con pnpm o npm)
pnpm install

# Compilar proyecto
pnpm run build

# Iniciar en modo desarrollo
pnpm run start:dev

# Iniciar en modo producción
pnpm run start:prod
```

## 🗺️ Módulos y Endpoints Disponibles

La API expone endpoints REST estándar para las 15 entidades del modelo de datos:

| Recurso | Ruta Base | Operaciones |
| :--- | :--- | :--- |
| **Publishers** | `/publishers` | CRUD (GET, POST, PATCH, DELETE) |
| **Developers** | `/developers` | CRUD (GET, POST, PATCH, DELETE) |
| **Genres** | `/genres` | CRUD (GET, POST, PATCH, DELETE) |
| **Platforms** | `/platforms` | CRUD (GET, POST, PATCH, DELETE) |
| **Games** | `/games` | CRUD + relaciones completas |
| **System Requirements** | `/system-requirements` | CRUD por juego y tier |
| **Game Editions (SKUs)** | `/game-editions` | CRUD + control de stock físico/digital |
| **Digital Keys** | `/digital-keys` | CRUD + asignación de claves |
| **Promotions** | `/promotions` | CRUD + cupones de descuento |
| **Users** | `/users` | CRUD + historial de compras y biblioteca |
| **Orders** | `/orders` | Creación de compras con asignación automática de CD-keys |
| **User Libraries** | `/user-libraries` | Consulta de biblioteca digital por usuario |
| **Wishlists** | `/wishlists` | Listas de deseos y notificaciones |
| **Reviews** | `/reviews` | Reseñas comunitarias y compras verificadas |
