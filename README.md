# 🎮 Proyecto Keneth - Tienda de Videojuegos

Plataforma y API REST para distribución y venta de videojuegos desarrollada con **NestJS**, **TypeORM** y **MySQL**.

---

## 📁 Estructura del Repositorio

- **[`backend/`](backend/)**: Código fuente de la API REST construida con arquitectura modular en NestJS.
- **[`explicacion_proyecto.md`](explicacion_proyecto.md)**: Guía detallada y didáctica sobre la arquitectura, módulos y flujo de negocio del proyecto.
- **[`modelo_de_datos_tienda_de_videojuegos.md`](modelo_de_datos_tienda_de_videojuegos.md)**: Especificación completa del modelo relacional de la base de datos (15 entidades).

---

## 🚀 Puesta en Marcha del Backend

### 1. Requisitos
- Node.js (v20+)
- MySQL Server (puerto 3306)
- pnpm o npm

### 2. Configuración
1. Entra a la carpeta del backend:
   ```bash
   cd backend
   ```
2. Configura las variables de entorno:
   Crea o verifica el archivo `.env` tomando como referencia `.env.example`:
   ```env
   PORT=3000
   APP_TYPE=mysql
   APP_HOST=localhost
   APP_PORT=3306
   APP_USERNAME=root
   APP_PASSWORD=tu_contraseña
   APP_DATABASE=tienda_videojuegos
   ```

3. Instala las dependencias y corre el servidor:
   ```bash
   pnpm install
   pnpm run start:dev
   ```

Para más detalles sobre los endpoints y módulos disponibles, consulta [`backend/README.md`](backend/README.md).
