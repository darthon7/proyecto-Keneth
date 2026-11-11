# Especificación del Modelo de Datos: Tienda Web de Videojuegos

Documento de diseño arquitectónico y relacional para una plataforma de distribución y venta de videojuegos (digitales y físicos), con soporte para claves de activación (CD-keys), listas de deseos, promociones temporales y control de biblioteca de usuarios.

---

## 1. Diagrama Conceptual de Dominio

```
[Publisher] ──< [Game] >── [Developer]
                  │   \
            [Genre]    ──< [SystemRequirement]
               ▲
               │ (N:M via game_genres)
               │
            [GameEdition] >── [Platform]
             /    │     \
    [DigitalKey]  │    [Wishlist] >── [User]
                  │                     │
            [OrderItem] >── [Order] ────┤
                  │                     │
            [Promotion]           [UserLibrary]
                                        │
                                    [Review]
```

---

## 2. Catálogo Detallado de Entidades (15 Entidades)

### Módulo A: Catálogo Base y Metadatos

#### 1. `Publisher` (Distribuidora / Editora)
Entidad jurídica que financia, comercializa y ostenta los derechos de distribución del juego.
* **Atributos:**
  * `id`: Clave primaria (UUID / BIGINT).
  * `name`: Razón social o nombre comercial.
  * `website_url`: Sitio web corporativo.
  * `support_email`: Correo de contacto técnico/comercial.
  * `country`: País de residencia fiscal.

#### 2. `Developer` (Estudio Desarrollador)
Equipo técnico o estudio independiente creador del software. Se mantiene desacoplado de la editora, permitiendo que un estudio trabaje con diferentes publishers a lo largo del tiempo.
* **Atributos:**
  * `id`: Clave primaria.
  * `name`: Nombre del estudio.
  * `country`: País de origen.
  * `founded_year`: Año de fundación.

#### 3. `Game` (Videojuego Base)
Ficha madre y conceptual del título. Centraliza sinopsis, clasificación por edades, material publicitario y calificaciones agregadas, independiente de la consola o plataforma donde se juegue.
* **Atributos:**
  * `id`: Clave primaria.
  * `publisher_id`: FK referenciando a `Publisher`.
  * `developer_id`: FK referenciando a `Developer`.
  * `title`: Nombre oficial del videojuego.
  * `slug`: Identificador amigable para URLs (`/juegos/elden-ring`).
  * `synopsis`: Descripción y sinopsis argumental.
  * `esrb_rating`: Clasificación por edades (`E`, `T`, `M`, `AO`).
  * `release_date`: Fecha de lanzamiento oficial inicial.
  * `cover_image_url`: Carátula o banner de exhibición.

#### 4. `Genre` (Género / Etiqueta)
Taxonomía y categorías para navegación y filtros de búsqueda (ej. *RPG, Roguelike, Táctico, Hack and Slash*).
* **Atributos:**
  * `id`: Clave primaria.
  * `name`: Denominación del género.
  * `slug`: Cadena indexable para búsquedas.
  * `description`: Explicación de la mecánica de juego.

#### 5. `Platform` (Plataforma o Ecosistema)
Hardware o ecosistema digital donde se ejecuta el juego (ej. *PC/Steam, PC/GOG, PlayStation 5, Xbox Series X, Nintendo Switch*).
* **Atributos:**
  * `id`: Clave primaria.
  * `name`: Nombre comercial.
  * `code`: Código técnico único (ej. `STEAM`, `PS5`, `XBOX_SERIES`).
  * `icon_url`: Icono identificativo de la plataforma.

---

### Módulo B: SKUs, Formatos y Requisitos

