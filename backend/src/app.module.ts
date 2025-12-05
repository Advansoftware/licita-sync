import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScraperModule } from './scraper/scraper.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { StagingItem } from './audit/entities/staging-item.entity';
import { BatchConfig } from './audit/entities/batch-config.entity';
import { LegacyLicitacao } from './audit/entities/legacy-licitacao.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    // Default Connection (Postgres - Staging)
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || 'user',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'staging_db',
      entities: [StagingItem, BatchConfig],
      synchronize: true, // Dev only
    }),
    // Legacy Connection (MySQL - Production)
    TypeOrmModule.forRoot({
      name: 'legacy',
      type: 'mysql',
      host: process.env.LEGACY_DB_HOST || 'localhost',
      port: parseInt(process.env.LEGACY_DB_PORT || '3306'),
      username: process.env.LEGACY_DB_USER || 'user',
      password: process.env.LEGACY_DB_PASSWORD || 'password',
      database: process.env.LEGACY_DB_NAME || 'production_db',
      entities: [LegacyLicitacao],
      synchronize: false, // Production safety: do not alter schema automatically
    }),
    ScraperModule,
    AuditModule,
    AuthModule,
  ],
})
export class AppModule { }
