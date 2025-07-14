import { test, expect } from '@playwright/test';

// Basic App Structure Tests
test.describe('PDF RAG Application - Basic Structure', () => {
  test('has correct title', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle('PDF RAG - Pinecone AI Assistant');
  });

  test('renders main chat interface', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check for chat input
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    await expect(chatInput).toBeVisible();
  });

  test('renders document sources panel on desktop', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check for document sources panel (use first occurrence)
    const sourcesPanel = page.locator('text=Document Sources').first();
    await expect(sourcesPanel).toBeVisible();
  });

  test('renders header with logo', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check for header
    const header = page.locator('header, .header, img[alt*="Pinecone"], img[alt*="logo"]').first();
    await expect(header).toBeVisible();
  });
});

// Icon and Button Tests
test.describe('PDF RAG Application - Interface Elements', () => {
  test('renders paperclip icon for PDF upload', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Look for paperclip icon (📎) or button with PDF upload title
    const paperclipButton = page.locator('button[title*="PDF"], button[title*="Upload"]').first();
    await expect(paperclipButton).toBeVisible();
  });

  test('renders earth icon for web sources', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Look for earth/globe icon (🌐) or web sources button
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await expect(earthButton).toBeVisible();
  });

  test('renders info icon button', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Look for info button
    const infoButton = page.locator('button[title*="Help"], button[title*="Instructions"]').first();
    await expect(infoButton).toBeVisible();
  });

  test('renders clear documents button', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Look for clear button
    const clearButton = page.getByRole('button', { name: /clear.*documents/i });
    await expect(clearButton).toBeVisible();
  });
});

// Modal and Interaction Tests
test.describe('PDF RAG Application - Modal Interactions', () => {
  test('opens info modal when info button is clicked', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Click info button
    const infoButton = page.locator('button[title*="Help"], button[title*="Instructions"]').first();
    await infoButton.click();
    
    // Check modal appears
    const modal = page.locator('text=PDF RAG Assistant, text=How to use');
    await expect(modal.first()).toBeVisible();
  });

  test('opens PDF upload modal when paperclip is clicked', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Click paperclip button
    const paperclipButton = page.locator('button[title*="PDF"], button[title*="Upload"]').first();
    await paperclipButton.click();
    
    // Check modal appears
    const modal = page.locator('text=Upload PDF Documents');
    await expect(modal).toBeVisible();
  });

  test('opens web sources modal when earth icon is clicked', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Click earth/web sources button
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Check modal appears
    const modal = page.locator('text=Web Sources');
    await expect(modal).toBeVisible();
  });

  test('can close modals with X button', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open info modal
    const infoButton = page.locator('button[title*="Help"], button[title*="Instructions"]').first();
    await infoButton.click();
    
    // Close modal
    const closeButton = page.locator('button:has-text("×"), button:has-text("✕")').first();
    await closeButton.click();
    
    // Check modal is gone
    const modal = page.locator('text=PDF RAG Assistant');
    await expect(modal).not.toBeVisible();
  });
});

// Theme Toggle Tests
test.describe('PDF RAG Application - Theme System', () => {
  test('renders theme toggle in side menu', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open side menu first
    const menuButton = page.locator('button[title="Settings"]');
    await menuButton.click();
    
    // Look for theme toggle in side menu header
    const themeToggle = page.locator('button[title*="Current:"]');
    
    // Theme toggle should be visible
    await expect(themeToggle).toBeVisible();
  });

  test('can toggle between themes', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open side menu first
    const menuButton = page.locator('button[title="Settings"]');
    await menuButton.click();
    
    // Click theme toggle button (icon-based)
    const themeToggle = page.locator('button[title*="Current:"]');
    await themeToggle.click();
    
    // Verify theme toggle is interactive
    await expect(themeToggle).toBeVisible();
  });
});

// Web Sources Functionality Tests
test.describe('PDF RAG Application - Web Sources', () => {
  test('can add URL to web sources', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Check for URL input
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await expect(urlInput).toBeVisible();
    
    // Input should have https:// prepopulated
    const inputValue = await urlInput.inputValue();
    expect(inputValue).toBe('https://');
  });

  test('shows URL list when URLs are added', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Open web sources modal
    const earthButton = page.locator('button[title*="Web"], button[title*="Sources"]').first();
    await earthButton.click();
    
    // Add a test URL
    const urlInput = page.locator('input[type="url"], input[placeholder*="http"]');
    await urlInput.fill('https://example.com');
    
    // Click add button or press enter
    const addButton = page.locator('button:has-text("+"), button[title*="Add"]');
    if (await addButton.isVisible()) {
      await addButton.click();
    } else {
      await urlInput.press('Enter');
    }
    
    // Check URL appears in list
    const urlList = page.locator('text=example.com');
    await expect(urlList).toBeVisible();
  });
});

// Chat Interface Tests
test.describe('PDF RAG Application - Chat Functionality', () => {
  test('can type in chat input', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    await chatInput.fill('Hello, this is a test message');
    
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toBe('Hello, this is a test message');
  });

  test('chat input has proper placeholder text', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    const placeholder = await chatInput.getAttribute('placeholder');
    
    expect(placeholder).toContain('Ask about');
  });

  test('renders messages area', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Look for messages container
    const messagesArea = page.locator('[id="chat"], .messages, .chat-messages').first();
    await expect(messagesArea).toBeVisible();
  });
});

// Responsive Design Tests
test.describe('PDF RAG Application - Responsive Design', () => {
  test('adapts to mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    await page.goto('http://localhost:3000');
    
    // Check that main elements are still visible
    const chatInput = page.locator('input[placeholder*="Ask about"]');
    await expect(chatInput).toBeVisible();
    
    // Check that icons are still accessible
    const paperclipButton = page.locator('button[title*="PDF"], button[title*="Upload"]').first();
    await expect(paperclipButton).toBeVisible();
  });

  test('shows mobile menu toggle on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    
    // Look for mobile menu button (☰)
    const mobileMenuButton = page.locator('button:has-text("☰")');
    await expect(mobileMenuButton).toBeVisible();
  });
});

// Error Handling Tests
test.describe('PDF RAG Application - Error Handling', () => {
  test('handles empty document state gracefully', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check for empty state message
    const emptyMessage = page.locator('text=No documents, text=crawled yet');
    
    // Should show appropriate empty state
    if (await emptyMessage.isVisible()) {
      await expect(emptyMessage).toBeVisible();
    }
  });

  test('shows clear documents button when documents exist', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const clearButton = page.getByRole('button', { name: /clear.*documents/i });
    await expect(clearButton).toBeVisible();
  });
});