#### 6. `GameEdition` (Edición Comercial / SKU)
Es el producto transaccional real. Representa la combinación de un juego, una plataforma específica, un formato de entrega y un tipo de contenido (Standard, Deluxe, Collector's Edition, Pase de Batalla o DLC).
* **Atributos:**
  * `id`: Clave primaria.
  * `game_id`: FK referenciando a `Game`.
  * `platform_id`: FK referenciando a `Platform`.
  * `edition_name`: Título de la edición (ej. "Digital Deluxe", "Standard Edition").
  * `format`: Enumerador (`DIGITAL`, `PHYSICAL`).
  * `base_price`: Precio de lista base (moneda estándar).
  * `is_dlc`: Booleano que indica si requiere el juego base para funcionar.
  * `stock_physical`: Unidades físicas disponibles (si `format = PHYSICAL`).

#### 7. `SystemRequirement` (Requisitos de Sistema)
Especificaciones técnicas de hardware y software recomendadas o mínimas para ejecutar las versiones de PC.
* **Atributos:**
  * `id`: Clave primaria.
  * `game_id`: FK referenciando a `Game`.
  * `tier`: Nivel de requerimiento (`MINIMUM`, `RECOMMENDED`, `ULTRA_RAYTRACING`).
  * `os`: Sistema operativo base soportado.
  * `processor`: CPU sugerida.
  * `ram_gb`: Memoria RAM en Gigabytes.
  * `graphics_card`: Tarjeta gráfica (GPU) sugerida.
  * `storage_gb`: Espacio requerido en disco duro o SSD.
  * `directx_version`: Versión de API gráfica necesaria.

---

### Módulo C: Bóveda de Claves e Inventario Digital

#### 8. `DigitalKey` (Llave de Activación / Código CD-Key)
Depósito seguro de números de serie y códigos de canje para copias digitales.
* **Atributos:**
  * `id`: Clave primaria.
  * `game_edition_id`: FK referenciando a `GameEdition`.
  * `encrypted_code`: Código de activación encriptado mediante algoritmo simétrico (ej. AES-256).
  * `code_hash`: Hash unidireccional (SHA-256) para búsquedas indexadas seguras sin desencriptar en memoria.
  * `status`: Estado del código (`AVAILABLE`, `RESERVED`, `ASSIGNED`, `REVOKED`).
  * `batch_id`: Identificador de lote de carga para trazabilidad de proveedores.

---

### Módulo D: Motor de Compras y Promociones

#### 9. `Promotion` (Campañas de Descuento y Cupones)
Reglas de rebaja temporal aplicadas de forma directa o mediante cupones de descuento.
* **Atributos:**
  * `id`: Clave primaria.
  * `name`: Nombre de la campaña (ej. "Rebajas de Verano").
  * `discount_percentage`: Porcentaje de descuento (0 a 100).
  * `coupon_code`: Código alfanumérico opcional para redención manual.
  * `start_date`: Timestamp de activación.
  * `end_date`: Timestamp de vencimiento.
  * `is_active`: Interruptor booleano maestro.

#### 10. `Order` (Orden de Compra / Transacción)
Cabecera financiera de la venta generada por el usuario.
* **Atributos:**
  * `id`: Clave primaria.
  * `user_id`: FK referenciando a `User`.
  * `order_number`: Código alfanumérico público único (ej. `ORD-2026-X892`).
  * `total_amount`: Monto total liquidado tras aplicar descuentos e impuestos.
  * `payment_status`: Estado de la pasarela (`PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`).
  * `payment_gateway_ref`: ID de transacción externo emitido por Stripe, PayPal, etc.
  * `created_at`: Fecha y hora de creación.

#### 11. `OrderItem` (Línea de Pedido)
Detalle individual de cada SKU comprado. Es crítico porque congela los valores de compra en el instante de la transacción para proteger la integridad contable.
* **Atributos:**
  * `id`: Clave primaria.
  * `order_id`: FK referenciando a `Order`.
  * `game_edition_id`: FK referenciando a `GameEdition`.
  * `digital_key_id`: FK (nullable) referenciando a `DigitalKey` asignada tras el pago exitoso.
  * `unit_price`: Precio unitario congelado.
  * `discount_applied`: Descuento nominal o porcentual congelado.
  * `subtotal`: Total neto cobrado por esa línea.

---

### Módulo E: Usuarios, Licencias y Comunidad

#### 12. `User` (Usuario / Cliente)
Cuenta de acceso a la plataforma con roles y configuración regional.
* **Atributos:**
  * `id`: Clave primaria.
  * `email`: Correo electrónico único indexado.
  * `password_hash`: Hash de la contraseña (Argon2id o BCrypt).
  * `username`: Alias público del jugador.
  * `country_code`: Código ISO del país para cálculos de impuestos y bloqueos regionales.
  * `is_active`: Estado de la cuenta.
  * `created_at`: Fecha de registro.

#### 13. `UserLibrary` (Biblioteca / Licencias del Usuario)
Registro de propiedad intelectual del usuario. Funciona como la biblioteca digital (estilo Steam o GOG), permitiendo recuperar claves y ver instaladores en cualquier momento.
* **Atributos:**
  * `id`: Clave primaria.
  * `user_id`: FK referenciando a `User`.
  * `game_edition_id`: FK referenciando a `GameEdition`.
  * `order_id`: FK referenciando a la compra original `Order`.
  * `acquired_at`: Momento de adquisición.
  * `is_revoked`: Booleano para cancelaciones por contracargo o reembolso.

#### 14. `Wishlist` (Lista de Deseos)
Catálogo personal de títulos que el usuario sigue para recibir notificaciones cuando entren en oferta.
* **Atributos:**
  * `user_id`: FK referenciando a `User`.
  * `game_id`: FK referenciando a `Game`.
  * `notify_on_sale`: Booleano para alertas por correo o push.
  * `added_at`: Fecha de adición a la lista.

#### 15. `Review` (Reseñas y Calificaciones)
Comentarios y puntuaciones otorgadas por la comunidad a un juego base.
* **Atributos:**
  * `id`: Clave primaria.
  * `user_id`: FK referenciando a `User`.
  * `game_id`: FK referenciando a `Game`.
  * `rating`: Puntuación numérica (ej. 1 a 5 o binaria 1/0 recomendada).
  * `title`: Encabezado de la reseña.
  * `body`: Contenido y análisis del jugador.
  * `is_verified_purchase`: Booleano que certifica que el usuario adquirió el juego en la plataforma.
  * `helpful_count`: Contador de votos útiles otorgados por otros usuarios.

---

## 3. Análisis de Relaciones Muchos a Muchos (N:M)

### 3.1. Tabla Intermedia Pura: `game_genres`
La relación entre **`Game`** y **`Genre`** no puede resolverse en ninguna de las dos tablas sin violar la primera forma normal (1NF):
* Un juego (ej. *The Witcher 3*) pertenece a géneros como: *RPG*, *Mundo Abierto*, *Fantasía*, *Acción*.
* Un género (*RPG*) agrupa miles de títulos.

```sql
CREATE TABLE game_genres (
    game_id INT NOT NULL,
    genre_id INT NOT NULL,
    PRIMARY KEY (game_id, genre_id),
    CONSTRAINT fk_game_genres_game FOREIGN KEY (game_id)
        REFERENCES games (id) ON DELETE CASCADE,
    CONSTRAINT fk_game_genres_genre FOREIGN KEY (genre_id)
        REFERENCES genres (id) ON DELETE RESTRICT
);
```

### 3.2. Tabla Intermedia Enriquecida: `Wishlist`
Relaciona a **`User`** con **`Game`** (N:M). Un usuario sigue muchos juegos, y un juego es deseado por miles de usuarios. Es asociativa pero incluye columnas de metadatos como `added_at` y `notify_on_sale`.

### 3.3. Entidad Asociativa Promocionada: `GameEdition`
La relación conceptual entre un videojuego base (`Game`) y las consolas o hardware (`Platform`) es originalmente N:M (un juego corre en múltiples plataformas, y una consola tiene catálogo de miles de juegos).
* **Decisión de modelado:** En lugar de crear una tabla pivote simple sin atributos, se promueve a una **entidad fuerte** (`GameEdition`) porque cada combinación posee ciclo de vida independiente:
  * Distinto precio base por plataforma (los lanzamientos de consola suelen ser más costosos que en PC).
  * Distinto formato (disco físico vs. código digital).
  * Control de stock e inventario de claves totalmente separado.

---

## 4. Script DDL (PostgreSQL) - Implementación de Tablas Centrales

```sql
-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tablas Maestras
CREATE TABLE publishers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    website_url VARCHAR(255),
    support_email VARCHAR(100),
    country CHAR(2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE developers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    country CHAR(2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE platforms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    icon_url VARCHAR(255)
);

CREATE TABLE genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(60) UNIQUE NOT NULL
);

-- Videojuego Base
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    publisher_id INT NOT NULL REFERENCES publishers(id) ON DELETE RESTRICT,
    developer_id INT NOT NULL REFERENCES developers(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(220) UNIQUE NOT NULL,
    synopsis TEXT,
    esrb_rating VARCHAR(10) NOT NULL,
    release_date DATE NOT NULL,
    cover_image_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Intermedia N:M Pura
CREATE TABLE game_genres (
    game_id INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    genre_id INT NOT NULL REFERENCES genres(id) ON DELETE RESTRICT,
    PRIMARY KEY (game_id, genre_id)
);

-- Ediciones Comerciales (SKUs)
CREATE TYPE edition_format AS ENUM ('DIGITAL', 'PHYSICAL');

CREATE TABLE game_editions (
    id SERIAL PRIMARY KEY,
    game_id INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    platform_id INT NOT NULL REFERENCES platforms(id) ON DELETE RESTRICT,
    edition_name VARCHAR(100) NOT NULL DEFAULT 'Standard Edition',
    format edition_format NOT NULL DEFAULT 'DIGITAL',
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    is_dlc BOOLEAN DEFAULT FALSE,
    stock_physical INT DEFAULT 0 CHECK (stock_physical >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_edition_game_platform UNIQUE (game_id, platform_id, edition_name, format)
);

-- Inventario de Claves Digitales
CREATE TYPE key_status AS ENUM ('AVAILABLE', 'RESERVED', 'ASSIGNED', 'REVOKED');

CREATE TABLE digital_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_edition_id INT NOT NULL REFERENCES game_editions(id) ON DELETE RESTRICT,
    encrypted_code BYTEA NOT NULL,
    code_hash VARCHAR(64) UNIQUE NOT NULL,
    status key_status NOT NULL DEFAULT 'AVAILABLE',
    batch_id VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de Rendimiento
CREATE INDEX idx_games_publisher ON games(publisher_id);
CREATE INDEX idx_games_developer ON games(developer_id);
CREATE INDEX idx_game_editions_game ON game_editions(game_id);
CREATE INDEX idx_digital_keys_lookup ON digital_keys(game_edition_id, status) WHERE status = 'AVAILABLE';
```

---

## 5. Reglas Críticas de Negocio y Concurrencia

1. **Prevención de Venta Duplicada de Claves (*Race Conditions*):**
   * Al tramitar el checkout, la asignación de claves desde `digital_keys` debe protegerse usando un bloqueo pesimista:
     ```sql
     SELECT id FROM digital_keys 
     WHERE game_edition_id = :editionId AND status = 'AVAILABLE' 
     LIMIT 1 
     FOR UPDATE SKIP LOCKED;
     ```
   * Si la transacción es exitosa, el estado pasa a `ASSIGNED`. Si el usuario abandona el carrito, un proceso de expiración con TTL de 15 minutos libera las claves en estado `RESERVED`.

2. **Inmutabilidad en `OrderItem`:**
   * Las líneas de la orden (`OrderItem`) jamás leen dinámicamente el precio de `game_editions`. Deben duplicar y persistir el `unit_price` exacto del momento de la compra para soportar auditorías fiscales frente a futuros cambios de precio del catálogo.

3. **Cifrado de Claves Digitales:**
   * La columna `encrypted_code` almacena el secreto cifrado con llaves gestionadas fuera del motor de base de datos (ej. AWS KMS, HashiCorp Vault). El servidor solo desencripta el valor al momento de desplegarlo en la `UserLibrary` del comprador.