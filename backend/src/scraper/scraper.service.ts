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
    const urlObj = new URL(url);
    const tipo = urlObj.searchParams.get('p') || 'licitacao';
    const anoParam = urlObj.searchParams.get('ano');

    // Se não tem ano na URL, detecta todos os anos disponíveis e faz scraping de cada
    if (!anoParam) {
      return this.runMultiYear(url, tipo, selectors);
    }

    // Se tem ano, faz scraping normal de uma única página
    return this.scrapeSinglePage(url, tipo, anoParam, selectors);
  }

  private async runMultiYear(baseUrl: string, tipo: string, selectors?: { container?: string; edital?: string; descricao?: string; titulo?: string }) {
    const { data } = await axios.get(baseUrl);
    const $ = cheerio.load(data);

    // Extrair todos os anos disponíveis dos links .btmenu
    const years: string[] = [];
    $('a.btmenu').each((_, el) => {
      const href = $(el).attr('href') || '';
      const yearMatch = href.match(/ano=(\d{4})/);
      if (yearMatch && !years.includes(yearMatch[1])) {
        years.push(yearMatch[1]);
      }
    });

    console.log(`Detected years: ${years.join(', ')}`);

    if (years.length === 0) {
      // Fallback: scrape a página atual sem ano
      return this.scrapeSinglePage(baseUrl, tipo, null, selectors);
    }

    // Gerar batchId único para todos os anos
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const batchId = `${tipo}_todos_${timestamp}`;

    const allItems: StagingItem[] = [];
    const urlObj = new URL(baseUrl);

    // Fazer scraping de cada ano
    for (const year of years) {
      urlObj.searchParams.set('ano', year);
      const yearUrl = urlObj.toString();

      console.log(`Scraping year ${year}: ${yearUrl}`);

      try {
        const items = await this.scrapePageItems(yearUrl, batchId, year, selectors);
        allItems.push(...items);
        console.log(`  Found ${items.length} items for year ${year}`);
      } catch (error) {
        console.error(`  Error scraping year ${year}:`, error.message);
      }
    }

    console.log(`Total items scraped across all years: ${allItems.length}`);

    if (allItems.length > 0) {
      return this.stagingRepo.save(allItems);
    }

    return [];
  }

  private async scrapeSinglePage(url: string, tipo: string, ano: string | null, selectors?: { container?: string; edital?: string; descricao?: string; titulo?: string }) {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const batchId = `${tipo}_${ano || 'sem_ano'}_${timestamp}`;

    const items = await this.scrapePageItems(url, batchId, ano, selectors);

    console.log(`Total items scraped: ${items.length}`);

    if (items.length > 0) {
      return this.stagingRepo.save(items);
    }

    return [];
  }

  private async scrapePageItems(url: string, batchId: string, ano: string | null, selectors?: { container?: string; edital?: string; descricao?: string; titulo?: string }): Promise<StagingItem[]> {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

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
        item.ano = ano || null;
        item.sourceUrl = url;
        items.push(item);
        console.log('  ✓ Item added to batch');
      } else {
        console.log('  ✗ Item skipped - missing titulo');
      }
    });

    return items;
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
