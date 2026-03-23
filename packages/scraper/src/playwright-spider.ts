import { chromium, type Browser, type Page } from "playwright";
import pRetry from "p-retry";
import { BaseSpider, type SpiderConfig } from "./base-spider.js";

const RETRY_OPTIONS = {
  retries: 3,
  minTimeout: 2000,
  factor: 2,
} as const;

export abstract class PlaywrightSpider extends BaseSpider {
  protected browser: Browser | null = null;

  constructor(config: SpiderConfig) {
    super(config);
  }

  /**
   * Launches a headless Chromium browser instance.
   */
  async launchBrowser(): Promise<void> {
    if (this.browser) {
      return;
    }
    this.browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    });
  }

  /**
   * Closes the browser instance if it is open.
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Creates a new browser page with pt-BR locale, a 1920x1080 viewport,
   * and a 30-second default navigation timeout.
   */
  protected async newPage(): Promise<Page> {
    if (!this.browser) {
      await this.launchBrowser();
    }
    const page = await this.browser!.newPage({
      locale: "pt-BR",
      viewport: { width: 1920, height: 1080 },
    });
    page.setDefaultNavigationTimeout(30_000);
    page.setDefaultTimeout(30_000);
    return page;
  }

  /**
   * Navigates to a URL and waits for the network to become idle.
   */
  protected async fetchWithBrowser(url: string): Promise<Page> {
    const page = await this.newPage();
    await pRetry(
      async () => {
        await page.goto(url, { waitUntil: "networkidle" });
      },
      RETRY_OPTIONS,
    );
    return page;
  }
}
