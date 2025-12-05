import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum AuditStatus {
  PENDING = 'PENDING',
  SYNCED = 'SYNCED',
}

@Entity()
export class StagingItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  processo: string;

  @Column()
  edital: string; // Chave de match (ex: "001/2017")

  @Column({ type: 'text' })
  descricao: string;

  @Column()
  titulo: string;

  @Column({ type: 'varchar', nullable: true })
  ano: string | null; // Ano da licitação (ex: "2021")

  @Column({
    type: 'enum',
    enum: AuditStatus,
    default: AuditStatus.PENDING,
  })
  status: AuditStatus;

  @Column({ nullable: true })
  batchId: string; // Para agrupar importações

  @Column({ type: 'text', nullable: true })
  sourceUrl: string | null; // URL de origem do scraping
}
