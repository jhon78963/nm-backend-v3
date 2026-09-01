import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import Handlebars from 'handlebars';
import puppeteer, { Browser } from 'puppeteer';

@Injectable()
export class PdfGeneratorService implements OnModuleDestroy {
  private browser: Browser | null = null;

  async generatePdf(templateName: string, data: unknown): Promise<Buffer> {
    const templatePath = join(this.getTemplatesDir(), `${templateName}.hbs`);
    const templateSource = await readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSource);
    const html = template(data);

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  private getTemplatesDir(): string {
    return join(__dirname, '..', 'templates', 'html');
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
    }

    return this.browser;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
