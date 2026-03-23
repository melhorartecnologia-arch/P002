import { createHash } from "crypto";

export interface SpiderConfig {
  name: string;
  url: string;
  esfera: string;
  uf?: string;
  requestDelay?: number;
}

export interface EdicaoDownload {
  numero: string;
  dataPublicacao: Date;
  tipo: string;
  urlOriginal: string;
  conteudo: Buffer;
  hash: string;
  totalPaginas?: number;
}

export abstract class BaseSpider {
  public readonly name: string;
  public readonly url: string;
  public readonly esfera: string;
  public readonly uf: string | null;
  protected readonly requestDelay: number;

  constructor(config: SpiderConfig) {
    this.name = config.name;
    this.url = config.url;
    this.esfera = config.esfera;
    this.uf = config.uf ?? null;
    this.requestDelay = config.requestDelay ?? 2000;
  }

  /**
   * Main method to crawl for editions published on a specific date.
   */
  abstract crawl(date: Date): Promise<EdicaoDownload[]>;

  /**
   * Downloads a PDF from the given URL and returns its contents as a Buffer.
   */
  abstract downloadPdf(url: string): Promise<Buffer>;

  /**
   * Computes the SHA-256 hash of the given data.
   */
  protected async computeHash(data: Buffer): Promise<string> {
    const hash = createHash("sha256");
    hash.update(data);
    return hash.digest("hex");
  }

  /**
   * Sleeps for the specified number of milliseconds.
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Joins the base URL with the given path.
   */
  protected buildUrl(path: string): string {
    const base = this.url.endsWith("/") ? this.url.slice(0, -1) : this.url;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }
}
