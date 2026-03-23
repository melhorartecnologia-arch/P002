export {
  BaseSpider,
  type SpiderConfig,
  type EdicaoDownload,
} from "./base-spider.js";
export { CheerioSpider } from "./cheerio-spider.js";
export { PlaywrightSpider } from "./playwright-spider.js";
export {
  DOUSpider,
  SPSpider,
  SpiderRegistry,
  getSpider,
} from "./spiders/index.js";
export { ScrapingScheduler } from "./scheduler.js";
