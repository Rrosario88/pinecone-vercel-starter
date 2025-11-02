import { test, expect } from '@playwright/test';

test.describe('Debug AutoGen Toggle Button', () => {
  test('find the correct AutoGen toggle button selector', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Find all buttons that might be AutoGen toggle
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    console.log(`Found ${buttonCount} buttons`);
    
    for (let i = 0; i < buttonCount; i++) {
      const button = allButtons.nth(i);
      const title = await button.getAttribute('title');
      const isVisible = await button.isVisible();
      
      if (isVisible && title) {
        console.log(`Button ${i}: title="${title}"`);
        if (title.includes('Agent') || title.includes('AutoGen') || title.includes('Multi')) {
          console.log(`  -> Found potential AutoGen button!`);
        }
      }
    }
    
    // Try the specific selector that worked before
    const autoGenButton = page.locator('button[title*="Multi-Agent"], button[title*="Single Agent"]').first();
    const isVisible = await autoGenButton.isVisible();
    console.log('AutoGen button visible:', isVisible);
    
    if (isVisible) {
      const title = await autoGenButton.getAttribute('title');
      console.log('AutoGen button title:', title);
      
      // Click it
      await autoGenButton.click();
      await page.waitForTimeout(500);
      
      const newTitle = await autoGenButton.getAttribute('title');
      console.log('After click title:', newTitle);
    }
  });
});
