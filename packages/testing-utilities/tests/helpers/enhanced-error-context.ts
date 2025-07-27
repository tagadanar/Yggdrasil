// Enhanced error context for better debugging experience
// Provides detailed error information when tests fail

import { Page, TestInfo } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export interface ErrorContext {
  testName: string;
  timestamp: string;
  error: Error;
  page?: Page;
  testInfo?: TestInfo;
  customData?: Record<string, any>;
}

export class EnhancedErrorContext {
  private static instance: EnhancedErrorContext;
  private errorHistory: ErrorContext[] = [];
  
  static getInstance(): EnhancedErrorContext {
    if (!this.instance) {
      this.instance = new EnhancedErrorContext();
    }
    return this.instance;
  }
  
  /**
   * Capture enhanced error context with detailed information
   */
  async captureError(
    error: Error, 
    page?: Page, 
    testInfo?: TestInfo,
    customData?: Record<string, any>
  ): Promise<string> {
    const context: ErrorContext = {
      testName: testInfo?.title || 'Unknown Test',
      timestamp: new Date().toISOString(),
      error,
      page,
      testInfo,
      customData
    };
    
    this.errorHistory.push(context);
    
    // Generate detailed error report
    const errorReport = await this.generateErrorReport(context);
    
    // Save error context to file if test info available
    if (testInfo) {
      await this.saveErrorContext(errorReport, testInfo);
    }
    
    return errorReport;
  }
  
  /**
   * Generate comprehensive error report
   */
  private async generateErrorReport(context: ErrorContext): Promise<string> {
    const sections: string[] = [];
    
    // Header
    sections.push(`# Error Context Report
    
Test: ${context.testName}
Time: ${context.timestamp}

## Error Details
\`\`\`
${context.error.message}
\`\`\`

### Stack Trace
\`\`\`
${context.error.stack}
\`\`\`
`);
    
    // Page State
    if (context.page && !context.page.isClosed()) {
      try {
        const url = context.page.url();
        const title = await context.page.title();
        
        sections.push(`## Page State
- URL: ${url}
- Title: ${title}
`);
        
        // Console logs
        const consoleLogs = await this.getConsoleLogs(context.page);
        if (consoleLogs.length > 0) {
          sections.push(`### Console Logs
\`\`\`
${consoleLogs.join('\\n')}
\`\`\`
`);
        }
        
        // Network failures
        const networkErrors = await this.getNetworkErrors(context.page);
        if (networkErrors.length > 0) {
          sections.push(`### Network Errors
${networkErrors.map(err => `- ${err}`).join('\\n')}
`);
        }
        
        // DOM snapshot
        const domSnapshot = await this.getDOMSnapshot(context.page);
        if (domSnapshot) {
          sections.push(`### DOM Snapshot
<details>
<summary>Click to expand</summary>

\`\`\`html
${domSnapshot}
\`\`\`
</details>
`);
        }
        
        // Local Storage
        const localStorage = await this.getLocalStorage(context.page);
        if (Object.keys(localStorage).length > 0) {
          sections.push(`### Local Storage
\`\`\`json
${JSON.stringify(localStorage, null, 2)}
\`\`\`
`);
        }
      } catch (e) {
        sections.push(`## Page State
Error capturing page state: ${e}
`);
      }
    }
    
    // Custom data
    if (context.customData && Object.keys(context.customData).length > 0) {
      sections.push(`## Custom Context Data
\`\`\`json
${JSON.stringify(context.customData, null, 2)}
\`\`\`
`);
    }
    
    // Test environment
    sections.push(`## Environment
- Node Version: ${process.version}
- Platform: ${process.platform}
- Worker ID: ${process.env['WORKER_ID'] || 'N/A'}
- Test Timeout: ${context.testInfo?.timeout || 'N/A'}ms
`);
    
    // Recommendations
    const recommendations = this.generateRecommendations(context);
    if (recommendations.length > 0) {
      sections.push(`## Debugging Recommendations
${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\\n')}
`);
    }
    
    return sections.join('\\n');
  }
  
  /**
   * Get console logs from page
   */
  private async getConsoleLogs(page: Page): Promise<string[]> {
    try {
      // This would need to be set up with page.on('console') in the test
      // For now, return empty array
      return [];
    } catch {
      return [];
    }
  }
  
  /**
   * Get network errors from page
   */
  private async getNetworkErrors(page: Page): Promise<string[]> {
    try {
      // This would need to be set up with page.on('requestfailed') in the test
      // For now, return empty array
      return [];
    } catch {
      return [];
    }
  }
  
