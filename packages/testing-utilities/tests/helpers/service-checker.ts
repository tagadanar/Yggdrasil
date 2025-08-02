import { Page } from '@playwright/test';

export async function checkServiceHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(3000) 
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function checkAllServicesHealth(): Promise<{
  available: boolean;
  services: { [key: string]: boolean };
}> {
  const services = {
    auth: await checkServiceHealth('http://localhost:3001/health'),
    user: await checkServiceHealth('http://localhost:3002/health'),
    news: await checkServiceHealth('http://localhost:3003/health'),
    course: await checkServiceHealth('http://localhost:3004/health'),
    planning: await checkServiceHealth('http://localhost:3005/health'),
    statistics: await checkServiceHealth('http://localhost:3006/health')
  };
  
  const available = Object.values(services).some(Boolean); // At least one service working
  
  return { available, services };
}

export function createServiceAgnosticTest(
  testName: string,
  realTest: (page: Page) => Promise<void>,
  mockTest: (page: Page) => Promise<void>
) {
  return async (page: Page): Promise<void> => {
    const healthCheck = await checkAllServicesHealth();
    
    if (healthCheck.available) {
      console.log(`✅ ${testName}: Using real services`);
      console.log(`🔧 Available services:`, Object.entries(healthCheck.services)
        .filter(([_, available]) => available)
        .map(([name]) => name)
        .join(', '));
      await realTest(page);
    } else {
      console.log(`⚠️ ${testName}: No services available - using mock responses`);
      await mockTest(page);
    }
  };
}