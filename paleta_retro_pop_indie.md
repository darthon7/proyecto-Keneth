# Sistema de Diseño y Paleta de Colores: "Retro Pop / Indie"
**Contexto del Proyecto:** Tienda de Videojuegos (E-commerce)  
**Estética:** Vibrante, nostálgica, limpia, inspirada en consolas clásicas/portátiles y estilo arcade japonés (Light Mode con alto contraste).

---

## 1. Tokens de Color Principales (Regla 60-30-10)

### Fondos y Superficies (60% - 30%)
* **Background Primary (`bg-primary`):** `#F4F4F6` — *Blanco hueso / Gris consola muy claro. Usar como fondo general de la aplicación (`body`).*
* **Surface / Card (`bg-surface`):** `#FFFFFF` — *Blanco puro. Usar para tarjetas de productos (cards), modales, contenedores de filtros y barras laterales.*
* **Contrast Surface (`bg-contrast`):** `#1E1B4B` — *Índigo profundo. Usar en el Header/Navbar principal, Footer y banners promocionales destacados para dar anclaje visual.*
* **Border / Divider (`border-subtle`):** `#E2E8F0` — *Gris claro para bordes de tarjetas, inputs y líneas divisoras.*

### Acentos y Llamadas a la Acción - CTAs (10%)
* **Primary Accent (`accent-primary`):** `#FF2A5F` — *Rojo/Rosa Arcade vibrante. Usar exclusivamente en acciones principales: botones de "Comprar", "Agregar al carrito", "Pagar" e indicadores activos.*
* **Primary Accent Hover (`accent-primary-hover`):** `#E01E4F` — *Estado hover/active para el acento primario.*
* **Secondary Accent (`accent-secondary`):** `#FFC700` — *Amarillo moneda. Usar para badges de "Oferta", estrellas de calificación, iconos destacados o etiquetas de "Nuevo".*
* **Secondary Accent Text (`accent-secondary-content`):** `#0F172A` — *Texto oscuro obligatorio sobre fondos `#FFC700` para garantizar contraste AA/AAA.*

### Tipografía (Textos)
* **Text Primary (`text-primary`):** `#0F172A` — *Casi negro (Slate 900). Para títulos, nombres de videojuegos y precios.*
* **Text Secondary (`text-secondary`):** `#475569` — *Gris pizarra oscuro. Para descripciones, subtítulos, especificaciones y migas de pan (breadcrumbs).*
* **Text Muted (`text-muted`):** `#94A3B8` — *Gris medio. Para precios tachados (antes del descuento), placeholders de inputs y textos deshabilitados.*
* **Text Inverted (`text-inverted`):** `#FFFFFF` — *Blanco puro. Usar sobre el Navbar (`#1E1B4B`) y sobre los botones primarios (`#FF2A5F`).*

---

## 2. Colores Semánticos y de Plataforma

### Estados del E-commerce
* **Success / En Stock / Descuento (`status-success`):** `#10B981` *(Fondo suave opcional: `#D1FAE5`, Texto: `#065F46`)*
* **Warning / Pocas Unidades / Preventa (`status-warning`):** `#F59E0B` *(Fondo suave opcional: `#FEF3C7`, Texto: `#92400E`)*
* **Danger / Agotado / Error (`status-danger`):** `#EF4444` *(Fondo suave opcional: `#FEE2E2`, Texto: `#991B1B`)*

### Etiquetas de Plataforma (Badges / Pills)
* **Nintendo:** `#E60012`
* **PlayStation:** `#0070D1`
* **Xbox:** `#107C10`
* **PC / Steam:** `#334155`

---

## 3. Implementación en Código

### Variables CSS Nativas (`:root`)
```css
:root {
  /* Fondos y Superficies */
  --bg-primary: #F4F4F6;
  --bg-surface: #FFFFFF;
  --bg-contrast: #1E1B4B;
  --border-subtle: #E2E8F0;

  /* Acentos */
  --accent-primary: #FF2A5F;
  --accent-primary-hover: #E01E4F;
  --accent-secondary: #FFC700;
  --accent-secondary-content: #0F172A;

  /* Textos */
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;
  --text-inverted: #FFFFFF;

  /* Estados */
  --status-success: #10B981;
  --status-warning: #F59E0B;
  --status-danger: #EF4444;

  /* Sombras recomendadas (Estilo Pop / Ligero Neo-brutalismo opcional) */
  --shadow-card: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05);
  --shadow-pop: 0 4px 0 0 #E2E8F0;
}
```

### Configuración para Tailwind CSS (`tailwind.config.js`)
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        retro: {
          bg: '#F4F4F6',
          surface: '#FFFFFF',
          contrast: '#1E1B4B',
          border: '#E2E8F0',
          primary: {
            DEFAULT: '#FF2A5F',
            hover: '#E01E4F',
            foreground: '#FFFFFF',
          },
          secondary: {
            DEFAULT: '#FFC700',
            foreground: '#0F172A',
          },
          text: {
            primary: '#0F172A',
            secondary: '#475569',
            muted: '#94A3B8',
            inverted: '#FFFFFF',
          }
        }
      }
    }
  }
}
```

---

## 4. Reglas de UI/UX para el Agente de IA

1. **Protagonismo del Box Art:** Las tarjetas de producto (`.product-card`) deben mantener siempre el fondo `#FFFFFF` (`--bg-surface`) sin degradados invasivos para no competir con los colores de las portadas de los videojuegos.
2. **Jerarquía de Botones:**
   * **Botón Primario (Comprar / Añadir):** Fondo `#FF2A5F`, texto `#FFFFFF`, `font-weight: 600` o `700`, bordes redondeados (`border-radius: 8px` o `9999px` estilo píldora).
   * **Botón Secundario (Ver detalles / Wishlist):** Fondo transparente o `#F4F4F6`, borde de `1px solid #E2E8F0`, texto `#0F172A`.
3. **Contraste de Accesibilidad:**
   * **NUNCA** colocar texto blanco (`#FFFFFF`) sobre el amarillo moneda (`#FFC700`). Usar siempre `#0F172A` sobre fondos amarillos (ej. en badges de `-20%`).
   * En la barra de navegación (`#1E1B4B`), usar iconos y enlaces en `#FFFFFF`, y el contador del carrito de compras con un badge circular en `#FF2A5F` o `#FFC700`.
4. **Detalles Visuales (Micro-interacciones):** Al hacer `hover` sobre una tarjeta de videojuego, elevar ligeramente la tarjeta (`transform: translateY(-2px)`) y cambiar su borde de `#E2E8F0` a `#1E1B4B` o `#FF2A5F`.