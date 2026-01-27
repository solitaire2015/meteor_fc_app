
import { chromium } from 'playwright';

(async () => {
  console.log("Starting test...");
  
  // Connect to the existing Selenium session via CDP
  // Replace with the session ID we just got: bb3b273ecbc43052d203c62244a9dcb3
  const sessionId = 'bb3b273ecbc43052d203c62244a9dcb3';
  const cdpUrl = `ws://localhost:4444/session/${sessionId}/se/cdp`;
  
  console.log(`Connecting to CDP at ${cdpUrl}...`);
  const browser = await chromium.connectOverCDP(cdpUrl);
  console.log("Connected to remote browser");

  // Get the existing context/page or create new
  const contexts = browser.contexts();
  const context = contexts.length > 0 ? contexts[0] : await browser.newContext();
  const page = await context.newPage();
  
  const hostUrl = 'http://172.17.0.1:3000'; // Host IP from container

  // 1. Login
  console.log(`Navigating to ${hostUrl}/login...`);
  await page.goto(`${hostUrl}/login`);
  
  await page.fill('input[type="email"]', 'solitaire10@163.com');
  await page.fill('input[type="password"]', 'TempLogin2025');
  await page.click('button[type="submit"]'); 
  
  console.log("Logged in, waiting for redirect...");
  // Wait for navigation to dashboard (url not containing /login)
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });
  
  // 2. Go to a Match Page (Admin)
  console.log("Navigating to matches...");
  await page.goto(`${hostUrl}/admin/matches`);
  
  // Click the first match to edit. Use a more robust selector if possible.
  // We'll look for a button or link inside the match card.
  // Assuming the list has links.
  // Let's just grab the first match ID from the API to be safe? 
  // No, let's try UI interaction.
  await page.waitForSelector('text=METEOR vs');
  await page.click('text=METEOR vs'); 
  
  // 3. Test Event Logger
  console.log("Testing Event Logger...");
  await page.waitForSelector('text=出勤管理');
  await page.click('text=出勤管理'); // Switch to Attendance Tab
  
  // Wait for the Detailed Event Logger to appear
  await page.waitForSelector('text=比赛详细事件');
  
  // Add a Yellow Card
  console.log("Adding Yellow Card...");
  // Select a player (first one in the dropdown)
  // The trigger for the select is likely a button with role "combobox" or similar in shadcn/ui select
  // But standard select option selection in playwright might need the hidden select or clicking the trigger.
  // shadcn/ui Select is complex.
  // Let's try to click the trigger and then an item.
  
  // Player select trigger (first one)
  await page.click('button[role="combobox"] >> nth=0'); 
  await page.waitForSelector('div[role="option"]');
  await page.click('div[role="option"] >> nth=0'); // Select first player
  
  // Event type select trigger (second one)
  await page.click('button[role="combobox"] >> nth=1');
  await page.click('text=黄牌');
  
  // Minute input
  await page.fill('input[placeholder="--"]', '42'); // Minute
  
  // Add button
  await page.click('button:has-text("添加")');
  
  // Verify it appears in the table
  await page.waitForSelector('text=42\'');
  console.log("Event added successfully!");
  
  // 4. Test Leaderboard
  console.log("Testing Leaderboard...");
  await page.goto(`${hostUrl}/leaderboard`);
  
  // Check if tabs exist
  await page.waitForSelector('text=黄牌榜');
  await page.click('text=黄牌榜');
  
  // Verify table header changes or content loads
  await page.waitForSelector('th:has-text("黄牌")');
  console.log("Leaderboard tab works!");

  await browser.close();
  console.log("Test passed!");
})();
