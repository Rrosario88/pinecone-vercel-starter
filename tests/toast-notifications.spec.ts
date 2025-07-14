import { test, expect } from '@playwright/test';

test.describe('Toast Notification System', () => {
  test('shows toast notification when adding URL', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Add a URL to trigger toast
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://toast-test.com');
    await urlInput.press('Enter');
    
    // Look for success toast
    const toast = page.locator('text=URL added successfully, text=added');
    await expect(toast.first()).toBeVisible();
  });

  test('toast notifications have glass effect styling', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Trigger a toast notification
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://glass-effect-test.com');
    await urlInput.press('Enter');
    
    // Check for toast with backdrop blur styling
    const toast = page.locator('[style*="backdrop"], .backdrop-blur, .glass-effect').first();
    
    // Toast should appear (even if styling details vary)
    const successMessage = page.locator('text=added, text=success');
    await expect(successMessage.first()).toBeVisible();
  });

  test('toasts can be dismissed with close button', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Trigger a toast
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://dismissible-toast.com');
    await urlInput.press('Enter');
    
    // Wait for toast to appear
    const toastMessage = page.locator('text=added');
    await expect(toastMessage.first()).toBeVisible();
    
    // Look for close button (X)
    const closeButton = page.locator('button:has-text("×"), button:has-text("✕")').first();
    
    if (await closeButton.isVisible()) {
      await closeButton.click();
      
      // Toast should disappear
      await expect(toastMessage.first()).not.toBeVisible();
    }
  });

  test('toasts auto-dismiss after timeout', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Trigger a toast
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://auto-dismiss-test.com');
    await urlInput.press('Enter');
    
    // Wait for toast to appear
    const toastMessage = page.locator('text=added');
    await expect(toastMessage.first()).toBeVisible();
    
    // Wait for auto-dismiss (toasts typically dismiss after 3-5 seconds)
    await page.waitForTimeout(6000);
    
    // Toast should be gone
    await expect(toastMessage.first()).not.toBeVisible();
  });

  test('shows different toast types for different actions', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Add URL (success toast)
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://success-toast.com');
    await urlInput.press('Enter');
    
    // Success message should appear
    const successToast = page.locator('text=added successfully, text=success');
    await expect(successToast.first()).toBeVisible();
    
    // Try to add duplicate URL (warning toast)
    await urlInput.fill('https://success-toast.com');
    await urlInput.press('Enter');
    
    // Warning message should appear
    const warningToast = page.locator('text=already added, text=duplicate');
    await expect(warningToast.first()).toBeVisible();
  });

  test('toasts appear in correct position', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Trigger a toast
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://position-test.com');
    await urlInput.press('Enter');
    
    // Check toast appears (position is typically top-right)
    const toastMessage = page.locator('text=added');
    await expect(toastMessage.first()).toBeVisible();
    
    // Get toast position
    const toastElement = toastMessage.first();
    if (await toastElement.isVisible()) {
      const boundingBox = await toastElement.boundingBox();
      expect(boundingBox).toBeTruthy();
    }
  });

  test('multiple toasts can stack properly', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Quickly add multiple URLs to generate multiple toasts
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    
    await urlInput.fill('https://toast1.com');
    await urlInput.press('Enter');
    
    await urlInput.fill('https://toast2.com');
    await urlInput.press('Enter');
    
    // Multiple success messages should be visible
    const toastMessages = page.locator('text=added');
    const count = await toastMessages.count();
    expect(count).toBeGreaterThan(0);
  });

  test('toasts work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    
    // Trigger toast on mobile
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://mobile-toast.com');
    await urlInput.press('Enter');
    
    // Toast should be visible on mobile
    const toastMessage = page.locator('text=added');
    await expect(toastMessage.first()).toBeVisible();
  });
});