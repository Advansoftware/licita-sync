import { Controller, Post, Body } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) { }

  @Post('run')
  async run(
    @Body('url') url: string,
    @Body('selectors') selectors?: { container?: string; edital?: string; descricao?: string; titulo?: string }
  ) {
    return this.scraperService.run(url, selectors);
  }

  @Post('preview')
  async preview(@Body('url') url: string) {
    return this.scraperService.preview(url);
  }
}
