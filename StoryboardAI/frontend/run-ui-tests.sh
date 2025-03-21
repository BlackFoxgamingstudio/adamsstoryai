#!/bin/bash

# StoryboardAI Frontend UI Test Script

echo "=== StoryboardAI Frontend UI Tests ==="
echo ""

# Check if the app is running
echo "Checking if the frontend application is running..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

if [ "$FRONTEND_STATUS" != "200" ]; then
  echo "ERROR: The frontend server is not running. Please start the application first using docker-compose up -d"
  exit 1
fi

echo "Frontend server is responding. Continuing with tests..."
echo ""

# Create test results directory
mkdir -p test-results

# Function to test a specific page
test_page() {
  local page=$1
  local page_name=$2
  
  echo "Testing $page_name page..."
  
  # Use curl to fetch the page HTML
  local page_html=$(curl -s "http://localhost:3000$page")
  
  # Save page content for manual inspection
  echo "$page_html" > "test-results/${page_name// /_}_page.html"
  
  # Check if the page contains basic expected elements
  if echo "$page_html" | grep -q '<div id="root">' && echo "$page_html" | grep -q 'StoryboardAI'; then
    echo "✅ Basic page structure check passed"
  else
    echo "❌ Basic page structure check failed"
    return 1
  fi
  
  echo "✅ HTML saved to test-results/${page_name// /_}_page.html for inspection"
  echo ""
  return 0
}

# Create a combined test report
create_test_report() {
  cat > test-results/ui-test-report.html << EOL
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StoryboardAI UI Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #0D6EFD;
            border-bottom: 2px solid #dee2e6;
            padding-bottom: 10px;
        }
        .page-test {
            margin-bottom: 30px;
            padding: 15px;
            border-radius: 5px;
            background-color: #f8f9fa;
        }
        .pass {
            border-left: 5px solid #28a745;
        }
        .fail {
            border-left: 5px solid #dc3545;
        }
        .test-result {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            margin-left: 10px;
            font-weight: bold;
        }
        .pass-label {
            background-color: #d4edda;
            color: #155724;
        }
        .fail-label {
            background-color: #f8d7da;
            color: #721c24;
        }
        .summary {
            margin-top: 30px;
            padding: 15px;
            background-color: #e9ecef;
            border-radius: 5px;
        }
        .view-link {
            display: inline-block;
            margin-top: 10px;
            padding: 5px 10px;
            background-color: #0D6EFD;
            color: white;
            text-decoration: none;
            border-radius: 3px;
        }
        .view-link:hover {
            background-color: #0b5ed7;
        }
        pre {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 3px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <h1>StoryboardAI UI Test Report</h1>
    <p>Generated on: $(date)</p>
    
    <div class="summary">
        <h2>Test Summary</h2>
        <p><strong>Total Pages Tested:</strong> $total_tests</p>
        <p><strong>Passed:</strong> $passed_tests</p>
        <p><strong>Failed:</strong> $failed_tests</p>
        <p><strong>Overall Status:</strong> 
            <span class="test-result $([ $passed_tests -eq $total_tests ] && echo 'pass-label' || echo 'fail-label')">
                $([ $passed_tests -eq $total_tests ] && echo 'PASSED' || echo 'FAILED')
            </span>
        </p>
    </div>
    
    <h2>Page Tests</h2>
EOL

  # Add each page test result
  for key in "${!page_results[@]}"; do
    local result=${page_results[$key]}
    local result_class=$([ "$result" == "passed" ] && echo "pass" || echo "fail")
    local result_label=$([ "$result" == "passed" ] && echo "PASSED" || echo "FAILED")
    local result_label_class=$([ "$result" == "passed" ] && echo "pass-label" || echo "fail-label")
    
    cat >> test-results/ui-test-report.html << EOL
    <div class="page-test ${result_class}">
        <h3>${key} Page <span class="test-result ${result_label_class}">${result_label}</span></h3>
        <p>Basic page structure tested for correct HTML structure and StoryboardAI reference.</p>
        <a href="${key// /_}_page.html" class="view-link" target="_blank">View HTML</a>
    </div>
EOL
  done
  
  # Add instructions for browser testing
  cat >> test-results/ui-test-report.html << EOL
    <h2>Browser-Based Testing</h2>
    <p>For more comprehensive UI testing, open the following pages in your browser and check the browser console:</p>
    <ul>
        <li><a href="http://localhost:3000/" target="_blank">Home Page</a></li>
        <li><a href="http://localhost:3000/projects" target="_blank">Projects Page</a></li>
        <li><a href="http://localhost:3000/actors" target="_blank">Actors Page</a></li>
    </ul>
    <p>In the browser console, run the following command to execute all UI tests:</p>
    <pre>runUITests()</pre>
    
    <h2>UI Test Script</h2>
    <p>The UI test script checks for:</p>
    <ul>
        <li>NavBar existence and navigation links</li>
        <li>Footer existence and current year</li>
        <li>Page-specific content on Home, Projects, and Actors pages</li>
        <li>Buttons and important UI elements</li>
    </ul>
    
    <script>
        // You can rerun the tests anytime by refreshing this page
        console.log('UI Test Report generated for StoryboardAI');
    </script>
</body>
</html>
EOL

  echo "Test report created: test-results/ui-test-report.html"
}

# Copy the UI test script to the test results directory
cp src/UITest.js test-results/
echo "UI Test script copied to test results directory"

# Initialize test tracking variables
declare -A page_results
total_tests=0
passed_tests=0
failed_tests=0

# Run tests for key pages
test_page "/" "Home"
if [ $? -eq 0 ]; then
  page_results["Home"]="passed"
  ((passed_tests++))
else
  page_results["Home"]="failed"
  ((failed_tests++))
fi
((total_tests++))

test_page "/projects" "Projects"
if [ $? -eq 0 ]; then
  page_results["Projects"]="passed"
  ((passed_tests++))
else
  page_results["Projects"]="failed"
  ((failed_tests++))
fi
((total_tests++))

test_page "/actors" "Actors"
if [ $? -eq 0 ]; then
  page_results["Actors"]="passed"
  ((passed_tests++))
else
  page_results["Actors"]="failed"
  ((failed_tests++))
fi
((total_tests++))

# Create the test report
create_test_report

# Open the report in the browser
echo "Opening UI test report in browser..."
open test-results/ui-test-report.html

echo "=== UI Test Complete ==="
echo "For detailed results, check the browser window that opened."
echo "Summary: $passed_tests passed, $failed_tests failed out of $total_tests tests."
echo ""

# Exit with success if all tests passed, failure otherwise
if [ $passed_tests -eq $total_tests ]; then
  exit 0
else
  exit 1
fi 