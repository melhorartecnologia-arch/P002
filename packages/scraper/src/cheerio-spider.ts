import axios, { type AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import pRetry from "p-retry";
import { BaseSpider, type SpiderConfig } from "./base-spider.js";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
};

const RETRY_OPTIONS = {
  retries: 5,
  minTimeout: 1000,
  factor: 2,
} as const;

export abstract class CheerioSpider extends BaseSpider {
  protected readonly httpClient: AxiosInstance;

  constructor(config: SpiderConfig) {
    super(config);
    this.httpClient = axios.create({
      headers: DEFAULT_HEADERS,
      timeout: 30_000,
    });
  }

  /**
   * Fetches an HTML page and returns a Cheerio instance for parsing.
   */
  protected async fetchHtml(url: string): Promise<CheerioAPI> {
    const response = await pRetry(
      async () => {
        await this.sleep(this.requestDelay);
        const res = await this.httpClient.get<string>(url, {
          responseType: "text",
        });
        return res;
      },
      RETRY_OPTIONS,
    );
    return cheerio.load(response.data);
  }

  /**
   * Downloads a PDF from the given URL and returns its contents as a Buffer.
   */
  protected async fetchPdf(url: string): Promise<Buffer> {
    const response = await pRetry(
      async () => {
        await this.sleep(this.requestDelay);
        const res = await this.httpClient.get<ArrayBuffer>(url, {
          responseType: "arraybuffer",
          headers: {
            ...DEFAULT_HEADERS,
            Accept: "application/pdf,*/*",
          },
        });
        return res;
      },
      RETRY_OPTIONS,
    );
    return Buffer.from(response.data);
  }
}
