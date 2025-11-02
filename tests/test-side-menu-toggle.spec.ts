import { test, expect } from '@playwright/test';

test.describe('Test Side Menu AutoGen Toggle Click', () => {
  test('click the AutoGen toggle in side menu and check if it works', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open side menu
    const menuButton = page.locator('button[title="Settings"]');
    await menuButton.click();
    await page.waitForTimeout(1000);
    
    // Find the AutoGen toggle specifically
    const autoGenToggle = page.locator('div').filter({ hasText: 'Enable AutoGen' }).locator('..').locator('div.group').first();
    
    // Check if it's visible
    await expect(autoGenToggle).toBeVisible();
    
    // Get initial state
    const initialClass = await autoGenToggle.getAttribute('class');
    console.log('Initial toggle class:', initialClass);
    
    // Click the toggle
    await autoGenToggle.click();
    await page.waitForTimeout(500);
    
    // Get new state
    const newClass = await autoGenToggle.getAttribute('class');
    console.log('After click toggle class:', newClass);
    
    // Check if state changed
    const stateChanged = initialClass !== newClass;
    console.log('Toggle state changed:', stateChanged);
    
    if (stateChanged) {
      // Now check if configuration options appear
      await page.waitForTimeout(1000);
      
      // Check for configuration options
      const configOptions = [
        'Context Explorer',
        'Quality Reviewer', 
        'Content Summarizer'
      ];
      
      for (const option of configOptions) {
        const optionElement = page.locator(`text=${option}`).first();
        const isVisible = await optionElement.isVisible();
        console.log(`${option} visible:`, isVisible);
      }
    }
  });
});
