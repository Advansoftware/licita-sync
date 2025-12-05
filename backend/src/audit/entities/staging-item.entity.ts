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

  @Column({ type: 'text', nullable: true })
  data: string | null;

  @Column({
    type: 'enum',
    enum: AuditStatus,
    default: AuditStatus.PENDING,
  })
  status: AuditStatus;

  @Column({ nullable: true })
  batchId: string; // Para agrupar importações
}
