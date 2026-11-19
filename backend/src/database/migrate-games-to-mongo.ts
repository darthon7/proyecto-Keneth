import 'reflect-metadata';
import mongoose, { type Model } from 'mongoose';
import { DataSource } from 'typeorm';
import {
  Game,
  GameSchema,
  type GameDocument,
} from '../games/schemas/game.schema.js';
import {
  Counter,
  CounterSchema,
  type CounterDocument,
} from '../games/schemas/counter.schema.js';

try {
  process.loadEnvFile('.env');
} catch {
  try {
    process.loadEnvFile('backend/.env');
  } catch {
    // Environment variables already present
  }
}

interface RawGameRow {
  id: number | string;
  title: string;
  slug: string;
  synopsis?: string | null;
  esrbRating?: string;
  esrb_rating?: string;
  releaseDate?: string | Date;
  release_date?: string | Date;
  coverImageUrl?: string | null;
  cover_image_url?: string | null;
  discountCampaignName?: string | null;
  discount_campaign_name?: string | null;
  discountPercentage?: number | string | null;
  discount_percentage?: number | string | null;
  discountStartDate?: Date | string | null;
  discount_start_date?: Date | string | null;
  discountEndDate?: Date | string | null;
  discount_end_date?: Date | string | null;
  createdAt?: Date | string | null;
  created_at?: Date | string | null;
  publisherId?: number | string;
  publisher_id?: number | string;
  developerId?: number | string;
  developer_id?: number | string;
}

interface RawGameGenreRow {
  game_id?: number | string;
  gameId?: number | string;
  gamesId?: number | string;
  genre_id?: number | string;
  genreId?: number | string;
  genresId?: number | string;
}

function createMigrationDataSource(): DataSource {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    return new DataSource({
      type: 'postgres',
      url: databaseUrl,
      ssl: { rejectUnauthorized: false },
      synchronize: false,
    });
  }

  const dbType = (process.env.APP_TYPE || 'mysql') as 'mysql' | 'postgres';
  return new DataSource({
    type: dbType,
    host: process.env.APP_HOST || 'localhost',
    port: Number(process.env.APP_PORT || (dbType === 'postgres' ? 5432 : 3306)),
    username: process.env.APP_USERNAME || 'root',
    password: process.env.APP_PASSWORD || '1111',
    database: process.env.APP_DATABASE || 'tienda_videojuegos',
    ssl: dbType === 'postgres' ? { rejectUnauthorized: false } : false,
    synchronize: false,
  });
}

function formatReleaseDate(value: string | Date | undefined): string {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function toNullableDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

async function tableExists(
  dataSource: DataSource,
  tableName: string,
): Promise<boolean> {
  const isPostgres = dataSource.options.type === 'postgres';
  if (isPostgres) {
    const rows = (await dataSource.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [tableName],
    )) as Array<{ cnt: string | number }>;
    return Number(rows[0]?.cnt ?? 0) > 0;
  }

  const dbName =
    (dataSource.options as { database?: string }).database ||
    process.env.APP_DATABASE ||
    'tienda_videojuegos';
  const rows = (await dataSource.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [dbName, tableName],
  )) as Array<{ cnt: string | number }>;
  return Number(rows[0]?.cnt ?? 0) > 0;
}

export async function dropLegacyMysqlGameTables(
  dataSource: DataSource,
): Promise<void> {
  const isPostgres = dataSource.options.type === 'postgres';

  if (isPostgres) {
    await dataSource.query('DROP TABLE IF EXISTS game_genres, games CASCADE');
    console.log('🧹 Tablas heredadas game_genres y games eliminadas (PostgreSQL).');
    return;
  }

  const dbName =
    (dataSource.options as { database?: string }).database ||
    process.env.APP_DATABASE ||
    'tienda_videojuegos';

  const fkRows = (await dataSource.query(
    `SELECT DISTINCT TABLE_NAME AS tableName, CONSTRAINT_NAME AS constraintName
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ?
       AND REFERENCED_TABLE_NAME IN ('games', 'game_genres')`,
    [dbName],
  )) as Array<{ tableName: string; constraintName: string }>;

  for (const fk of fkRows) {
    const safeTable = fk.tableName.replaceAll('`', '');
    const safeConstraint = fk.constraintName.replaceAll('`', '');
    console.log(
      `🔗 Eliminando FK heredada ${safeConstraint} en tabla ${safeTable}...`,
    );
    await dataSource.query(
      `ALTER TABLE \`${safeTable}\` DROP FOREIGN KEY \`${safeConstraint}\``,
    );
  }

  await dataSource.query('DROP TABLE IF EXISTS `game_genres`, `games`');
  console.log('🧹 Tablas heredadas game_genres y games eliminadas de MySQL.');
}

