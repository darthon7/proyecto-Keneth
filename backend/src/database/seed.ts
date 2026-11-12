import 'reflect-metadata';
import * as crypto from 'node:crypto';
import { DataSource } from 'typeorm';

// Entities
import { Publisher } from '../publishers/entities/publisher.entity.js';
import { Developer } from '../developers/entities/developer.entity.js';
import { Genre } from '../genres/entities/genre.entity.js';
import { Platform } from '../platforms/entities/platform.entity.js';
import { Game } from '../games/entities/game.entity.js';
import { GameEdition, EditionFormat } from '../game-editions/entities/game-edition.entity.js';
import { DigitalKey, KeyStatus } from '../digital-keys/entities/digital-key.entity.js';
import { SystemRequirement, RequirementTier } from '../system-requirements/entities/system-requirement.entity.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { UserLibrary } from '../user-libraries/entities/user-library.entity.js';
import { Wishlist } from '../wishlists/entities/wishlist.entity.js';
import { Review } from '../reviews/entities/review.entity.js';
import { Promotion } from '../promotions/entities/promotion.entity.js';

// Attempt to load .env from current directory or backend directory
try {
  process.loadEnvFile('.env');
} catch {
  try {
    process.loadEnvFile('backend/.env');
  } catch {
    // Environment variables already present in execution environment
  }
}

const databaseUrl = process.env.DATABASE_URL;

const dataSource = new DataSource(
  databaseUrl
    ? {
        type: 'postgres',
        url: databaseUrl,
        ssl: { rejectUnauthorized: false },
        entities: [
          Publisher,
          Developer,
          Genre,
          Platform,
          Game,
          GameEdition,
          DigitalKey,
          SystemRequirement,
          User,
          Order,
          OrderItem,
          UserLibrary,
          Wishlist,
          Review,
          Promotion,
        ],
        synchronize: true,
      }
    : {
        type: (process.env.APP_TYPE || 'mysql') as 'mysql' | 'postgres',
        host: process.env.APP_HOST || 'localhost',
        port: Number(process.env.APP_PORT || (process.env.APP_TYPE === 'postgres' ? 5432 : 3306)),
        username: process.env.APP_USERNAME || 'root',
        password: process.env.APP_PASSWORD || '1111',
        database: process.env.APP_DATABASE || 'tienda_videojuegos',
        ssl: process.env.APP_TYPE === 'postgres' ? { rejectUnauthorized: false } : false,
        entities: [
          Publisher,
          Developer,
          Genre,
          Platform,
          Game,
          GameEdition,
          DigitalKey,
          SystemRequirement,
          User,
          Order,
          OrderItem,
          UserLibrary,
          Wishlist,
          Review,
          Promotion,
        ],
        synchronize: true,
      },
);

const PLATFORMS_DATA = [
  { name: 'Nintendo Switch', code: 'NSW', iconUrl: 'https://api.iconify.design/simple-icons:nintendoswitch.svg?color=%23e60012' },
  { name: 'PlayStation 5', code: 'PS5', iconUrl: 'https://api.iconify.design/simple-icons:playstation5.svg?color=%230070d1' },
  { name: 'Xbox Series X|S', code: 'XSX', iconUrl: 'https://api.iconify.design/simple-icons:xbox.svg?color=%23107c10' },
  { name: 'PC', code: 'PC', iconUrl: 'https://api.iconify.design/simple-icons:steam.svg?color=%23ffffff' },
];

const GENRES_DATA = [
  { name: 'Acción', slug: 'accion', description: 'Juegos centrados en desafíos físicos, combate y reflejos rápidos.' },
  { name: 'Aventura', slug: 'aventura', description: 'Experiencias enfocadas en exploración narrativa, resolución de acertijos y viajes épicos.' },
  { name: 'RPG', slug: 'rpg', description: 'Juegos de rol con progresión de personaje, estadísticas profundas y toma de decisiones.' },
  { name: 'Mundo Abierto', slug: 'mundo-abierto', description: 'Extensos mapas interactivos con libertad total de exploración no lineal.' },
  { name: 'Plataformas', slug: 'plataformas', description: 'Niveles dinámicos basados en saltos precisos, navegación y reflejos.' },
  { name: 'Lucha', slug: 'lucha', description: 'Combates cara a cara con combos, artes marciales y arenas competitivas.' },
  { name: 'Carreras', slug: 'carreras', description: 'Competición de alta velocidad sobre ruedas en circuitos o mundos libres.' },
  { name: 'Shooter', slug: 'shooter', description: 'Disparos en primera o tercera persona tácticos y competitivos.' },
  { name: 'Metroidvania', slug: 'metroidvania', description: 'Exploración guiada por habilidades desbloqueables y mapas interconectados.' },
  { name: 'Simulación', slug: 'simulacion', description: 'Recreación realista o relajante de actividades del mundo real.' },
  { name: 'Estrategia', slug: 'estrategia', description: 'Planificación táctica por turnos o en tiempo real para conquistar objetivos.' },
  { name: 'Roguelike', slug: 'roguelike', description: 'Generación procedural de niveles con muerte permanente y rejugabilidad infinita.' },
  { name: 'Terror', slug: 'terror', description: 'Horror psicológico y de supervivencia que desafía los nervios del jugador.' },
  { name: 'Multijugador', slug: 'multijugador', description: 'Experiencias diseñadas para cooperar o competir con amigos en línea o local.' },
  { name: 'Ciencia Ficción', slug: 'ciencia-ficcion', description: 'Mundos futuristas, tecnología avanzada, viajes espaciales y ciberpunk.' },
  { name: 'Fantasía', slug: 'fantasia', description: 'Universos con magia, criaturas míticas y leyendas ancestrales.' },
];

