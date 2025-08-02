import { Page } from '@playwright/test';

export class NavigationHelper {
  constructor(private page: Page) {}
  
  async gotoAuthenticated(path: string): Promise<void> {
    // Skip authentication check if we know we're authenticated
    const cookies = await this.page.context().cookies();
    const hasAuthCookie = cookies.some(c => c.name === 'yggdrasil_access_token');
    
    if (!hasAuthCookie) {
      throw new Error('Not authenticated - login first');
    }
    
    // Direct navigation with minimal wait
    await this.page.goto(path, { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    // Quick stability check
    await this.page.waitForLoadState('domcontentloaded');
  }
  
  async clickAndNavigate(selector: string, expectedPath?: string): Promise<void> {
    // Click and wait for navigation in one operation
    await Promise.all([
      this.page.waitForNavigation({ 
        url: expectedPath ? `**${expectedPath}**` : undefined,
        waitUntil: 'domcontentloaded',
        timeout: 5000
      }),
      this.page.click(selector)
    ]);
  }
}