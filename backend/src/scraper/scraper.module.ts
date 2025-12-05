import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { StagingItem } from '../audit/entities/staging-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StagingItem])],
  controllers: [ScraperController],
  providers: [ScraperService],
})
export class ScraperModule { }
