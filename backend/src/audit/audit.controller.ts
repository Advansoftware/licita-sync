import { Controller, Get, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) { }

  @Get('schema')
  getSchema() {
    return this.auditService.getLegacyColumns();
  }

  @Get('batches')
  getBatches() {
    return this.auditService.getBatches();
  }

  @Delete('batch/:batchId')
  deleteBatch(@Param('batchId') batchId: string) {
    return this.auditService.deleteBatch(batchId);
  }

  @Get('batch/:batchId/years')
  getBatchYears(@Param('batchId') batchId: string) {
    return this.auditService.getBatchYears(batchId);
  }

  @Get('batch/:batchId/status')
  getBatchStatus(@Param('batchId') batchId: string) {
    return this.auditService.getBatchStatus(batchId);
  }

  @Get(':batchId')
  getBatch(
    @Param('batchId') batchId: string,
    @Query('map_edital') edital?: string,
    @Query('map_titulo') titulo?: string,
    @Query('map_descricao') descricao?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('key_field') keyField: string = 'edital',
    @Query('ano') ano?: string,
  ) {
    const mapping = (edital !== undefined || titulo !== undefined || descricao !== undefined)
      ? { edital, titulo, descricao }
      : undefined;
    return this.auditService.getBatch(batchId, mapping, page, limit, keyField, ano);
  }

  @Patch('sync/:id')
  sync(
    @Param('id') id: string,
    @Body('fieldsToUpdate') fieldsToUpdate: string[],
    @Body('mapping') mapping?: { edital?: string; titulo?: string; descricao?: string },
    @Body('keyField') keyField: string = 'edital'
  ) {
    return this.auditService.sync(+id, fieldsToUpdate, mapping, keyField);
  }

  @Patch('staging/:id')
  updateStaging(
    @Param('id') id: string,
    @Body() updates: { titulo?: string; descricao?: string }
  ) {
    return this.auditService.updateStagingItem(+id, updates);
  }
}
