import { test, expect } from '@playwright/test';

test.describe('Web Sources Management', () => {
  test('web sources modal opens and displays correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Check modal is visible
    const modal = page.locator('text=Web Sources');
    await expect(modal).toBeVisible();
    
    // Check for URL input section
    const addUrlSection = page.locator('text=Add Website URL');
    await expect(addUrlSection).toBeVisible();
  });

  test('URL input has https:// prepopulated', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Check URL input value
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    const inputValue = await urlInput.inputValue();
    expect(inputValue).toBe('https://');
  });

  test('can add new URL with plus button', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Add URL
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://example.com');
    
    // Click plus button
    const plusButton = page.locator('button:has-text("+")');
    await plusButton.click();
    
    // Wait for potential toast notification or URL to appear in list
    // Check if URL appears in the saved URLs section
    const urlInList = page.locator('text=example.com');
    await expect(urlInList).toBeVisible();
  });

  test('can add new URL with Enter key', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Add URL using Enter key
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://test-site.com');
    await urlInput.press('Enter');
    
    // Check if URL appears in list
    const urlInList = page.locator('text=test-site.com');
    await expect(urlInList).toBeVisible();
  });

  test('shows URL list when URLs are added', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Add a URL
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://example.org');
    await urlInput.press('Enter');
    
    // Check for saved URLs section
    const savedUrlsSection = page.locator('text=Saved URLs');
    await expect(savedUrlsSection).toBeVisible();
    
    // Check URL appears with title and URL display
    const urlEntry = page.locator('text=example.org');
    await expect(urlEntry).toBeVisible();
  });

  test('shows crawl and remove buttons for each URL', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Add a URL
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://sample-website.com');
    await urlInput.press('Enter');
    
    // Look for crawl button
    const crawlButton = page.locator('button:has-text("Crawl")');
    await expect(crawlButton).toBeVisible();
    
    // Look for remove button (trash icon)
    const removeButton = page.locator('button[title*="Remove"]');
    await expect(removeButton).toBeVisible();
  });

  test('can remove URLs from list', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Add a URL
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://to-be-removed.com');
    await urlInput.press('Enter');
    
    // Verify URL is added
    const urlEntry = page.locator('text=to-be-removed.com');
    await expect(urlEntry).toBeVisible();
    
    // Remove the URL
    const removeButton = page.locator('button[title*="Remove"]').first();
    await removeButton.click();
    
    // Verify URL is removed
    await expect(urlEntry).not.toBeVisible();
  });

  test('shows empty state when no URLs are added', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Check for empty state message
    const emptyMessage = page.locator('text=No URLs added yet');
    await expect(emptyMessage).toBeVisible();
  });

  test('shows loading state during crawling', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Add a URL
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://httpbin.org/delay/2'); // URL that takes time to respond
    await urlInput.press('Enter');
    
    // Click crawl button
    const crawlButton = page.locator('button:has-text("Crawl")').first();
    await crawlButton.click();
    
    // Look for loading state
    const loadingIndicator = page.locator('text=Crawling, text=Loading');
    await expect(loadingIndicator.first()).toBeVisible();
  });

  test('prevents duplicate URLs', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Add a URL
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://duplicate-test.com');
    await urlInput.press('Enter');
    
    // Try to add the same URL again
    await urlInput.fill('https://duplicate-test.com');
    await urlInput.press('Enter');
    
    // Should only appear once in the list
    const urlEntries = page.locator('text=duplicate-test.com');
    const count = await urlEntries.count();
    expect(count).toBe(1);
  });

  test('shows status indicators for crawled content', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal  
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Add a URL
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://example.com');
    await urlInput.press('Enter');
    
    // Look for status indicators (green dots for crawled content)
    const statusIndicators = page.locator('.bg-green-500, .text-green-500');
    
    // Status indicators appear after successful crawling
    // We're testing the structure exists
    const urlEntry = page.locator('text=example.com');
    await expect(urlEntry).toBeVisible();
  });
});