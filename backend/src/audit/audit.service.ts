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
    // We need to get the corresponding mapped column from the legacy database
    const keyColumnMap = {
      'edital': map.edital,
      'titulo': map.titulo,
      'processo': map.edital  // processo usually maps to edital column
    };

    const legacyKeyColumn = keyColumnMap[keyField] || map.edital;

    console.log('DEBUG - Key field matching:');
    console.log('  keyField (from staging):', keyField);
    console.log('  legacyKeyColumn (in DB):', legacyKeyColumn);
    console.log('  map:', map);

    const keys = stagingItems.map(i => i[keyField]).filter(e => e);
    console.log('  keys to search:', keys.slice(0, 5)); // Show first 5 keys

    let legacyItems: any[] = [];
    if (keys.length > 0) {
      // WARNING: Ensure keys are safe strings or use parameterized query carefully.
      // TypeORM query builder or raw query with IN (?) is tricky with array.
      // We will use string construction for the IN clause but parameterized values.
      const placeholders = keys.map(() => '?').join(',');
      const query = `SELECT * FROM ${tableName} WHERE ${legacyKeyColumn} IN (${placeholders})`;
      console.log('  SQL query:', query);
      console.log('  SQL params:', keys.slice(0, 5));

      legacyItems = await this.legacyRepo.query(query, keys);
      console.log('  Found legacy items:', legacyItems.length);
    }

    // Map legacy items by key for O(1) lookup
    const legacyMap = new Map();
    legacyItems.forEach(i => {
      legacyMap.set(i[legacyKeyColumn], i);
    });

    for (const item of stagingItems) {
      const keyValue = item[keyField];
      const legacyItem = legacyMap.get(keyValue);

      if (!legacyItem) {
        console.log(`  No match found for ${keyField}="${keyValue}"`);
      }

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

    // Get the correct legacy column based on the selected key field
    const keyColumnMap = {
      'edital': map.edital,
      'titulo': map.titulo,
      'processo': map.edital
    };

    const legacyKeyColumn = keyColumnMap[keyField] || map.edital;

    // Check existence using dynamic key
    const keyValue = stagingItem[keyField];
    const [legacyItem] = await this.legacyRepo.query(
      `SELECT * FROM ${tableName} WHERE ${legacyKeyColumn} = ? LIMIT 1`,
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
