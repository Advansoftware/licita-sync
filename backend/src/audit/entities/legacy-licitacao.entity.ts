import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: process.env.LEGACY_TABLE_NAME || 'licitacoes' }) // Assumindo nome da tabela legado
export class LegacyLicitacao {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'num_edital' })
  num_edital: string;

  @Column({ type: 'text' })
  descricao: string;

  @Column()
  titulo: string;

  @Column({ name: 'data_abertura', nullable: true })
  data_abertura: Date;
}
