import { CheerioSpider } from "../cheerio-spider.js";
import type { EdicaoDownload } from "../base-spider.js";

interface DOUJsonItem {
  urlTitle: string;
  pubName: string;
  urlPdf?: string;
  numberPage?: string;
}

interface DOUSectionResponse {
  jsonArray: DOUJsonItem[];
}

const DOU_SECTIONS = ["do1", "do2", "do3", "do1e", "do2e", "do3e"] as const;

/**
 * Spider for scraping the Diário Oficial da União (DOU) from the
 * Brazilian federal government gazette portal at https://www.in.gov.br.
 */
export class DOUSpider extends CheerioSpider {
  constructor() {
    super({
      name: "DOU",
      url: "https://www.in.gov.br",
      esfera: "FEDERAL",
    });
  }

  /**
   * Crawls DOU editions for a given date. Fetches sections 1, 2, 3
   * and their extras via the DOU JSON API.
   */
  async crawl(date: Date): Promise<EdicaoDownload[]> {
    const formattedDate = this.formatDate(date);
    const editions: EdicaoDownload[] = [];

    for (const section of DOU_SECTIONS) {
      try {
        const items = await this.fetchSection(section, formattedDate);

        for (const item of items) {
          if (!item.urlPdf) {
            continue;
          }

          const pdfUrl = item.urlPdf.startsWith("http")
            ? item.urlPdf
            : this.buildUrl(item.urlPdf);

          const conteudo = await this.downloadPdf(pdfUrl);
          const hash = await this.computeHash(conteudo);

          editions.push({
            numero: item.urlTitle || section,
            dataPublicacao: date,
            tipo: this.sectionToTipo(section),
            urlOriginal: pdfUrl,
            conteudo,
            hash,
            totalPaginas: item.numberPage
              ? parseInt(item.numberPage, 10)
              : undefined,
          });

          await this.sleep(this.requestDelay);
        }
      } catch (error) {
        console.error(
          `[DOUSpider] Error fetching section ${section} for ${formattedDate}:`,
          error,
        );
      }
    }

    return editions;
  }

  /**
   * Downloads a PDF from the given URL.
   */
  async downloadPdf(url: string): Promise<Buffer> {
    return this.fetchPdf(url);
  }

  /**
   * Fetches the JSON listing for a specific DOU section and date.
   */
  private async fetchSection(
    section: string,
    formattedDate: string,
  ): Promise<DOUJsonItem[]> {
    const apiUrl = this.buildUrl(
      `/web/dou/-/diario-oficial/do/${section}/${formattedDate}`,
    );

    try {
      const response = await this.httpClient.get<DOUSectionResponse>(apiUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      if (response.data && Array.isArray(response.data.jsonArray)) {
        return response.data.jsonArray;
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * Formats a Date as DD-MM-YYYY for the DOU API.
   */
  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * Maps a DOU section identifier to a human-readable edition type.
   */
  private sectionToTipo(section: string): string {
    const mapping: Record<string, string> = {
      do1: "Seção 1",
      do2: "Seção 2",
      do3: "Seção 3",
      do1e: "Seção 1 - Extra",
      do2e: "Seção 2 - Extra",
      do3e: "Seção 3 - Extra",
    };
    return mapping[section] ?? section;
  }
}
