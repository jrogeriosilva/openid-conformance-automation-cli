import { chromium, Browser, BrowserContext, Page } from "playwright";
import { BrowserNavigationError } from "./errors";

export class BrowserSession {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private readonly headless: boolean;

  constructor(headless: boolean) {
    this.headless = headless;
  }

  async initialize(): Promise<void> {
    if (this.browser) return; // Already initialized

    this.browser = await chromium.launch({ headless: this.headless });
    this.context = await this.browser.newContext({ ignoreHTTPSErrors: true });
    this.page = await this.context.newPage();
  }

  async navigate(
    url: string,
    waitFor: "networkidle" | "domcontentloaded" | "load" = "networkidle"
  ): Promise<string> {
    try {
      await this.initialize();
      if (!this.page) throw new Error("Browser page not initialized");

      await this.page.goto(url, { waitUntil: waitFor });
      return this.page.url();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new BrowserNavigationError(url, errorMessage, err instanceof Error ? err : undefined);
    }
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  isInitialized(): boolean {
    return this.browser !== null;
  }
}
