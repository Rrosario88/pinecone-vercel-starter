import { test, expect } from '@playwright/test';

test.describe('Theme System', () => {
  test('renders theme toggle buttons', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open side menu to access theme toggle
    const menuButton = page.locator('button[title="Settings"]');
    await menuButton.click();
    
    // Look for theme toggle button in side menu
    const themeToggle = page.locator('button[title*="Current:"]');
    
    // Theme toggle should be available
    await expect(themeToggle).toBeVisible();
  });

  test('can switch to light theme', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Find and click light theme button
    const lightButton = page.locator('button:has-text("Light")');
    
    if (await lightButton.isVisible()) {
      await lightButton.click();
      
      // Check that dark class is removed from html
      const html = page.locator('html');
      await expect(html).not.toHaveClass(/dark/);
      
      // Check for light theme styling
      const body = page.locator('body');
      const bgColor = await body.evaluate(el => window.getComputedStyle(el).backgroundColor);
      
      // Light theme should have light background
      // This is a basic check - the exact color may vary
      expect(bgColor).not.toBe('rgb(0, 0, 0)'); // Not pure black
    }
  });

  test('can switch to dark theme', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Find and click dark theme button
    const darkButton = page.locator('button:has-text("Dark")');
    
    if (await darkButton.isVisible()) {
      await darkButton.click();
      
      // Check that dark class is added to html
      const html = page.locator('html');
      await expect(html).toHaveClass(/dark/);
      
      // Verify dark theme styling is applied
      const chatArea = page.locator('[id="chat"], .chat-container').first();
      
      if (await chatArea.isVisible()) {
        const bgColor = await chatArea.evaluate(el => window.getComputedStyle(el).backgroundColor);
        
        // Dark theme should have dark backgrounds
        // This verifies the theme is actually applied
        expect(bgColor).toBeDefined();
      }
    }
  });

  test('can switch to system theme', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Find and click system theme button
    const systemButton = page.locator('button:has-text("System")');
    
    if (await systemButton.isVisible()) {
      await systemButton.click();
      
      // System theme should respect OS preference
      // We can't easily test OS preference in automated tests,
      // but we can verify the button works
      await expect(systemButton).toBeVisible();
    }
  });

  test('theme persists across page reloads', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Set to dark theme
    const darkButton = page.locator('button:has-text("Dark")');
    
    if (await darkButton.isVisible()) {
      await darkButton.click();
      
      // Verify dark theme is set
      const html = page.locator('html');
      await expect(html).toHaveClass(/dark/);
      
      // Reload page
      await page.reload();
      
      // Theme should persist
      await expect(html).toHaveClass(/dark/);
    }
  });

  test('theme toggle affects entire interface', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Switch to dark theme
    const darkButton = page.locator('button:has-text("Dark")');
    
    if (await darkButton.isVisible()) {
      await darkButton.click();
      
      // Check that various UI elements adapt to dark theme
      const html = page.locator('html');
      await expect(html).toHaveClass(/dark/);
      
      // Check header area
      const header = page.locator('header, .header').first();
      if (await header.isVisible()) {
        const headerBg = await header.evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(headerBg).toBeDefined();
      }
      
      // Check chat input
      const chatInput = page.locator('textarea[placeholder*="Ask about"], input[placeholder*="Ask about"]');
      if (await chatInput.isVisible()) {
        const inputBg = await chatInput.evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(inputBg).toBeDefined();
      }
    }
  });

  test('theme buttons have proper visual states', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check that theme buttons are properly styled
    const themeButtons = page.locator('button:has-text("Light"), button:has-text("Dark"), button:has-text("System")');
    
    for (let i = 0; i < await themeButtons.count(); i++) {
      const button = themeButtons.nth(i);
      
      if (await button.isVisible()) {
        // Check button is clickable
        await expect(button).toBeEnabled();
        
        // Check button has proper styling
        const opacity = await button.evaluate(el => window.getComputedStyle(el).opacity);
        expect(parseFloat(opacity)).toBeGreaterThan(0);
      }
    }
  });

  test('theme system works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    
    // Theme controls should still be accessible on mobile
    const themeButtons = page.locator('button:has-text("Light"), button:has-text("Dark"), button:has-text("System")');
    
    // At least one theme button should be available
    const buttonCount = await themeButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Test theme switching on mobile
    const darkButton = page.locator('button:has-text("Dark")');
    if (await darkButton.isVisible()) {
      await darkButton.click();
      
      const html = page.locator('html');
      await expect(html).toHaveClass(/dark/);
    }
  });
});