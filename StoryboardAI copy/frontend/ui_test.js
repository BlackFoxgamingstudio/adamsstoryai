const puppeteer = require('puppeteer');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TIMEOUT = 30000; // 30 seconds timeout for operations

// Helper for logging
const log = {
  info: (msg) => console.log(`\x1b[34mINFO:\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32mSUCCESS:\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31mERROR:\x1b[0m ${msg}`),
  warning: (msg) => console.log(`\x1b[33mWARNING:\x1b[0m ${msg}`)
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  total: 0
};

// Helper to wait for an element to be visible
async function waitForElement(page, selector, timeout = TIMEOUT) {
  try {
    return await page.waitForSelector(selector, { visible: true, timeout });
  } catch (error) {
    throw new Error(`Element with selector '${selector}' not found within ${timeout}ms`);
  }
}

// Test a specific page
async function testPage(page, url, tests) {
  log.info(`Testing page: ${url}`);
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle0', timeout: TIMEOUT });
  
  for (const test of tests) {
    results.total++;
    try {
      log.info(`Running test: ${test.name}`);
      await test.fn(page);
      results.passed++;
      log.success(`Test passed: ${test.name}`);
    } catch (error) {
      results.failed++;
      log.error(`Test failed: ${test.name}`);
      log.error(`  Reason: ${error.message}`);
      // Save a screenshot when a test fails
      const screenshotPath = `error-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      log.info(`  Screenshot saved: ${screenshotPath}`);
    }
  }
}

// Main test function
async function runTests() {
  log.info('Starting UI tests...');
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for headless mode
    args: ['--window-size=1920,1080']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Test the homepage
    await testPage(page, '/', [
      {
        name: 'Homepage loads correctly',
        fn: async (page) => {
          await waitForElement(page, '.app');
          const title = await page.title();
          if (!title) throw new Error('Page title is empty');
        }
      },
      {
        name: 'Navigation links exist',
        fn: async (page) => {
          await waitForElement(page, 'nav');
          const links = await page.$$('nav a');
          if (links.length < 2) throw new Error('Not enough navigation links found');
        }
      }
    ]);
    
    // Test the projects list page
    await testPage(page, '/projects', [
      {
        name: 'Projects page loads',
        fn: async (page) => {
          await waitForElement(page, '.app');
          // Check for projects list container
          await waitForElement(page, '.container', 5000);
        }
      },
      {
        name: 'Create project button exists',
        fn: async (page) => {
          const button = await page.$('button');
          if (!button) throw new Error('Create project button not found');
        }
      }
    ]);
    
    // Test the actors list page
    await testPage(page, '/actors', [
      {
        name: 'Actors page loads',
        fn: async (page) => {
          await waitForElement(page, '.app');
          // Check for actors list container
          await waitForElement(page, '.container', 5000);
        }
      },
      {
        name: 'Create actor button exists',
        fn: async (page) => {
          const button = await page.$('button');
          if (!button) throw new Error('Create actor button not found');
        }
      }
    ]);
    
    // Create a test project (if there are none)
    log.info('Testing project creation...');
    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0' });
    
    // Check if we need to create a project (i.e., no projects exist)
    const projectsExist = await page.evaluate(() => {
      const projectCards = document.querySelectorAll('.card');
      return projectCards.length > 0;
    });
    
    if (!projectsExist) {
      results.total++;
      try {
        log.info('No projects found, creating a test project');
        
        // Find and click the create project button
        const createButton = await page.$('button');
        await createButton.click();
        
        // Wait for the form to appear
        await waitForElement(page, 'form');
        
        // Fill in the form
        await page.type('input[name="title"]', 'Test Project');
        await page.type('textarea[name="description"]', 'This is a test project created by the UI test script');
        
        // Submit the form
        const submitButton = await page.$('button[type="submit"]');
        await submitButton.click();
        
        // Wait for redirect to the project detail page
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        results.passed++;
        log.success('Project created successfully');
      } catch (error) {
        results.failed++;
        log.error(`Failed to create project: ${error.message}`);
        const screenshotPath = `error-create-project-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        log.info(`Screenshot saved: ${screenshotPath}`);
      }
    } else {
      log.info('Projects already exist, skipping creation test');
    }
    
    // Print test summary
    log.info('\n=== TEST SUMMARY ===');
    log.info(`Total tests: ${results.total}`);
    log.success(`Passed: ${results.passed}`);
    log.error(`Failed: ${results.failed}`);
    log.info('===================\n');
    
    if (results.failed > 0) {
      log.warning('Some tests failed. Check the logs for details.');
      process.exitCode = 1;
    } else {
      log.success('All tests passed!');
      process.exitCode = 0;
    }
    
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

// Run the tests
runTests().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  process.exitCode = 1;
}); 