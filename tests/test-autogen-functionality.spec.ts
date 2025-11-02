import { test, expect } from '@playwright/test';

test.describe('Test AutoGen Functionality End-to-End', () => {
  test('send a chat message with AutoGen enabled', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Enable AutoGen using chat toggle (easier to access)
    const autoGenToggleButton = page.locator('button[title*="Single Agent"]').first();
    await autoGenToggleButton.click();
    await page.waitForTimeout(500);
    
    // Verify AutoGen is enabled
    const title = await autoGenToggleButton.getAttribute('title');
    expect(title).toContain('ON');
    
    // Type a test message
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    await chatInput.fill('What is AutoGen and how does it work?');
    
    // Submit the message
    await chatInput.press('Enter');
    await page.waitForTimeout(2000);
    
    // Check for any response
    const messagesArea = page.locator('#chat, .messages, [class*="message"]').first();
    const hasMessages = await messagesArea.isVisible();
    console.log('Messages area visible:', hasMessages);
    
    if (hasMessages) {
      const messageContent = await messagesArea.textContent();
      console.log('Message content preview:', messageContent?.substring(0, 200));
    }
    
    // Check for any error indicators
    const errorElements = page.locator('.error, [class*="error"], [role="alert"]').first();
    const hasError = await errorElements.isVisible();
    console.log('Error visible:', hasError);
    
    if (hasError) {
      const errorText = await errorElements.textContent();
      console.log('Error text:', errorText);
    }
  });
});