const PUBLISHERS_DATA = [
  { name: 'Nintendo', country: 'JP', websiteUrl: 'https://www.nintendo.com', supportEmail: 'support@nintendo.com' },
  { name: 'Sony Interactive Entertainment', country: 'US', websiteUrl: 'https://playstation.com', supportEmail: 'support@playstation.com' },
  { name: 'Xbox Game Studios', country: 'US', websiteUrl: 'https://www.xbox.com', supportEmail: 'support@xbox.com' },
  { name: 'Bethesda Softworks', country: 'US', websiteUrl: 'https://bethesda.net', supportEmail: 'support@bethesda.net' },
  { name: 'CD Projekt', country: 'PL', websiteUrl: 'https://www.cdprojekt.com', supportEmail: 'support@cdprojektred.com' },
  { name: 'Bandai Namco Entertainment', country: 'JP', websiteUrl: 'https://en.bandainamcoent.eu', supportEmail: 'support@bandainamco.com' },
  { name: 'Rockstar Games', country: 'US', websiteUrl: 'https://www.rockstargames.com', supportEmail: 'support@rockstargames.com' },
  { name: 'Larian Studios', country: 'BE', websiteUrl: 'https://larian.com', supportEmail: 'support@larian.com' },
  { name: 'Valve', country: 'US', websiteUrl: 'https://valvesoftware.com', supportEmail: 'support@steampowered.com' },
  { name: 'Supergiant Games', country: 'US', websiteUrl: 'https://www.supergiantgames.com', supportEmail: 'info@supergiantgames.com' },
  { name: 'ZA/UM', country: 'GB', websiteUrl: 'https://zaumstudio.com', supportEmail: 'info@zaumstudio.com' },
  { name: 'Blizzard Entertainment', country: 'US', websiteUrl: 'https://www.blizzard.com', supportEmail: 'support@blizzard.com' },
];

const DEVELOPERS_DATA = [
  { name: 'Nintendo EPD', country: 'JP', foundedYear: 2015 },
  { name: 'Bandai Namco Studios', country: 'JP', foundedYear: 2012 },
  { name: 'MercurySteam', country: 'ES', foundedYear: 2002 },
  { name: 'Game Freak', country: 'JP', foundedYear: 1989 },
  { name: 'Intelligent Systems', country: 'JP', foundedYear: 1986 },
  { name: 'Monolith Soft', country: 'JP', foundedYear: 1999 },
  { name: 'Insomniac Games', country: 'US', foundedYear: 1994 },
  { name: 'Santa Monica Studio', country: 'US', foundedYear: 1999 },
  { name: 'Bluepoint Games', country: 'US', foundedYear: 2006 },
  { name: 'Guerrilla Games', country: 'NL', foundedYear: 2000 },
  { name: 'Housemarque', country: 'FI', foundedYear: 1995 },
  { name: 'Naughty Dog', country: 'US', foundedYear: 1984 },
  { name: '343 Industries', country: 'US', foundedYear: 2007 },
  { name: 'Playground Games', country: 'GB', foundedYear: 2010 },
  { name: 'Bethesda Game Studios', country: 'US', foundedYear: 2001 },
  { name: 'The Coalition', country: 'CA', foundedYear: 2010 },
  { name: 'Tango Gameworks', country: 'JP', foundedYear: 2010 },
  { name: 'Larian Studios', country: 'BE', foundedYear: 1996 },
  { name: 'CD Projekt Red', country: 'PL', foundedYear: 2002 },
  { name: 'FromSoftware', country: 'JP', foundedYear: 1986 },
  { name: 'Rockstar Games', country: 'US', foundedYear: 1998 },
  { name: 'Valve', country: 'US', foundedYear: 1996 },
  { name: 'Supergiant Games', country: 'US', foundedYear: 2009 },
  { name: 'ZA/UM', country: 'GB', foundedYear: 2016 },
  { name: 'Blizzard Team 3', country: 'US', foundedYear: 1991 },
];

interface GameSeedDefinition {
  title: string;
  slug: string;
  synopsis: string;
  esrbRating: string;
  releaseDate: string;
  coverImageUrl: string;
  publisherName: string;
  developerName: string;
  platformCode: 'NSW' | 'PS5' | 'XSX' | 'PC';
  genres: string[];
  basePrice: number;
  sysReq?: {
    min: { os: string; cpu: string; ram: number; gpu: string; storage: number; dx?: string };
    rec: { os: string; cpu: string; ram: number; gpu: string; storage: number; dx?: string };
  };
}