  /**
   * Get DOM snapshot for debugging
   */
  private async getDOMSnapshot(page: Page): Promise<string | null> {
    try {
      const bodyContent = await page.evaluate(() => {
        const body = document.body;
        if (!body) return null;
        
        // Get simplified DOM structure
        const simplifyElement = (el: Element, depth = 0): string => {
          if (depth > 3) return '...'; // Limit depth
          
          const tag = el.tagName.toLowerCase();
          const classes = el.className ? ` class="${el.className}"` : '';
          const id = el.id ? ` id="${el.id}"` : '';
          const testId = el.getAttribute('data-testid') ? ` data-testid="${el.getAttribute('data-testid')}"` : '';
          
          const attrs = `${id}${classes}${testId}`;
          
          if (el.children.length === 0) {
            const text = el.textContent?.trim().substring(0, 50) || '';
            return `<${tag}${attrs}>${text}</${tag}>`;
          }
          
          const children = Array.from(el.children)
            .slice(0, 5) // Limit children
            .map(child => simplifyElement(child, depth + 1))
            .join('\\n' + '  '.repeat(depth + 1));
            
          return `<${tag}${attrs}>\\n${' '.repeat(depth + 1)}${children}\\n${' '.repeat(depth)}</${tag}>`;
        };
        
        return simplifyElement(body);
      });
      
      return bodyContent;
    } catch {
      return null;
    }
  }
  
  /**
   * Get local storage data
   */
  private async getLocalStorage(page: Page): Promise<Record<string, any>> {
    try {
      return await page.evaluate(() => {
        const storage: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            try {
              storage[key] = JSON.parse(localStorage.getItem(key) || '');
            } catch {
              storage[key] = localStorage.getItem(key);
            }
          }
        }
        return storage;
      });
    } catch {
      return {};
    }
  }
  
  /**
   * Generate debugging recommendations based on error
   */
  private generateRecommendations(context: ErrorContext): string[] {
    const recommendations: string[] = [];
    const errorMsg = context.error.message.toLowerCase();
    
    // Timeout errors
    if (errorMsg.includes('timeout')) {
      recommendations.push('Increase timeout using test.setTimeout() or { timeout: 30000 } option');
      recommendations.push('Check if the element selector is correct');
      recommendations.push('Verify the page has finished loading with page.waitForLoadState()');
      recommendations.push('Add debug screenshots before the failing action');
    }
    
    // Element not found
    if (errorMsg.includes('no element matches selector')) {
      recommendations.push('Verify the selector is correct using browser DevTools');
      recommendations.push('Check if the element is within an iframe');
      recommendations.push('Ensure the page has navigated to the correct URL');
      recommendations.push('Add page.waitForSelector() before interacting with the element');
    }
    
    // Network errors
    if (errorMsg.includes('net::') || errorMsg.includes('failed to fetch')) {
      recommendations.push('Check if backend services are running');
      recommendations.push('Verify API endpoints are correct');
      recommendations.push('Check for CORS issues');
      recommendations.push('Review network logs in the trace file');
    }
    
    // Authentication errors
    if (errorMsg.includes('auth') || errorMsg.includes('unauthorized')) {
      recommendations.push('Verify authentication flow is working correctly');
      recommendations.push('Check if tokens are being stored/retrieved properly');
      recommendations.push('Ensure test user credentials are valid');
      recommendations.push('Review auth state in local storage');
    }
    
    return recommendations;
  }
  
  /**
   * Save error context to file
   */
  private async saveErrorContext(report: string, testInfo: TestInfo): Promise<void> {
    try {
      const outputPath = testInfo.outputPath('error-context.md');
      await fs.promises.writeFile(outputPath, report, 'utf8');
      
      // Attach to test report
      await testInfo.attach('Error Context', {
        path: outputPath,
        contentType: 'text/markdown'
      });
    } catch (e) {
      console.error('Failed to save error context:', e);
    }
  }
  
  /**
   * Get error history for analysis
   */
  getErrorHistory(): ErrorContext[] {
    return this.errorHistory;
  }
  
  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }
  
  /**
   * Generate error summary for multiple failures
   */
  generateErrorSummary(): string {
    if (this.errorHistory.length === 0) {
      return 'No errors recorded';
    }
    
    const errorGroups = new Map<string, number>();
    this.errorHistory.forEach(ctx => {
      const key = ctx.error.message;
      errorGroups.set(key, (errorGroups.get(key) || 0) + 1);
    });
    
    const summary = ['# Error Summary\\n'];
    summary.push(`Total Errors: ${this.errorHistory.length}\\n`);
    summary.push('## Error Frequency');
    
    Array.from(errorGroups.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([error, count]) => {
        summary.push(`- ${count}x: ${error}`);
      });
    
    return summary.join('\\n');
  }
}

// Helper function for use in tests
export async function captureEnhancedError(
  error: Error,
  page?: Page,
  testInfo?: TestInfo,
  customData?: Record<string, any>
): Promise<string> {
  const context = EnhancedErrorContext.getInstance();
  return context.captureError(error, page, testInfo, customData);
}