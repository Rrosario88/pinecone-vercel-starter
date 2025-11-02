import { test, expect } from '@playwright/test';

test.describe('AutoGen Complete Functionality Test', () => {
  test('test complete AutoGen workflow', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // Step 1: Enable AutoGen using chat toggle
    const autoGenButton = page.locator('button[title*="Single Agent"], button[title*="Multi-Agent"]').first();
    await autoGenButton.click();
    await page.waitForTimeout(500);
    
    // Verify AutoGen is enabled
    const title = await autoGenButton.getAttribute('title');
    expect(title).toContain('ON');
    console.log('✅ AutoGen enabled successfully');
    
    // Step 2: Check that placeholder text changed
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    const placeholder = await chatInput.getAttribute('placeholder');
    console.log('Chat placeholder:', placeholder);
    expect(placeholder).toContain('AI agent team');
    console.log('✅ Chat placeholder updated correctly');
    
    // Step 3: Test side menu AutoGen toggle
    const menuButton = page.locator('button[title="Settings"]');
    await menuButton.click();
    await page.waitForTimeout(1000);
    
    // Check if side menu toggle is also enabled
    const sideMenuToggle = page.locator('div').filter({ hasText: 'Enable AutoGen' }).locator('..').locator('div.group').first();
    const toggleClass = await sideMenuToggle.getAttribute('class');
    expect(toggleClass).toContain('bg-orange-500');
    console.log('✅ Side menu toggle is synchronized');
    
    // Step 4: Check configuration options are visible
    const contextExplorer = page.locator('text=Context Explorer').first();
    const qualityReviewer = page.locator('text=Quality Reviewer').first();
    
    expect(await contextExplorer.isVisible()).toBe(true);
    expect(await qualityReviewer.isVisible()).toBe(true);
    console.log('✅ Configuration options are visible');
    
    // Step 5: Close side menu and send a test message
    const closeButton = page.locator('button:has-text("×"), button:has-text("✕")').first();
    await closeButton.click();
    await page.waitForTimeout(500);
    
    // Type and send a message
    await chatInput.fill('Hello, can you explain what AutoGen is?');
    await chatInput.press('Enter');
    await page.waitForTimeout(3000);
    
    // Check for response
    const messagesArea = page.locator('.bg-white.dark\\:bg-gray-800 .space-y-6').first();
    const hasContent = await messagesArea.isVisible();
    console.log('Messages area has content:', hasContent);
    
    if (hasContent) {
      const content = await messagesArea.textContent();
      console.log('Response preview:', content?.substring(0, 100));
    }
    
    console.log('✅ AutoGen functionality test completed');
  });
});
