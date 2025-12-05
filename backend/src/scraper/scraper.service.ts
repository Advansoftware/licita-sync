import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { StagingItem, AuditStatus } from '../audit/entities/staging-item.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ScraperService {
  constructor(
    @InjectRepository(StagingItem)
    private stagingRepo: Repository<StagingItem>,
  ) { }

  async run(url: string, selectors?: { container?: string; edital?: string; descricao?: string; titulo?: string }) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Generate human-readable batchId from URL
    const urlObj = new URL(url);
    const tipo = urlObj.searchParams.get('p') || 'licitacao';
    const ano = urlObj.searchParams.get('ano') || 'sem_ano';
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const batchId = `${tipo}_${ano}_${timestamp}`;

    const items: StagingItem[] = [];

    const containerSelector = selectors?.container || 'details';
    const editalSelector = selectors?.edital || 'h4';
    const descricaoSelector = selectors?.descricao || 'p';
    const tituloSelector = selectors?.titulo || 'summary';

    $(containerSelector).each((_, element) => {
      const container = $(element);

      // titulo = summary (ex: "Processo Licitatório 004/2017")
      const tituloText = container.find(tituloSelector).first().text().trim();

      // edital = h4 ou h2 (ex: "Edital - nº 001/2017" ou "Pregão Eletrônico 003/2021")
      const editalText = container.find(editalSelector).first().text().trim();

      // descricao = first matching tag (ex: "Objeto o registro de preços...")
      const descricaoText = container.find(descricaoSelector).first().text().trim();

      console.log('DEBUG - Container found');
      console.log('  Titulo:', tituloText);
      console.log('  Edital:', editalText);
      console.log('  Descricao:', descricaoText.substring(0, 50));

      // Extrair número do edital (ex: "001/2017")
      let editalMatch = editalText.match(/(\d+\/\d+)/);
      let edital = editalMatch ? editalMatch[1] : editalText;

      // Se não achou padrão X/Y mas temos o ano na URL, tenta achar só o número e concatenar
      if (!edital.includes('/') && ano) {
        const numberMatch = editalText.match(/(\d+)/);
        if (numberMatch) {
          edital = `${numberMatch[1]}/${ano}`;
        }
      }

      // Se ainda não temos edital, tenta extrair do título (ex: "Processo Licitatório 165/2021")
      if (!edital && tituloText) {
        const tituloMatch = tituloText.match(/(\d+\/\d+)/);
        if (tituloMatch) {
          edital = tituloMatch[1];
        }
      }

      // Salva se temos pelo menos o título
      if (tituloText) {
        const item = new StagingItem();
        item.processo = tituloText; // Processo Licitatório 004/2017
        item.titulo = tituloText;   // Processo Licitatório 004/2017
        item.edital = edital || '[SEM EDITAL]'; // Marca quando não tem
        item.descricao = descricaoText || '[SEM DESCRIÇÃO]'; // Marca quando não tem
        item.batchId = batchId;
        item.status = AuditStatus.PENDING;
        item.data = ano || null;
        item.sourceUrl = url;
        items.push(item);
        console.log('  ✓ Item added to batch');
      } else {
        console.log('  ✗ Item skipped - missing titulo');
      }
    });

    console.log(`Total items scraped: ${items.length}`);
    return this.stagingRepo.save(items);
  }

  async preview(url: string) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Extract only the container elements (details tags by default)
    const containers = $('details');
    let previewHtml = '';

    containers.each((index, element) => {
      if (index < 3) { // Show only first 3 containers to keep it manageable
        previewHtml += `<!-- CONTAINER ${index + 1} -->\n`;
        previewHtml += $(element).html() || '';
        previewHtml += '\n\n';
      }
    });

    return {
      html: previewHtml || 'Nenhum container <details> encontrado. Tente usar outro seletor.',
      count: containers.length
    };
  }
}
