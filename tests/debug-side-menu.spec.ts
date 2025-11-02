import { test, expect } from '@playwright/test';

test.describe('Debug Side Menu Content', () => {
  test('check what is actually visible in side menu', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open side menu
    const menuButton = page.locator('button[title="Settings"]');
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await page.waitForTimeout(1000);
    
    // Get all text content in the side menu
    const sideMenu = page.locator('.fixed.inset-y-0.right-0, .side-menu, [role="dialog"], .fixed.top-0.right-0').first();
    if (await sideMenu.isVisible()) {
      const menuContent = await sideMenu.textContent();
      console.log('Side menu content:', menuContent);
      
      // Check for specific text patterns
      const hasMultiAgent = menuContent?.includes('Multi-Agent') || menuContent?.includes('AutoGen');
      const hasEnableAutoGen = menuContent?.includes('Enable AutoGen');
      const hasContextExplorer = menuContent?.includes('Context Explorer');
      
      console.log('Has Multi-Agent text:', hasMultiAgent);
      console.log('Has Enable AutoGen text:', hasEnableAutoGen);
      console.log('Has Context Explorer text:', hasContextExplorer);
    } else {
      console.log('Side menu not visible with expected selectors');
      
      // Try alternative selectors
      const allFixedElements = page.locator('.fixed');
      const count = await allFixedElements.count();
      console.log(`Found ${count} fixed elements`);
      
      for (let i = 0; i < count; i++) {
        const element = allFixedElements.nth(i);
        if (await element.isVisible()) {
          const text = await element.textContent();
          console.log(`Fixed element ${i} content:`, text);
        }
      }
    }
  });

  test('check page HTML for AutoGen content', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open side menu
    const menuButton = page.locator('button[title="Settings"]');
    await menuButton.click();
    await page.waitForTimeout(1000);
    
    // Get page HTML and search for AutoGen content
    const html = await page.content();
    const hasAutoGenInHTML = html.includes('Enable AutoGen');
    const hasMultiAgentInHTML = html.includes('Multi-Agent Intelligence');
    
    console.log('HTML contains Enable AutoGen:', hasAutoGenInHTML);
    console.log('HTML contains Multi-Agent Intelligence:', hasMultiAgentInHTML);
    
    if (hasAutoGenInHTML) {
      // Find the line with Enable AutoGen
      const lines = html.split('\n');
      const autoGenLines = lines.filter(line => line.includes('Enable AutoGen'));
      console.log('Lines with Enable AutoGen:', autoGenLines.slice(0, 3)); // Show first 3 lines
    }
  });
});
