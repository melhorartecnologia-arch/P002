import type { Page } from "playwright";
import { PlaywrightSpider } from "../playwright-spider.js";
import type { EdicaoDownload } from "../base-spider.js";

/**
 * Spider for scraping the Diário Oficial do Estado de São Paulo (DOE-SP)
 * from the Imprensa Oficial portal.
 */
export class SPSpider extends PlaywrightSpider {
  constructor() {
    super({
      name: "DOE-SP",
      url: "https://www.imprensaoficial.com.br",
      esfera: "ESTADUAL",
      uf: "SP",
    });
  }

  /**
   * Crawls DOE-SP editions for a given date using browser automation.
   */
  async crawl(date: Date): Promise<EdicaoDownload[]> {
    const editions: EdicaoDownload[] = [];

    try {
      await this.launchBrowser();
      const page = await this.navigateToDate(date);

      const pdfLinks = await this.extractPdfLinks(page);

      for (const link of pdfLinks) {
        try {
          const pdfUrl = link.url.startsWith("http")
            ? link.url
            : this.buildUrl(link.url);

          const conteudo = await this.downloadPdf(pdfUrl);
          const hash = await this.computeHash(conteudo);

          editions.push({
            numero: link.numero,
            dataPublicacao: date,
            tipo: link.tipo,
            urlOriginal: pdfUrl,
            conteudo,
            hash,
          });

          await this.sleep(this.requestDelay);
        } catch (error) {
          console.error(
            `[SPSpider] Error downloading PDF ${link.url}:`,
            error,
          );
        }
      }

      await page.close();
    } catch (error) {
      console.error(`[SPSpider] Error crawling for date ${date}:`, error);
    } finally {
      await this.closeBrowser();
    }

    return editions;
  }

  /**
   * Downloads a PDF from the given URL using the browser context.
   */
  async downloadPdf(url: string): Promise<Buffer> {
    if (!this.browser) {
      await this.launchBrowser();
    }

    const page = await this.newPage();

    try {
      const response = await page.goto(url, { waitUntil: "load" });

      if (!response) {
        throw new Error(`No response received for ${url}`);
      }

      const body = await response.body();
      return Buffer.from(body);
    } finally {
      await page.close();
    }
  }

  /**
   * Navigates to the Imprensa Oficial portal and searches for the
   * editions published on the given date.
   */
  private async navigateToDate(date: Date): Promise<Page> {
    const formattedDate = this.formatDate(date);
    const searchUrl = this.buildUrl(
      `/DO/BuscaDO#!/702702702702702702702702702702702702702702702702702702702702702702702702702?data=${formattedDate}`,
    );

    const page = await this.fetchWithBrowser(searchUrl);

    // Wait for the results to load
    await page.waitForSelector(".resultados-busca, .resultado-item, .card", {
      timeout: 15_000,
    }).catch(() => {
      // Results container may have different selectors; continue gracefully
    });

    return page;
  }

  /**
   * Extracts PDF download links from the search results page.
   */
  private async extractPdfLinks(
    page: Page,
  ): Promise<Array<{ url: string; numero: string; tipo: string }>> {
    return page.evaluate(() => {
      const links: Array<{ url: string; numero: string; tipo: string }> = [];
      const anchors = document.querySelectorAll('a[href*=".pdf"], a[href*="download"]');

      anchors.forEach((anchor) => {
        const href = anchor.getAttribute("href");
        if (!href) return;

        const text = anchor.textContent?.trim() ?? "";
        const parentText =
          anchor.closest("tr, .card, .resultado-item")?.textContent?.trim() ??
          "";

        links.push({
          url: href,
          numero: text || "DOE-SP",
          tipo: parentText.includes("Executivo")
            ? "Poder Executivo"
            : parentText.includes("Legislativo")
              ? "Poder Legislativo"
              : parentText.includes("Judiciário")
                ? "Poder Judiciário"
                : "Caderno Geral",
        });
      });

      return links;
    });
  }

  /**
   * Formats a Date as DD/MM/YYYY for the Imprensa Oficial search.
   */
  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
