import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@yggdrasil/shared-utilities';

interface MigrationDocument {
  _id: string;
  name: string;
  executedAt: Date;
  status: 'success' | 'failed' | 'pending';
  error?: string;
  duration?: number;
}

export abstract class Migration {
  abstract name: string;
  abstract description: string;

  abstract up(): Promise<void>;
  abstract down(): Promise<void>;

  protected async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await fn();
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export class MigrationRunner {
  private migrations: Map<string, Migration> = new Map();
  private migrationModel: mongoose.Model<MigrationDocument>;

  constructor() {
    // Create migration tracking collection
    const schema = new mongoose.Schema<MigrationDocument>({
      _id: String,
      name: { type: String, required: true, unique: true },
      executedAt: { type: Date, required: true },
      status: {
        type: String,
        enum: ['success', 'failed', 'pending'],
        required: true,
      },
      error: String,
      duration: Number,
    });

    this.migrationModel = mongoose.model<MigrationDocument>('Migration', schema);
  }

  async loadMigrations(directory: string) {
    const files = fs
      .readdirSync(directory)
      .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
      .filter(f => !f.includes('.map'))
      .sort(); // Ensure consistent order

    for (const file of files) {
      const migrationPath = path.join(directory, file);
      const MigrationClass = require(migrationPath).default;

      if (MigrationClass && MigrationClass.prototype instanceof Migration) {
        const migration = new MigrationClass();
        this.migrations.set(migration.name, migration);
        logger.info(`Loaded migration: ${migration.name}`);
      }
    }
  }

  async getExecutedMigrations(): Promise<string[]> {
    const executed = await this.migrationModel.find({ status: 'success' }).sort({ executedAt: 1 });

    return executed.map(m => m.name);
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const executed = await this.getExecutedMigrations();
    const pending: Migration[] = [];

    for (const [name, migration] of this.migrations) {
      if (!executed.includes(name)) {
        pending.push(migration);
      }
    }

    return pending;
  }

  async runMigration(migration: Migration, direction: 'up' | 'down' = 'up') {
    const startTime = Date.now();
    logger.info(`Running migration ${direction}: ${migration.name}`);

    try {
      if (direction === 'up') {
        await migration.up();
      } else {
        await migration.down();
      }

      const duration = Date.now() - startTime;

      if (direction === 'up') {
        await this.migrationModel.create({
          _id: new mongoose.Types.ObjectId().toString(),
          name: migration.name,
          executedAt: new Date(),
          status: 'success',
          duration,
        });
      } else {
        await this.migrationModel.deleteOne({ name: migration.name });
      }

      logger.info(`Migration ${migration.name} completed in ${duration}ms`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.migrationModel.create({
        _id: new mongoose.Types.ObjectId().toString(),
        name: migration.name,
        executedAt: new Date(),
        status: 'failed',
        error: errorMessage,
        duration: Date.now() - startTime,
      });

      logger.error(`Migration ${migration.name} failed:`, error);
      throw error;
    }
  }

  async up(target?: string) {
    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    for (const migration of pending) {
      await this.runMigration(migration, 'up');

      if (target && migration.name === target) {
        break;
      }
    }
  }

  async down(steps = 1) {
    const executed = await this.getExecutedMigrations();
    const toRevert = executed.slice(-steps).reverse();

    for (const name of toRevert) {
      const migration = this.migrations.get(name);
      if (!migration) {
        throw new Error(`Migration ${name} not found`);
      }

      await this.runMigration(migration, 'down');
    }
  }

  async status() {
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();
    const failed = await this.migrationModel.find({ status: 'failed' });

    return {
      executed: executed.length,
      pending: pending.length,
      failed: failed.length,
      lastMigration: executed[executed.length - 1],
      details: {
        executed,
        pending: pending.map(m => m.name),
        failed: failed.map(f => ({ name: f.name, error: f.error })),
      },
    };
  }
}

// CLI interface
export async function runMigrationCLI() {
  const command = process.argv[2];
  const runner = new MigrationRunner();

  await runner.loadMigrations(path.join(__dirname, 'migrations'));

  switch (command) {
    case 'up':
      await runner.up(process.argv[3]);
      break;

    case 'down':
      await runner.down(parseInt(process.argv[3] || '1'));
      break;

    case 'status':
      const status = await runner.status();
      console.log('Migration Status:');
      console.log(`  Executed: ${status.executed}`);
      console.log(`  Pending: ${status.pending}`);
      console.log(`  Failed: ${status.failed}`);
      if (status.lastMigration) {
        console.log(`  Last: ${status.lastMigration}`);
      }
      break;

    default:
      console.log('Usage: migration [up|down|status] [target]');
  }
}
