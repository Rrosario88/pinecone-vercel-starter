import { test, expect } from '@playwright/test';

test.describe('AutoGen Toggle Functionality', () => {
  test('can find AutoGen toggle in side menu', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open side menu (settings)
    const menuButton = page.locator('button[title="Settings"]');
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    
    // Wait for side menu to open
    await page.waitForTimeout(500);
    
    // Look for AutoGen section
    const autoGenSection = page.locator('text=AutoGen Settings').first();
    await expect(autoGenSection).toBeVisible();
    
    // Look for the Enable AutoGen toggle
    const autoGenToggle = page.locator('text=Enable AutoGen').first();
    await expect(autoGenToggle).toBeVisible();
    
    // Find the toggle button (it's a div with specific styling)
    const toggleButton = page.locator('div').filter({ hasText: 'Enable AutoGen' }).locator('..').locator('div[role="button"], div.group').first();
    await expect(toggleButton).toBeVisible();
  });

  test('can find AutoGen toggle in chat interface', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Look for the AutoGen toggle button in chat interface
    const autoGenToggleButton = page.locator('button[title*="Multi-Agent"], button[title*="Single Agent"]').first();
    await expect(autoGenToggleButton).toBeVisible();
    
    // Check initial state (should be OFF)
    expect(await autoGenToggleButton.getAttribute('title')).toContain('OFF');
  });

  test('can toggle AutoGen on and off in side menu', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open side menu
    const menuButton = page.locator('button[title="Settings"]');
    await menuButton.click();
    await page.waitForTimeout(500);
    
    // Find the toggle
    const toggleContainer = page.locator('div').filter({ hasText: 'Enable AutoGen' }).locator('..');
    const toggleButton = toggleContainer.locator('div.group, div[role="button"]').first();
    
    // Get initial state
    const initialBgClass = await toggleButton.getAttribute('class');
    console.log('Initial toggle classes:', initialBgClass);
    
    // Click the toggle
    await toggleButton.click();
    await page.waitForTimeout(300);
    
    // Check if state changed
    const newBgClass = await toggleButton.getAttribute('class');
    console.log('After toggle classes:', newBgClass);
    expect(newBgClass).not.toBe(initialBgClass);
  });

  test('can toggle AutoGen on and off in chat interface', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Find the AutoGen toggle button in chat
    const autoGenToggleButton = page.locator('button[title*="Multi-Agent"], button[title*="Single Agent"]').first();
    
    // Get initial state
    const initialTitle = await autoGenToggleButton.getAttribute('title');
    console.log('Initial title:', initialTitle);
    expect(initialTitle).toContain('OFF');
    
    // Click the toggle
    await autoGenToggleButton.click();
    await page.waitForTimeout(300);
    
    // Check if state changed
    const newTitle = await autoGenToggleButton.getAttribute('title');
    console.log('After toggle title:', newTitle);
    expect(newTitle).toContain('ON');
    
    // Click again to turn off
    await autoGenToggleButton.click();
    await page.waitForTimeout(300);
    
    const finalTitle = await autoGenToggleButton.getAttribute('title');
    expect(finalTitle).toContain('OFF');
  });

  test('AutoGen configuration options appear when enabled', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open side menu
    const menuButton = page.locator('button[title="Settings"]');
    await menuButton.click();
    await page.waitForTimeout(500);
    
    // Enable AutoGen
    const toggleContainer = page.locator('div').filter({ hasText: 'Enable AutoGen' }).locator('..');
    const toggleButton = toggleContainer.locator('div.group, div[role="button"]').first();
    await toggleButton.click();
    await page.waitForTimeout(500);
    
    // Check for configuration options
    const researcherOption = page.locator('text=Researcher Agent').first();
    const criticOption = page.locator('text=Critic Agent').first();
    const summarizerOption = page.locator('text=Summarizer Agent').first();
    
    await expect(researcherOption).toBeVisible();
    await expect(criticOption).toBeVisible();
    await expect(summarizerOption).toBeVisible();
  });

  test('chat placeholder changes when AutoGen is enabled', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Get initial placeholder
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    const initialPlaceholder = await chatInput.getAttribute('placeholder');
    console.log('Initial placeholder:', initialPlaceholder);
    
    // Enable AutoGen using chat toggle
    const autoGenToggleButton = page.locator('button[title*="Multi-Agent"], button[title*="Single Agent"]').first();
    await autoGenToggleButton.click();
    await page.waitForTimeout(500);
    
    // Check if placeholder changed
    const newPlaceholder = await chatInput.getAttribute('placeholder');
    console.log('New placeholder:', newPlaceholder);
    expect(newPlaceholder).toContain('AI agent team');
  });

  test('check for JavaScript errors when using AutoGen', async ({ page }) => {
    const errors: string[] = [];
    
    // Listen for JavaScript errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto('http://localhost:3000');
    
    // Try to toggle AutoGen multiple times
    const autoGenToggleButton = page.locator('button[title*="Multi-Agent"], button[title*="Single Agent"]').first();
    
    for (let i = 0; i < 5; i++) {
      await autoGenToggleButton.click();
      await page.waitForTimeout(200);
    }
    
    // Check for any JavaScript errors
    expect(errors.length).toBe(0);
    if (errors.length > 0) {
      console.log('JavaScript errors found:', errors);
    }
  });
});
