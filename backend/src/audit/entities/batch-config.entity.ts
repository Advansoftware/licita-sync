import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class BatchConfig {
  @PrimaryColumn()
  batchId: string;

  @Column({ type: 'text', nullable: true })
  sourceUrl: string | null;

  // Mapping configuration
  @Column({ default: 'edital' })
  keyField: string; // 'edital', 'titulo', 'processo'

  @Column({ type: 'varchar', nullable: true })
  mapEdital: string | null; // Column name in legacy DB

  @Column({ type: 'varchar', nullable: true })
  mapTitulo: string | null;

  @Column({ type: 'varchar', nullable: true })
  mapDescricao: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
