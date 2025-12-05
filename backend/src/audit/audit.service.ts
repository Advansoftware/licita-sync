import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StagingItem, AuditStatus } from './entities/staging-item.entity';
import { LegacyLicitacao } from './entities/legacy-licitacao.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(StagingItem)
    private stagingRepo: Repository<StagingItem>,
    @InjectRepository(LegacyLicitacao, 'legacy')
    private legacyRepo: Repository<LegacyLicitacao>,
  ) { }

  async getBatches() {
    return this.stagingRepo
      .createQueryBuilder('item')
      .select('item.batchId', 'batchId')
      .distinct(true)
      .getRawMany();
  }

  async getLegacyColumns() {
    const tableName = process.env.LEGACY_TABLE_NAME || 'licitacoes';
    const columns = await this.legacyRepo.query(`DESCRIBE ${tableName}`);
    return columns.map((c: any) => c.Field);
  }

  async deleteBatch(batchId: string) {
    const result = await this.stagingRepo.delete({ batchId });
    return { success: true, deleted: result.affected };
  }

  async getBatch(
    batchId: string,
    mapping?: { edital?: string; titulo?: string; descricao?: string },
    page: number = 1,
    limit: number = 20,
    keyField: string = 'edital'
  ) {
    const skip = (page - 1) * limit;

    // Fetch paginated staging items, sorted by Status (PENDING first) then ID
    const [stagingItems, total] = await this.stagingRepo.findAndCount({
      where: { batchId },
      order: {
        status: 'ASC', // PENDING comes before SYNCED alphabetically? No, PENDING vs SYNCED. P < S. So ASC is correct.
        id: 'ASC'
      },
      take: limit,
      skip: skip
    });

    const tableName = process.env.LEGACY_TABLE_NAME || 'licitacoes';

    console.log('DEBUG - getBatch called with mapping:', mapping);

    const map = {
      edital: mapping?.edital !== undefined && mapping?.edital !== '' ? mapping.edital : 'num_edital',
      titulo: mapping?.titulo !== undefined && mapping?.titulo !== '' ? mapping.titulo : 'titulo',
      descricao: mapping?.descricao !== undefined && mapping?.descricao !== '' ? mapping.descricao : 'descricao'
    };

    console.log('DEBUG - Resolved map:', map);

    const results: any[] = [];

    if (stagingItems.length === 0) {
      return { data: [], total, page, limit };
    }

    // Optimization: Batch fetch legacy items using the selected key field
    // keyField corresponds to the property on StagingItem (edital, titulo, processo)
    // map.edital corresponds to the column in Legacy DB (usually the key column)
    // NOTE: We assume 'map.edital' is ALWAYS the column we want to match against,
    // even if we use 'titulo' from staging as the value.
    // If the user selects "Key Field: Title", they should also map "Legacy Key Column" to the Title column in DB.
    // So we use `map.edital` as the "Legacy Key Column" variable name.

    const keys = stagingItems.map(i => i[keyField]).filter(e => e);

    let legacyItems: any[] = [];
    if (keys.length > 0) {
      // WARNING: Ensure editais are safe strings or use parameterized query carefully.
      // TypeORM query builder or raw query with IN (?) is tricky with array.
      // We will use string construction for the IN clause but parameterized values.
      const placeholders = keys.map(() => '?').join(',');
      legacyItems = await this.legacyRepo.query(
        `SELECT * FROM ${tableName} WHERE ${map.edital} IN (${placeholders})`,
        keys
      );
    }

    // Map legacy items by key for O(1) lookup
    const legacyMap = new Map();
    legacyItems.forEach(i => {
      legacyMap.set(i[map.edital], i);
    });

    for (const item of stagingItems) {
      const keyValue = item[keyField];
      const legacyItem = legacyMap.get(keyValue);

      const normalizedLegacy = legacyItem ? {
        id: legacyItem.id,
        titulo: legacyItem[map.titulo],
        descricao: legacyItem[map.descricao],
        edital: legacyItem[map.edital]
      } : null;

      results.push({
        staging: item,
        legacy: normalizedLegacy,
        diff: !normalizedLegacy ||
          normalizedLegacy.descricao !== item.descricao ||
          normalizedLegacy.titulo !== item.titulo
      });
    }

    return { data: results, total, page, limit };
  }

  async sync(
    id: number,
    fieldsToUpdate: string[],
    mapping?: { edital?: string; titulo?: string; descricao?: string },
    keyField: string = 'edital'
  ) {
    const stagingItem = await this.stagingRepo.findOne({ where: { id } });
    if (!stagingItem) throw new NotFoundException('Staging item not found');

    const tableName = process.env.LEGACY_TABLE_NAME || 'licitacoes';
    const map = {
      edital: mapping?.edital || 'num_edital',
      titulo: mapping?.titulo || 'titulo',
      descricao: mapping?.descricao || 'descricao'
    };

    // Check existence using dynamic key
    const keyValue = stagingItem[keyField];
    const [legacyItem] = await this.legacyRepo.query(
      `SELECT * FROM ${tableName} WHERE ${map.edital} = ? LIMIT 1`,
      [keyValue]
    );

    if (!legacyItem) {
      throw new NotFoundException('Legacy item not found for update');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (fieldsToUpdate.includes('descricao')) {
      updates.push(`${map.descricao} = ?`);
      params.push(stagingItem.descricao);
    }
    if (fieldsToUpdate.includes('titulo')) {
      updates.push(`${map.titulo} = ?`);
      params.push(stagingItem.titulo);
    }

    if (updates.length > 0) {
      // Assuming 'id' is the primary key. Ideally, we should also map the PK.
      // For now, using the ID found in the SELECT query.
      params.push(legacyItem.id);
      await this.legacyRepo.query(
        `UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    stagingItem.status = AuditStatus.SYNCED;
    await this.stagingRepo.save(stagingItem);

    return { success: true };
  }

  async updateStagingItem(id: number, updates: { titulo?: string; descricao?: string }) {
    const item = await this.stagingRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Staging item not found');

    if (updates.titulo !== undefined) item.titulo = updates.titulo;
    if (updates.descricao !== undefined) item.descricao = updates.descricao;

    return await this.stagingRepo.save(item);
  }
}
