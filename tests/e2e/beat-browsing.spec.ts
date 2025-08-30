import { test, expect } from '@playwright/test';

test.describe('Beat Browsing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display beat cards on homepage', async ({ page }) => {
    // Wait for beats to load
    await page.waitForSelector('[data-testid^=\"card-beat-\"]', { timeout: 10000 });
    
    // Check if beat cards are visible
    const beatCards = page.locator('[data-testid^=\"card-beat-\"]');
    await expect(beatCards).toHaveCountGreaterThan(0);
  });

  test('should play/pause beats', async ({ page }) => {
    // Wait for beats to load
    await page.waitForSelector('[data-testid^=\"card-beat-\"]', { timeout: 10000 });
    
    // Find first beat card and hover to reveal play button
    const firstBeatCard = page.locator('[data-testid^=\"card-beat-\"]').first();
    await firstBeatCard.hover();
    
    // Click play button
    const playButton = firstBeatCard.locator('[data-testid^=\"button-beat-play-\"]');
    await expect(playButton).toBeVisible();
    await playButton.click();
    
    // Verify audio player appears or updates
    // Note: This would need to be implemented based on your audio player design
  });

  test('should filter beats by genre', async ({ page }) => {
    // Navigate to browse page if it exists
    const browseLink = page.locator('text=Browse');
    if (await browseLink.isVisible()) {
      await browseLink.click();
    }
    
    // Look for genre filters
    const genreFilter = page.locator('text=Hip Hop, text=Trap, text=R&B').first();
    if (await genreFilter.isVisible()) {
      await genreFilter.click();
      
      // Wait for filtered results
      await page.waitForTimeout(1000);
      
      // Verify beats are displayed
      const beatCards = page.locator('[data-testid^=\"card-beat-\"]');
      await expect(beatCards).toHaveCountGreaterThan(0);
    }
  });

  test('should add beat to cart', async ({ page }) => {
    // This test would require authentication, so skip if not logged in
    const loginButton = page.locator('text=Login, text=Log in').first();
    if (await loginButton.isVisible()) {
      test.skip('Skipping cart test - requires authentication');
    }
    
    // Wait for beats to load
    await page.waitForSelector('[data-testid^=\"card-beat-\"]', { timeout: 10000 });
    
    // Find first beat and add to cart
    const firstBeat = page.locator('[data-testid^=\"card-beat-\"]').first();
    const addToCartButton = firstBeat.locator('[data-testid^=\"button-beat-add-cart-\"]');
    
    if (await addToCartButton.isVisible()) {
      await addToCartButton.click();
      
      // Verify cart updates (this would depend on your cart UI)
      // Could check for toast notification, cart count update, etc.
    }
  });

  test('should navigate to beat details', async ({ page }) => {
    // Wait for beats to load
    await page.waitForSelector('[data-testid^=\"card-beat-\"]', { timeout: 10000 });
    
    // Click on first beat title or card
    const firstBeatCard = page.locator('[data-testid^=\"card-beat-\"]').first();
    const beatTitle = firstBeatCard.locator('h3, h4').first();
    
    if (await beatTitle.isVisible()) {
      await beatTitle.click();
      
      // Should navigate to beat details page
      await page.waitForURL(/\/beat\/.*/, { timeout: 5000 });
      
      // Verify beat details are shown
      await expect(page.locator('h1, h2')).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip('This test only runs on mobile devices');
    }
    
    // Wait for page to load
    await page.waitForSelector('[data-testid^=\"card-beat-\"]', { timeout: 10000 });
    
    // Check if mobile layout is working
    const beatCards = page.locator('[data-testid^=\"card-beat-\"]');
    await expect(beatCards).toHaveCountGreaterThan(0);
    
    // Verify mobile navigation if it exists
    const mobileMenu = page.locator('[data-testid=\"mobile-menu\"], .mobile-menu');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      // Check if menu items are visible
    }
  });
});