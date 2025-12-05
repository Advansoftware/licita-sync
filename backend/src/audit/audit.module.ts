import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { StagingItem } from './entities/staging-item.entity';
import { LegacyLicitacao } from './entities/legacy-licitacao.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StagingItem]), // Default connection
    TypeOrmModule.forFeature([LegacyLicitacao], 'legacy'), // Legacy connection
  ],
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule { }
