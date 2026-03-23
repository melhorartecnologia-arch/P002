import type { BaseSpider } from "../base-spider.js";
import { DOUSpider } from "./dou-spider.js";
import { SPSpider } from "./sp-spider.js";

export { DOUSpider } from "./dou-spider.js";
export { SPSpider } from "./sp-spider.js";

/**
 * Registry mapping fonte IDs to spider factory functions.
 */
export const SpiderRegistry = new Map<string, () => BaseSpider>([
  ["DOU", () => new DOUSpider()],
  ["DOE-SP", () => new SPSpider()],
]);

/**
 * Factory function to get a spider instance by fonte ID.
 * Throws if the fonte ID is not registered.
 */
export function getSpider(fonteId: string): BaseSpider {
  const factory = SpiderRegistry.get(fonteId);
  if (!factory) {
    throw new Error(
      `Unknown fonte ID: "${fonteId}". Available: ${Array.from(SpiderRegistry.keys()).join(", ")}`,
    );
  }
  return factory();
}
