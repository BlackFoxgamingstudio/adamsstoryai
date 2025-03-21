// Simple UI component test script

// Test DOM structure of key components
function testNavBar() {
  console.log('Testing NavBar component...');
  const navElement = document.querySelector('nav');
  if (!navElement) {
    console.error('❌ NavBar not found in DOM');
    return false;
  }

  const links = navElement.querySelectorAll('a');
  if (links.length < 3) {
    console.error('❌ NavBar is missing navigation links (expected at least 3)');
    return false;
  }

  console.log('✅ NavBar verification passed');
  return true;
}

function testFooter() {
  console.log('Testing Footer component...');
  const footerElement = document.querySelector('footer');
  if (!footerElement) {
    console.error('❌ Footer not found in DOM');
    return false;
  }

  const year = new Date().getFullYear();
  if (!footerElement.textContent.includes(year.toString())) {
    console.error('❌ Footer is missing current year');
    return false;
  }

  console.log('✅ Footer verification passed');
  return true;
}

function testHomePage() {
  console.log('Testing Home page...');
  const heading = document.querySelector('h1');
  if (!heading || !heading.textContent.includes('StoryboardAI')) {
    console.error('❌ Home page heading not found or incorrect');
    return false;
  }

  const buttons = document.querySelectorAll('button');
  let hasActionButton = false;
  for (const button of buttons) {
    if (button.textContent.includes('Project') || button.textContent.includes('Start')) {
      hasActionButton = true;
      break;
    }
  }

  if (!hasActionButton) {
    console.error('❌ Home page is missing action buttons');
    return false;
  }

  console.log('✅ Home page verification passed');
  return true;
}

function testProjectsPage() {
  console.log('Testing Projects page...');
  const createButton = document.querySelector('a[href="/projects/create"]');
  if (!createButton) {
    console.error('❌ Projects page is missing Create Project button');
    return false;
  }

  console.log('✅ Projects page verification passed');
  return true;
}

// Main test runner
function runUITests() {
  console.log('=== StoryboardAI UI Component Tests ===');
  
  // Determine current page
  const path = window.location.pathname;
  
  // Common components
  let passed = 0;
  const navBarResult = testNavBar();
  if (navBarResult) passed++;
  
  const footerResult = testFooter();
  if (footerResult) passed++;
  
  // Page-specific tests
  if (path === '/' || path === '') {
    const homeResult = testHomePage();
    if (homeResult) passed++;
  }
  
  if (path === '/projects') {
    const projectsResult = testProjectsPage();
    if (projectsResult) passed++;
  }
  
  // Summary
  console.log('=== Test Results ===');
  console.log(`Total tests: ${path === '/' || path === '' ? 3 : 
               path === '/projects' ? 3 : 2}`);
  console.log(`Passed: ${passed}`);
  
  if (passed === (path === '/' || path === '' ? 3 : 
                  path === '/projects' ? 3 : 2)) {
    console.log('✅ All UI tests passed for current page!');
  } else {
    console.error('❌ Some UI tests failed. See details above.');
  }
}

// Export for console use
window.runUITests = runUITests;

// Run tests when script is loaded
setTimeout(runUITests, 1000); // Wait for DOM to be fully rendered 