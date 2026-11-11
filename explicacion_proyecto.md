# 🎮 ¿Cómo funciona nuestra Tienda de Videojuegos? (Guía Sencilla)

Imagina que este proyecto es el **"cerebro" detrás de una tienda como Steam, PlayStation Store o GameStop**. No es la página visual con botones y colores (eso es el Frontend), sino el sistema interno (el **Backend**) que guarda la información en la base de datos, revisa que haya productos disponibles, calcula los precios y entrega los juegos a los clientes.

---

## 🏗️ 1. ¿Cómo está organizado el proyecto?

Para no revolver todo en un solo lugar, el sistema está dividido en **pequeños departamentos (módulos)**. Cada departamento tiene 3 encargados principales:

1. **El Recepcionista (`Controller`):** Es quien recibe los pedidos desde afuera (por ejemplo: *"Quiero ver la lista de juegos"* o *"Quiero comprar este juego"*).
2. **El Gerente (`Service`):** Es quien hace el trabajo inteligente. Revisa si hay stock, hace las sumas, aplica descuentos y decide si todo está en regla.
3. **El Archivero (`Entity`):** Es el formato de las hojas donde se guarda la información dentro de la base de datos MySQL.

Además, existe un **Filtro de Seguridad (`DTO`)** en la entrada: antes de pasarle un pedido al gerente, revisa que los datos vengan completos (por ejemplo, que el precio no sea negativo o que el correo sea válido).

---

## 🧩 2. Las 5 Áreas de la Tienda

### 📚 Área 1: El Catálogo (La Vitrina)
Aquí guardamos toda la información descriptiva de los videojuegos:
- **Desarrolladores (`Developers`):** Quién creó el juego (ej. *FromSoftware*).
- **Distribuidoras (`Publishers`):** Quién lo vende y financia (ej. *Bandai Namco*).
- **Géneros (`Genres`):** De qué trata el juego (*Acción, RPG, Terror, Deportes*). Un juego puede tener varios géneros al mismo tiempo.
- **Plataformas (`Platforms`):** En qué consola o sistema funciona (*PC Steam, PS5, Xbox, Nintendo Switch*).
- **Juegos Base (`Games`):** La ficha general del juego con su título, historia, fecha de salida y portada.
- **Requisitos de Sistema (`System Requirements`):** Qué tan potente debe ser una computadora para poder jugarlo (Mínimos, Recomendados o Ultra).

---

### 💿 Área 2: Las Ediciones de Venta (El Estante)
Un mismo videojuego (como *Elden Ring*) se puede vender de muchas formas distintas. A eso le llamamos **Ediciones (`Game Editions`)**:
- Puede ser **Físico** (disco en caja) o **Digital** (descargable).
- Puede ser la versión **Estándar**, **Deluxe** o un **DLC** (expansión).
- Puede tener un precio diferente en PS5 que en PC.
- Si es **físico**, el sistema lleva la cuenta de cuántas cajas quedan en la bodega (`stockPhysical`).

---

### 🔐 Área 3: La Bóveda de Códigos Digitales (`Digital Keys`)
Cuando alguien compra un juego digital, no le enviamos una caja; le damos un código secreto (como `XXXX-YYYY-ZZZZ`) para que lo active.
- En esta bóveda guardamos todos los códigos listos para venderse (`AVAILABLE`).
- Cuando un cliente compra uno, el código cambia automáticamente su estado a **Asignado (`ASSIGNED`)** para que nunca se le venda el mismo código a dos personas distintas.

---

### 🛒 Área 4: La Caja Registradora y Ofertas (`Orders` y `Promotions`)
Es donde ocurre la magia de las ventas:
- **Promociones (`Promotions`):** Permite crear campañas de rebajas o cupones (por ejemplo, un cupón de `VERANO20` que da 20% de descuento).
- **Órdenes de Compra (`Orders`):** Cuando un usuario hace una compra, el sistema hace todo esto en automático:
  1. Revisa que el usuario exista.
  2. Si eligió un juego **físico**, revisa que haya cajas disponibles y descuenta las unidades del almacén. Si no alcanza el stock, avisa que está agotado.
  3. Si eligió un juego **digital**, busca un código libre en la bóveda y se lo aparta al comprador.
  4. Si metió un cupón válido, le resta el descuento al precio.
  5. Guarda el recibo de compra (`OrderItem`) congelando el precio que pagó ese día (así, aunque mañana el juego suba de precio, su ticket histórico no se altera).

---

### 👤 Área 5: Los Jugadores y la Comunidad
Todo lo que pertenece a los clientes de la tienda:
- **Usuarios (`Users`):** Los datos de la cuenta del jugador (nombre de usuario, correo, país).
- **Biblioteca Personal (`User Libraries`):** Igual que en Steam, apenas se completa una compra, el juego aparece automáticamente en la biblioteca personal del usuario para que sepa qué juegos son suyos.
- **Lista de Deseos (`Wishlists`):** Donde el jugador guarda los juegos que quiere comprarse más adelante para que le avisen cuando estén en oferta.
- **Reseñas (`Reviews`):** Donde los jugadores dejan su calificación (de 1 a 5 estrellas) y su opinión. El sistema revisa sola la biblioteca del jugador: si de verdad compró el juego en nuestra tienda, le pone una insignia automática de **"Compra Verificada"**.

---

## 🔄 3. Ejemplo de un flujo completo de principio a fin

```
1. El Administrador registra el juego "Elden Ring", su edición Digital ($59.99) y mete códigos en la bóveda.
        ⬇️
2. Un Jugador se registra en la tienda y decide comprar "Elden Ring".
        ⬇️
3. El sistema verifica disponibilidad, le asigna su código digital único y calcula el total.
        ⬇️
4. El juego se agrega instantáneamente a la "Biblioteca Personal" del jugador.
        ⬇️
5. El jugador escribe una reseña de 5 estrellas y el sistema la marca como "Compra Verificada".
```

---

## 💡 Resumen Rápido para Exposición
- **¿Qué tecnología usa?** **NestJS** (con Node.js y TypeScript) conectado a una base de datos **MySQL** mediante **TypeORM**.
- **¿Por qué se hizo así?** Porque al separarlo por módulos (Juegos, Usuarios, Ventas, Claves), el código es muy ordenado, fácil de leer y funciona igual que las tiendas digitales reales.