const GAMES_DATA: GameSeedDefinition[] = [
  // --- NINTENDO (11 títulos) ---
  {
    title: 'The Legend of Zelda: Tears of the Kingdom',
    slug: 'the-legend-of-zelda-tears-of-the-kingdom',
    synopsis: 'Una aventura épica por la tierra y los cielos de Hyrule. El jugador aprovecha el poder de las nuevas habilidades de Link para luchar contra las malévolas fuerzas que amenazan el reino.',
    esrbRating: 'E10+',
    releaseDate: '2023-05-12',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/f/fb/The_Legend_of_Zelda_Tears_of_the_Kingdom_cover.jpg',
    publisherName: 'Nintendo',
    developerName: 'Nintendo EPD',
    platformCode: 'NSW',
    genres: ['Aventura', 'Acción', 'Mundo Abierto', 'Fantasía'],
    basePrice: 69.99,
  },
  {
    title: 'The Legend of Zelda: Breath of the Wild',
    slug: 'the-legend-of-zelda-breath-of-the-wild',
    synopsis: 'Olvida todo lo que sabes sobre los juegos de The Legend of Zelda. Entra en un mundo de descubrimientos, exploración y aventura en este aclamado título de mundo abierto.',
    esrbRating: 'E10+',
    releaseDate: '2017-03-03',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/c/c6/The_Legend_of_Zelda_Breath_of_the_Wild.jpg',
    publisherName: 'Nintendo',
    developerName: 'Nintendo EPD',
    platformCode: 'NSW',
    genres: ['Aventura', 'Acción', 'Mundo Abierto', 'Fantasía'],
    basePrice: 59.99,
  },
  {
    title: 'Super Mario Odyssey',
    slug: 'super-mario-odyssey',
    synopsis: 'Acompaña a Mario en una descomunal aventura en 3D por todo el planeta usando sus nuevas e increíbles habilidades para rescatar a la princesa Peach de los planes de boda de Bowser.',
    esrbRating: 'E',
    releaseDate: '2017-10-27',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/8/8d/Super_Mario_Odyssey.jpg',
    publisherName: 'Nintendo',
    developerName: 'Nintendo EPD',
    platformCode: 'NSW',
    genres: ['Plataformas', 'Aventura'],
    basePrice: 59.99,
  },
  {
    title: 'Super Smash Bros. Ultimate',
    slug: 'super-smash-bros-ultimate',
    synopsis: '¡Luchadores y mundos de juego legendarios colisionan en el enfrentamiento definitivo! Más personajes, más escenarios y combates trepidantes con todo el plantel histórico.',
    esrbRating: 'E10+',
    releaseDate: '2018-12-07',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/5/50/Super_Smash_Bros._Ultimate.jpg',
    publisherName: 'Nintendo',
    developerName: 'Bandai Namco Studios',
    platformCode: 'NSW',
    genres: ['Lucha', 'Acción', 'Multijugador'],
    basePrice: 59.99,
  },
  {
    title: 'Mario Kart 8 Deluxe',
    slug: 'mario-kart-8-deluxe',
    synopsis: 'Pisa a fondo el acelerador en la versión definitiva de Mario Kart 8 y juega donde y cuando quieras con decenas de circuitos y personajes icónicos.',
    esrbRating: 'E',
    releaseDate: '2017-04-28',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/b/b5/MarioKart8Boxart.jpg',
    publisherName: 'Nintendo',
    developerName: 'Nintendo EPD',
    platformCode: 'NSW',
    genres: ['Carreras', 'Multijugador'],
    basePrice: 59.99,
  },
  {
    title: 'Metroid Dread',
    slug: 'metroid-dread',
    synopsis: 'Únete a la cazarrecompensas Samus Aran mientras escapa de un planeta alienígena letal acosado por una terrorífica amenaza mecánica: los implacables robots E.M.M.I.',
    esrbRating: 'T',
    releaseDate: '2021-10-08',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f7/Metroid_Dread_Banner.png',
    publisherName: 'Nintendo',
    developerName: 'MercurySteam',
    platformCode: 'NSW',
    genres: ['Acción', 'Aventura', 'Metroidvania', 'Ciencia Ficción'],
    basePrice: 59.99,
  },
  {
    title: 'Animal Crossing: New Horizons',
    slug: 'animal-crossing-new-horizons',
    synopsis: 'Escapa a una isla desierta y crea tu propio paraíso mientras exploras, creas y personalizas en una relajante simulación de vida comunitaria.',
    esrbRating: 'E',
    releaseDate: '2020-03-20',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/1/1f/Animal_Crossing_New_Horizons.jpg',
    publisherName: 'Nintendo',
    developerName: 'Nintendo EPD',
    platformCode: 'NSW',
    genres: ['Simulación', 'Casual'],
    basePrice: 59.99,
  },
  {
    title: 'Pokémon Escarlata',
    slug: 'pokemon-escarlata',
    synopsis: 'Explora la vasta región de Paldea a tu propio ritmo en un mundo abierto repleto de Pokémon salvajes, gimnasios desafiantes y misterios del fenómeno Teracristal.',
    esrbRating: 'E',
    releaseDate: '2022-11-18',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/a/af/Pokemon_Scarlet_and_Violet_box_art.jpg',
    publisherName: 'Nintendo',
    developerName: 'Game Freak',
    platformCode: 'NSW',
    genres: ['RPG', 'Aventura'],
    basePrice: 59.99,
  },
  {
    title: 'Fire Emblem: Three Houses',
    slug: 'fire-emblem-three-houses',
    synopsis: 'Conviértete en profesor en el Monasterio de Garreg Mach y guía a tus alumnos a través de la vida académica y sangrientas batallas tácticas que decidirán el destino de Fódlan.',
    esrbRating: 'T',
    releaseDate: '2019-07-26',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/3/36/Fire_Emblem_Three_Houses_cover_art.png',
    publisherName: 'Nintendo',
    developerName: 'Intelligent Systems',
    platformCode: 'NSW',
    genres: ['Estrategia', 'RPG'],
    basePrice: 59.99,
  },
  {
    title: 'Xenoblade Chronicles 3',
    slug: 'xenoblade-chronicles-3',
    synopsis: 'Una profunda historia sobre la vida y los lazos que unen a dos facciones en guerra perpetua dentro del deslumbrante y gigantesco mundo de Aionios.',
    esrbRating: 'T',
    releaseDate: '2022-07-29',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/e/ec/Xenoblade_Chronicles_3_box_art.jpg',
    publisherName: 'Nintendo',
    developerName: 'Monolith Soft',
    platformCode: 'NSW',
    genres: ['RPG', 'Acción', 'Fantasía'],
    basePrice: 59.99,
  },
  {
    title: 'Super Mario Bros. Wonder',
    slug: 'super-mario-bros-wonder',
    synopsis: 'La evolución clásica en 2D de Mario. Descubre los Efectos Maravilla que transforman los escenarios, cobran vida las tuberías y desatan la locura creativa.',
    esrbRating: 'E',
    releaseDate: '2023-10-20',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/c/c5/Super_Mario_Bros_Wonder_cover_art.png',
    publisherName: 'Nintendo',
    developerName: 'Nintendo EPD',
    platformCode: 'NSW',
    genres: ['Plataformas', 'Multijugador'],
    basePrice: 59.99,
  },

  // --- PLAYSTATION 5 (6 títulos) ---
  {
    title: "Marvel's Spider-Man 2",
    slug: 'marvels-spider-man-2',
    synopsis: 'Peter Parker y Miles Morales regresan en una aventura electrizante. Balancéate, salta y utiliza las nuevas alas de telaraña para recorrer la Nueva York de Marvel frente a Venom y Kraven.',
    esrbRating: 'T',
    releaseDate: '2023-10-20',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/0/0f/Marvel%27s_Spider-Man_2_cover.jpg',
    publisherName: 'Sony Interactive Entertainment',
    developerName: 'Insomniac Games',
    platformCode: 'PS5',
    genres: ['Acción', 'Aventura', 'Mundo Abierto'],
    basePrice: 69.99,
  },
  {
    title: 'God of War Ragnarök',
    slug: 'god-of-war-ragnarok',
    synopsis: 'Kratos y Atreus deben viajar a cada uno de los Nueve Reinos en busca de respuestas mientras las fuerzas asgardianas se preparan para la batalla profetizada del fin del mundo.',
    esrbRating: 'M',
    releaseDate: '2022-11-09',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/e/ee/God_of_War_Ragnar%C3%B6k_cover.jpg',
    publisherName: 'Sony Interactive Entertainment',
    developerName: 'Santa Monica Studio',
    platformCode: 'PS5',
    genres: ['Acción', 'Aventura', 'Fantasía'],
    basePrice: 69.99,
  },
  {
    title: "Demon's Souls",
    slug: 'demons-souls-ps5',
    synopsis: 'Completamente reconstruido desde cero y mejorado magistralmente, este remake introduce los horrores de una tierra de fantasía oscura y hostil a una nueva generación de jugadores.',
    esrbRating: 'M',
    releaseDate: '2020-11-12',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/0/00/Demon%27s_Souls_Remake_Cover_Art.jpg',
    publisherName: 'Sony Interactive Entertainment',
    developerName: 'Bluepoint Games',
    platformCode: 'PS5',
    genres: ['RPG', 'Acción', 'Fantasía'],
    basePrice: 69.99,
  },
  {
    title: 'Horizon Forbidden West',
    slug: 'horizon-forbidden-west',
    synopsis: 'Acompaña a Aloy mientras desafía una frontera majestuosa pero peligrosa que oculta nuevas y misteriosas amenazas en el Oeste Prohibido postapocalíptico.',
    esrbRating: 'T',
    releaseDate: '2022-02-18',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/6/69/Horizon_Forbidden_West_cover_art.jpg',
    publisherName: 'Sony Interactive Entertainment',
    developerName: 'Guerrilla Games',
    platformCode: 'PS5',
    genres: ['Acción', 'RPG', 'Mundo Abierto', 'Ciencia Ficción'],
    basePrice: 69.99,
  },
  {
    title: 'Returnal',
    slug: 'returnal',
    synopsis: 'Tras un aterrizaje forzoso en este planeta alienígena cambiante, Selene debe buscar a través del árido paisaje de una antigua civilización para escapar, atrapada en un bucle temporal implacable.',
    esrbRating: 'M',
    releaseDate: '2021-04-30',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/a/a3/Returnal_cover_art.jpg',
    publisherName: 'Sony Interactive Entertainment',
    developerName: 'Housemarque',
    platformCode: 'PS5',
    genres: ['Roguelike', 'Shooter', 'Acción', 'Ciencia Ficción'],
    basePrice: 69.99,
  },
  {
    title: 'The Last of Us Part I',
    slug: 'the-last-of-us-part-i',
    synopsis: 'Experimenta la emotiva narración y los inolvidables personajes de Joel y Ellie reconstruidos fielmente para la consola PlayStation 5 con gráficos fotorrealistas.',
    esrbRating: 'M',
    releaseDate: '2022-09-02',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/b/b5/The_Last_of_Us_Part_I_cover.png',
    publisherName: 'Sony Interactive Entertainment',
    developerName: 'Naughty Dog',
    platformCode: 'PS5',
    genres: ['Acción', 'Aventura', 'Terror'],
    basePrice: 69.99,
  },

  // --- XBOX SERIES X|S (5 títulos) ---
  {
    title: 'Halo Infinite',
    slug: 'halo-infinite',
    synopsis: 'Cuando se pierde toda esperanza y el destino de la humanidad pende de un hilo, el Jefe Maestro está listo para enfrentarse al enemigo más despiadado en el anillo Zeta Halo.',
    esrbRating: 'T',
    releaseDate: '2021-12-08',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/1/14/Halo_Infinite.png',
    publisherName: 'Xbox Game Studios',
    developerName: '343 Industries',
    platformCode: 'XSX',
    genres: ['Shooter', 'Acción', 'Ciencia Ficción'],
    basePrice: 59.99,
  },
  {
    title: 'Forza Horizon 5',
    slug: 'forza-horizon-5',
    synopsis: 'Tu aventura Horizon definitiva te espera. Explora los paisajes vibrantes y en constante evolución del mundo abierto de México con acción al volante ilimitada.',
    esrbRating: 'E',
    releaseDate: '2021-11-09',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/8/86/Forza_Horizon_5_cover_art.jpg',
    publisherName: 'Xbox Game Studios',
    developerName: 'Playground Games',
    platformCode: 'XSX',
    genres: ['Carreras', 'Mundo Abierto', 'Multijugador'],
    basePrice: 59.99,
  },
  {
    title: 'Starfield',
    slug: 'starfield',
    synopsis: 'En este juego de rol de nueva generación ambientado entre las estrellas, crea el personaje que desees y explora con una libertad sin igual un millar de planetas inexplorados.',
    esrbRating: 'M',
    releaseDate: '2023-09-06',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/6/6d/Starfield_cover.jpg',
    publisherName: 'Bethesda Softworks',
    developerName: 'Bethesda Game Studios',
    platformCode: 'XSX',
    genres: ['RPG', 'Ciencia Ficción', 'Mundo Abierto'],
    basePrice: 69.99,
  },
  {
    title: 'Gears 5',
    slug: 'gears-5',
    synopsis: 'Con una guerra total descendiendo, Kait Diaz se separa para descubrir su conexión con el enemigo y descubre el verdadero peligro para Sera: ella misma.',
    esrbRating: 'M',
    releaseDate: '2019-09-10',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/a/ac/Gears_5_cover_art.png',
    publisherName: 'Xbox Game Studios',
    developerName: 'The Coalition',
    platformCode: 'XSX',
    genres: ['Shooter', 'Acción'],
    basePrice: 39.99,
  },
  {
    title: 'Hi-Fi Rush',
    slug: 'hi-fi-rush',
    synopsis: 'Siente el ritmo mientras el aspirante a estrella de rock Chai y su variopinto equipo luchan contra una malvada megacorporación de implantes en un mundo sincronizado con la música.',
    esrbRating: 'T',
    releaseDate: '2023-01-25',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/4/4b/Hi-Fi_Rush_cover_art.jpg',
    publisherName: 'Bethesda Softworks',
    developerName: 'Tango Gameworks',
    platformCode: 'XSX',
    genres: ['Acción', 'Plataformas'],
    basePrice: 29.99,
  },

  // --- PC (10 títulos) ---
  {
    title: "Baldur's Gate 3",
    slug: 'baldurs-gate-3',
    synopsis: 'Reúne a tu grupo y regresa a los Reinos Olvidados en una historia de compañerismo, traición, sacrificio y supervivencia, y la atracción del poder absoluto.',
    esrbRating: 'M',
    releaseDate: '2023-08-03',
    coverImageUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg',
    publisherName: 'Larian Studios',
    developerName: 'Larian Studios',
    platformCode: 'PC',
    genres: ['RPG', 'Estrategia', 'Fantasía'],
    basePrice: 59.99,
    sysReq: {
      min: { os: 'Windows 10 64-bit', cpu: 'Intel I5 4690 / AMD FX 8350', ram: 8, gpu: 'Nvidia GTX 970 / RX 480 (4GB+)', storage: 150, dx: 'DirectX 11' },
      rec: { os: 'Windows 10/11 64-bit', cpu: 'Intel i7 8700K / AMD r5 3600', ram: 16, gpu: 'Nvidia 2060 Super / RX 5700 XT', storage: 150, dx: 'DirectX 11' },
    },
  },
  {
    title: 'Cyberpunk 2077',
    slug: 'cyberpunk-2077',
    synopsis: 'Cyberpunk 2077 es un RPG de acción y aventura en mundo abierto ambientado en Night City, una megalópolis obsesionada con el poder, el glamur y la modificación corporal.',
    esrbRating: 'M',
    releaseDate: '2020-12-10',
    coverImageUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg',
    publisherName: 'CD Projekt',
    developerName: 'CD Projekt Red',
    platformCode: 'PC',
    genres: ['RPG', 'Acción', 'Ciencia Ficción', 'Mundo Abierto'],
    basePrice: 59.99,
    sysReq: {
      min: { os: 'Windows 10 64-bit', cpu: 'Core i7-6700 / Ryzen 5 1600', ram: 12, gpu: 'GeForce GTX 1060 6GB / Radeon RX 580', storage: 70, dx: 'DirectX 12' },
      rec: { os: 'Windows 10 64-bit', cpu: 'Core i7-12700 / Ryzen 7 7800X3D', ram: 16, gpu: 'GeForce RTX 2060 Super / Radeon RX 5700 XT', storage: 70, dx: 'DirectX 12' },
    },
  },
  {
    title: 'Elden Ring',
    slug: 'elden-ring',
    synopsis: 'EL NUEVO JUEGO DE ROL Y ACCIÓN DE FANTASÍA. Álzate, tiznado, y déjate guiar por la gracia para esgrimir el poder del Círculo de Elden y convertirte en el Señor del Círculo.',
    esrbRating: 'M',
    releaseDate: '2022-02-25',
    coverImageUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg',
    publisherName: 'Bandai Namco Entertainment',
    developerName: 'FromSoftware',
    platformCode: 'PC',
    genres: ['RPG', 'Acción', 'Fantasía', 'Mundo Abierto'],
    basePrice: 59.99,
    sysReq: {
      min: { os: 'Windows 10', cpu: 'INTEL CORE I5-8400 / AMD RYZEN 3 3300X', ram: 12, gpu: 'NVIDIA GEFORCE GTX 1060 3 GB / AMD RADEON RX 580 4 GB', storage: 60, dx: 'DirectX 12' },
      rec: { os: 'Windows 10/11', cpu: 'INTEL CORE I7-8700K / AMD RYZEN 5 3600X', ram: 16, gpu: 'NVIDIA GEFORCE GTX 1070 8 GB / AMD RADEON RX VEGA 56 8 GB', storage: 60, dx: 'DirectX 12' },
    },
  },
  {
    title: 'Red Dead Redemption 2',
    slug: 'red-dead-redemption-2',
    synopsis: 'América, 1899. Arthur Morgan y la banda de Van der Linde se ven obligados a huir. Con agentes federales y los mejores cazarrecompensas de la nación pisándoles los talones.',
    esrbRating: 'M',
    releaseDate: '2019-11-05',
    coverImageUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg',
    publisherName: 'Rockstar Games',
    developerName: 'Rockstar Games',
    platformCode: 'PC',
    genres: ['Acción', 'Aventura', 'Mundo Abierto'],
    basePrice: 59.99,
    sysReq: {
      min: { os: 'Windows 10', cpu: 'Intel Core i5-2500K / AMD FX-6300', ram: 8, gpu: 'Nvidia GeForce GTX 770 2GB / AMD Radeon R9 280 3GB', storage: 150, dx: 'DirectX 11' },
      rec: { os: 'Windows 10', cpu: 'Intel Core i7-4770K / AMD Ryzen 5 1500X', ram: 12, gpu: 'Nvidia GeForce GTX 1060 6GB / AMD Radeon RX 480 4GB', storage: 150, dx: 'DirectX 11' },
    },
  },
  {
    title: 'The Witcher 3: Wild Hunt',
    slug: 'the-witcher-3-wild-hunt',
    synopsis: 'Eres Geralt de Rivia, cazador de monstruos. En un continente devastado por la guerra e infestado de monstruos, tu misión es encontrar a Ciri, la niña de la profecía.',
    esrbRating: 'M',
    releaseDate: '2015-05-19',
    coverImageUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg',
    publisherName: 'CD Projekt',
    developerName: 'CD Projekt Red',
    platformCode: 'PC',
    genres: ['RPG', 'Acción', 'Fantasía', 'Mundo Abierto'],
    basePrice: 39.99,
    sysReq: {
      min: { os: 'Windows 10 64-bit', cpu: 'Intel CPU Core i5-2500K 3.3GHz / AMD A10-5800K APU', ram: 8, gpu: 'Nvidia GPU GeForce GTX 660 / AMD GPU Radeon HD 7870', storage: 50, dx: 'DirectX 11' },
      rec: { os: 'Windows 10 64-bit', cpu: 'Intel CPU Core i7 3770 3.4 GHz / AMD CPU AMD FX-8350 4 GHz', ram: 16, gpu: 'Nvidia GPU GeForce GTX 1070 / AMD GPU Radeon RX 480', storage: 50, dx: 'DirectX 12' },
    },
  },
  {
    title: 'Half-Life: Alyx',
    slug: 'half-life-alyx',
    synopsis: 'El regreso de Valve a la serie Half-Life en realidad virtual. Ambientado entre los eventos de Half-Life y Half-Life 2, Alyx Vance lidera la resistencia contra la Alianza.',
    esrbRating: 'M',
    releaseDate: '2020-03-23',
    coverImageUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/546560/header.jpg',
    publisherName: 'Valve',
    developerName: 'Valve',
    platformCode: 'PC',
    genres: ['Shooter', 'Acción', 'Ciencia Ficción'],
    basePrice: 59.99,
    sysReq: {
      min: { os: 'Windows 10', cpu: 'Core i5-7500 / Ryzen 5 1600', ram: 12, gpu: 'GTX 1060 / RX 580 - 6GB VRAM', storage: 67, dx: 'DirectX 11' },
      rec: { os: 'Windows 10', cpu: 'Core i7-9700K / Ryzen 7 3700X', ram: 16, gpu: 'RTX 2070 / Radeon RX 5700 XT', storage: 67, dx: 'DirectX 11' },
    },
  },
  {
    title: 'Hades',
    slug: 'hades',
    synopsis: 'Desafía al dios de los muertos mientras hackeas y acuchillas para salir del Inframundo en este roguelike de acción vertiginosa de los creadores de Bastion y Transistor.',
    esrbRating: 'T',
    releaseDate: '2020-09-17',
    coverImageUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/header.jpg',
    publisherName: 'Supergiant Games',
    developerName: 'Supergiant Games',
    platformCode: 'PC',
    genres: ['Roguelike', 'Acción', 'Fantasía'],
    basePrice: 24.99,
    sysReq: {
      min: { os: 'Windows 7 SP1', cpu: 'Dual Core 2.4 GHz', ram: 4, gpu: '1GB VRAM / DirectX 10+ support', storage: 15, dx: 'DirectX 10' },
      rec: { os: 'Windows 10 64-bit', cpu: 'Dual Core 3.0 GHz+', ram: 8, gpu: '2GB VRAM / DirectX 11+', storage: 20, dx: 'DirectX 11' },
    },
  },
  {
    title: 'Disco Elysium',
    slug: 'disco-elysium',
    synopsis: 'Un RPG policiaco innovador con un sistema de habilidades sin precedentes y una ciudad entera para forjar tu camino. Interroga a personajes inolvidables o acepta sobornos.',
    esrbRating: 'M',
    releaseDate: '2019-10-15',
    coverImageUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/632470/header.jpg',
    publisherName: 'ZA/UM',
    developerName: 'ZA/UM',
    platformCode: 'PC',
    genres: ['RPG', 'Aventura'],
    basePrice: 39.99,
    sysReq: {
      min: { os: 'Windows 7/8/10 64-bit', cpu: 'Intel Core 2 Duo', ram: 4, gpu: 'DirectX 11 compatible video card (min 512MB)', storage: 20, dx: 'DirectX 11' },
      rec: { os: 'Windows 10 64-bit', cpu: 'Intel Core i5 / AMD 1500 or equivalent', ram: 8, gpu: 'DirectX 11 compatible card (min 2GB)', storage: 20, dx: 'DirectX 11' },
    },
  },
  {
    title: 'Counter-Strike 2',
    slug: 'counter-strike-2',
    synopsis: 'Durante más de dos décadas, CS ha ofrecido una experiencia competitiva de primer nivel. Ahora comienza el siguiente capítulo: Counter-Strike 2 con el motor Source 2.',
    esrbRating: 'M',
    releaseDate: '2023-09-27',
    coverImageUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
    publisherName: 'Valve',
    developerName: 'Valve',
    platformCode: 'PC',
    genres: ['Shooter', 'Acción', 'Multijugador'],
    basePrice: 14.99,
    sysReq: {
      min: { os: 'Windows 10 64-bit', cpu: '4 hardware CPU threads - Intel Core i5 750 or higher', ram: 8, gpu: 'Video card must be 1 GB or more with Shader Model 5.0', storage: 85, dx: 'DirectX 11' },
      rec: { os: 'Windows 11 64-bit', cpu: 'Intel Core i7 9700 or AMD Ryzen 7 3700X', ram: 16, gpu: 'NVIDIA GeForce RTX 2060 or AMD Radeon RX 5600 XT', storage: 85, dx: 'DirectX 11' },
    },
  },
  {
    title: 'Diablo IV',
    slug: 'diablo-iv',
    synopsis: 'La batalla interminable entre los Altos Cielos y los Infiernos Abrasadores continúa mientras el odio amenaza con consumir Santuario en una oscura experiencia hack-and-slash.',
    esrbRating: 'M',
    releaseDate: '2023-06-06',
    coverImageUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2344520/header.jpg',
    publisherName: 'Blizzard Entertainment',
    developerName: 'Blizzard Team 3',
    platformCode: 'PC',
    genres: ['RPG', 'Acción', 'Fantasía'],
    basePrice: 69.99,
    sysReq: {
      min: { os: 'Windows 10 64-bit versión 1909 o superior', cpu: 'Intel Core i5-2500K o AMD FX-8350', ram: 8, gpu: 'NVIDIA GeForce GTX 660 o AMD Radeon R9 280', storage: 90, dx: 'DirectX 12' },
      rec: { os: 'Windows 10 64-bit versión 1909 o superior', cpu: 'Intel Core i5-4670K o AMD R3-1300X', ram: 16, gpu: 'NVIDIA GeForce GTX 970 o AMD Radeon RX 470', storage: 90, dx: 'DirectX 12' },
    },
  },
];