export async function migrateGamesToMongo(
  argv: string[] = process.argv,
): Promise<{ migratedCount: number; maxId: number }> {
  const shouldDropMysql = argv.includes('--drop-mysql');
  const dataSource = createMigrationDataSource();
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/tienda_videojuegos';

  let connectedMongo = false;

  try {
    console.log('🚀 Conectando a MySQL/Postgres y MongoDB...');
    await dataSource.initialize();
    await mongoose.connect(mongoUri);
    connectedMongo = true;

    const gameModel = (mongoose.models[Game.name] ??
      mongoose.model(
        Game.name,
        GameSchema as unknown as mongoose.Schema,
      )) as Model<GameDocument>;
    const counterModel = (mongoose.models[Counter.name] ??
      mongoose.model(
        Counter.name,
        CounterSchema as unknown as mongoose.Schema,
      )) as Model<CounterDocument>;

    const hasGamesTable = await tableExists(dataSource, 'games');
    let migratedCount = 0;
    let maxId = 0;

    if (!hasGamesTable) {
      console.log(
        'ℹ️ La tabla "games" no existe en SQL; no hay registros pendientes por migrar.',
      );
      const latestDoc = await gameModel
        .findOne()
        .sort({ id: -1 })
        .select('id')
        .lean()
        .exec();
      maxId = latestDoc?.id ?? 0;
    } else {
      const gameRows = (await dataSource.query(
        'SELECT * FROM games ORDER BY id ASC',
      )) as RawGameRow[];

      const genresByGameId = new Map<number, number[]>();
      const hasPivotTable = await tableExists(dataSource, 'game_genres');
      if (hasPivotTable) {
        const pivotRows = (await dataSource.query(
          'SELECT * FROM game_genres',
        )) as RawGameGenreRow[];
        for (const pivot of pivotRows) {
          const gId = Number(pivot.game_id ?? pivot.gameId ?? pivot.gamesId);
          const genreId = Number(
            pivot.genre_id ?? pivot.genreId ?? pivot.genresId,
          );
          if (!Number.isFinite(gId) || !Number.isFinite(genreId)) continue;
          const list = genresByGameId.get(gId) ?? [];
          if (!list.includes(genreId)) {
            list.push(genreId);
          }
          genresByGameId.set(gId, list);
        }
      }

      for (const row of gameRows) {
        const id = Number(row.id);
        if (id > maxId) {
          maxId = id;
        }

        const createdAt =
          toNullableDate(row.createdAt ?? row.created_at) ?? new Date();
        const payload = {
          id,
          title: row.title,
          slug: row.slug,
          synopsis: row.synopsis ?? null,
          esrbRating: row.esrbRating ?? row.esrb_rating ?? 'E',
          releaseDate: formatReleaseDate(row.releaseDate ?? row.release_date),
          coverImageUrl: row.coverImageUrl ?? row.cover_image_url ?? null,
          discountCampaignName:
            row.discountCampaignName ?? row.discount_campaign_name ?? null,
          discountPercentage: Number(
            row.discountPercentage ?? row.discount_percentage ?? 0,
          ),
          discountStartDate: toNullableDate(
            row.discountStartDate ?? row.discount_start_date,
          ),
          discountEndDate: toNullableDate(
            row.discountEndDate ?? row.discount_end_date,
          ),
          publisherId: Number(row.publisherId ?? row.publisher_id),
          developerId: Number(row.developerId ?? row.developer_id),
          genreIds: genresByGameId.get(id) ?? [],
          updatedAt: new Date(),
        };

        await gameModel
          .updateOne(
            { id },
            { $set: payload, $setOnInsert: { createdAt } },
            { upsert: true, timestamps: false },
          )
          .exec();
        migratedCount++;
      }

      await counterModel
        .updateOne({ _id: 'games' }, { $max: { seq: maxId } }, { upsert: true })
        .exec();

      console.log(
        `✅ Migración completada: ${migratedCount} juegos sincronizados en MongoDB (counters.games.seq = ${maxId}).`,
      );
    }

    if (shouldDropMysql) {
      await dropLegacyMysqlGameTables(dataSource);
    }

    return { migratedCount, maxId };
  } finally {
    if (connectedMongo) {
      await mongoose.disconnect();
    }
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (
  process.argv[1]?.includes('migrate-games-to-mongo.js') ||
  process.argv[1]?.includes('migrate-games-to-mongo.ts')
) {
  migrateGamesToMongo().catch((err) => {
    console.error('❌ Error durante la migración de games a MongoDB:', err);
    process.exit(1);
  });
}