function generateDigitalKeyCode(): string {
  const segment = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${segment()}-${segment()}-${segment()}-${segment()}`;
}

export async function executeSeed(dataSource: DataSource): Promise<{ createdCount: number; updatedCount: number; totalCount: number }> {
  // Repositorios
  const platformRepo = dataSource.getRepository(Platform);
  const genreRepo = dataSource.getRepository(Genre);
  const publisherRepo = dataSource.getRepository(Publisher);
  const developerRepo = dataSource.getRepository(Developer);
  const gameRepo = dataSource.getRepository(Game);
  const editionRepo = dataSource.getRepository(GameEdition);
  const keyRepo = dataSource.getRepository(DigitalKey);
  const sysReqRepo = dataSource.getRepository(SystemRequirement);
  const userRepo = dataSource.getRepository(User);

  // 0. Sembrar Usuarios Base (Administrador y Cliente de prueba)
  console.log('👤 Sembrando Usuarios...');
  const isProduction = process.env.NODE_ENV === 'production';
  const adminEmail =
    process.env.SEED_ADMIN_EMAIL || 'admin@tiendavideojuegos.local';
  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ||
    (isProduction ? undefined : 'AdminDev123!');

  const seedUsersData: Array<{
    email: string;
    username: string;
    password: string;
    countryCode: string;
    isActive: boolean;
    role: UserRole;
  }> = [];

  if (!adminPassword) {
    console.warn(
      '⚠️ SEED_ADMIN_PASSWORD no está definido en producción; se omite la creación del usuario administrador por seguridad.',
    );
  } else {
    seedUsersData.push({
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
      countryCode: 'MX',
      isActive: true,
      role: UserRole.ADMIN,
    });
  }

  const customerEmail = 'customer@tiendavideojuegos.local';
  if (adminEmail.toLowerCase() !== customerEmail.toLowerCase()) {
    seedUsersData.push({
      email: customerEmail,
      username: 'gamer_mx',
      password: 'CustomerDev123!',
      countryCode: 'MX',
      isActive: true,
      role: UserRole.CUSTOMER,
    });
  } else {
    console.warn(
      `⚠️ SEED_ADMIN_EMAIL coincide con ${customerEmail}; se omite el usuario CUSTOMER de prueba para evitar colisión de email.`,
    );
  }

  for (const seedUser of seedUsersData) {
    const existingUser = await userRepo.findOne({
      where: { email: seedUser.email },
    });

    if (!existingUser) {
      const newUser = userRepo.create(seedUser);
      await userRepo.save(newUser);
    }
  }

  // 1. Sembrar Plataformas
  console.log('📦 Sembrando Plataformas...');
  const platformMap = new Map<string, Platform>();
  for (const p of PLATFORMS_DATA) {
    let plat = await platformRepo.findOne({ where: { code: p.code } });
    if (!plat) {
      plat = platformRepo.create(p);
      plat = await platformRepo.save(plat);
    }
    platformMap.set(p.code, plat);
  }

  // 2. Sembrar Géneros
  console.log('🏷️ Sembrando Géneros...');
  const genreMap = new Map<string, Genre>();
  for (const g of GENRES_DATA) {
    let genre = await genreRepo.findOne({ where: { slug: g.slug } });
    if (!genre) {
      genre = genreRepo.create(g);
      genre = await genreRepo.save(genre);
    }
    genreMap.set(g.name, genre);
  }

  // 3. Sembrar Publishers
  console.log('🏢 Sembrando Publishers...');
  const publisherMap = new Map<string, Publisher>();
  for (const pub of PUBLISHERS_DATA) {
    let p = await publisherRepo.findOne({ where: { name: pub.name } });
    if (!p) {
      p = publisherRepo.create(pub);
      p = await publisherRepo.save(p);
    }
    publisherMap.set(pub.name, p);
  }

  // 4. Sembrar Developers
  console.log('💻 Sembrando Desarrolladoras...');
  const developerMap = new Map<string, Developer>();
  for (const dev of DEVELOPERS_DATA) {
    let d = await developerRepo.findOne({ where: { name: dev.name } });
    if (!d) {
      d = developerRepo.create(dev);
      d = await developerRepo.save(d);
    }
    developerMap.set(dev.name, d);
  }

  // 5. Sembrar Videojuegos, Ediciones, Claves y Requerimientos
  console.log(`🎮 Sembrando ${GAMES_DATA.length} videojuegos reales con carátulas e inventario...`);
  let createdCount = 0;
  let updatedCount = 0;

  for (const data of GAMES_DATA) {
    const publisher = publisherMap.get(data.publisherName);
    const developer = developerMap.get(data.developerName);
    const platform = platformMap.get(data.platformCode);

    if (!publisher || !developer || !platform) {
      console.warn(`⚠️ Relación faltante para juego ${data.title}`);
      continue;
    }

    const assignedGenres: Genre[] = [];
    for (const gName of data.genres) {
      const g = genreMap.get(gName);
      if (g) assignedGenres.push(g);
    }

    let game = await gameRepo.findOne({
      where: { slug: data.slug },
      relations: { genres: true },
    });

    if (!game) {
      game = gameRepo.create({
        title: data.title,
        slug: data.slug,
        synopsis: data.synopsis,
        esrbRating: data.esrbRating,
        releaseDate: data.releaseDate,
        coverImageUrl: data.coverImageUrl,
        publisher,
        developer,
        genres: assignedGenres,
      });
      game = await gameRepo.save(game);
      createdCount++;
    } else {
      game.title = data.title;
      game.synopsis = data.synopsis;
      game.coverImageUrl = data.coverImageUrl;
      game.esrbRating = data.esrbRating;
      game.releaseDate = data.releaseDate;
      game.publisher = publisher;
      game.developer = developer;
      game.genres = assignedGenres;
      game = await gameRepo.save(game);
      updatedCount++;
    }

    // Ediciones: Standard Edition y Deluxe Edition
    const editionsToSeed = [
      { name: 'Standard Edition', price: data.basePrice },
      { name: 'Deluxe Edition', price: Number((data.basePrice + 19.99).toFixed(2)) },
    ];

    for (const edInfo of editionsToSeed) {
      let edition = await editionRepo.findOne({
        where: {
          game: { id: game.id },
          platform: { id: platform.id },
          editionName: edInfo.name,
          format: EditionFormat.DIGITAL,
        },
      });

      if (!edition) {
        edition = editionRepo.create({
          editionName: edInfo.name,
          format: EditionFormat.DIGITAL,
          basePrice: edInfo.price,
          isDlc: false,
          stockPhysical: 0,
          game,
          platform,
        });
        edition = await editionRepo.save(edition);

        // Generar 5 claves digitales únicas por edición
        const keysToInsert: DigitalKey[] = [];
        for (let i = 0; i < 5; i++) {
          const rawCode = generateDigitalKeyCode();
          const hash = crypto.createHash('sha256').update(rawCode).digest('hex');
          const dKey = keyRepo.create({
            code: rawCode,
            codeHash: hash,
            status: KeyStatus.AVAILABLE,
            batchId: `SEED-${data.platformCode}-${Date.now()}`,
            gameEdition: edition,
          });
          keysToInsert.push(dKey);
        }
        await keyRepo.save(keysToInsert);
      }
    }

    // Requerimientos del sistema (si aplica para PC)
    if (data.sysReq) {
      const existingReqs = await sysReqRepo.find({ where: { game: { id: game.id } } });
      if (existingReqs.length === 0) {
        const min = sysReqRepo.create({
          tier: RequirementTier.MINIMUM,
          os: data.sysReq.min.os,
          processor: data.sysReq.min.cpu,
          ramGb: data.sysReq.min.ram,
          graphicsCard: data.sysReq.min.gpu,
          storageGb: data.sysReq.min.storage,
          directxVersion: data.sysReq.min.dx || 'DirectX 11',
          game,
        });
        const rec = sysReqRepo.create({
          tier: RequirementTier.RECOMMENDED,
          os: data.sysReq.rec.os,
          processor: data.sysReq.rec.cpu,
          ramGb: data.sysReq.rec.ram,
          graphicsCard: data.sysReq.rec.gpu,
          storageGb: data.sysReq.rec.storage,
          directxVersion: data.sysReq.rec.dx || 'DirectX 12',
          game,
        });
        await sysReqRepo.save([min, rec]);
      }
    }
  }

  console.log(`\n🎉 Seeding completado exitosamente:`);
  console.log(`   - Juegos creados: ${createdCount}`);
  console.log(`   - Juegos actualizados: ${updatedCount}`);
  console.log(`   - Total catálogo: ${GAMES_DATA.length}`);
  console.log(`   - Nintendo Switch: 11 juegos`);
  console.log(`   - PlayStation 5: 6 juegos`);
  console.log(`   - Xbox Series X|S: 5 juegos`);
  console.log(`   - PC: 10 juegos`);

  return { createdCount, updatedCount, totalCount: GAMES_DATA.length };
}

export async function runSeed() {
  console.log('🚀 Conectando a la base de datos...');
  await dataSource.initialize();
  console.log('✅ Conexión establecida con éxito.');
  await executeSeed(dataSource);
  await dataSource.destroy();
}

if (process.argv[1]?.includes('seed.js') || process.argv[1]?.includes('seed.ts')) {
  runSeed().catch((err) => {
    console.error('❌ Error durante la ejecución del seeder:', err);
    process.exit(1);
  });
}
