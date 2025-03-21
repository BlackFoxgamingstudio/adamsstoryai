import requests
import json
import sys
import os
import time

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"
VERBOSE = True

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
ENDC = '\033[0m'

# Test results tracking
results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0
}

def log(message, color=None):
    """Print a message with optional color formatting"""
    if color:
        print(f"{color}{message}{ENDC}")
    else:
        print(message)

def test_endpoint(method, endpoint, expected_status=200, data=None, files=None, description=None, skip_on_failure=False):
    """Test an API endpoint and record the result"""
    results["total"] += 1
    
    url = f"{API_BASE_URL}{endpoint}" if not endpoint.startswith("http") else endpoint
    
    if description:
        log(f"\nTesting: {description}", BLUE)
    log(f"  {method.upper()} {url}")
    
    response = None
    try:
        if method.lower() == "get":
            response = requests.get(url)
        elif method.lower() == "post":
            response = requests.post(url, json=data, files=files)
        elif method.lower() == "put":
            response = requests.put(url, json=data, files=files)
        elif method.lower() == "delete":
            response = requests.delete(url)
            
        status_code = response.status_code
        
        if status_code == expected_status:
            results["passed"] += 1
            log(f"  ✅ {GREEN}PASSED{ENDC} (Status: {status_code})")
            if VERBOSE and response.text:
                try:
                    response_data = response.json()
                    log(f"  Response: {json.dumps(response_data, indent=2)[:500]}...")
                except:
                    log(f"  Response: {response.text[:500]}...")
            return response
        else:
            results["failed"] += 1
            log(f"  ❌ {RED}FAILED{ENDC} (Status: {status_code}, Expected: {expected_status})")
            try:
                response_data = response.json()
                log(f"  Response: {json.dumps(response_data, indent=2)}")
            except:
                log(f"  Response: {response.text}")
            
            if skip_on_failure:
                return None
            return response
                
    except Exception as e:
        results["failed"] += 1
        log(f"  ❌ {RED}ERROR{ENDC}: {str(e)}")
        if skip_on_failure:
            return None
        raise

def print_summary():
    """Print a summary of test results"""
    total = results["total"]
    passed = results["passed"]
    failed = results["failed"]
    skipped = results["skipped"]
    
    success_rate = (passed / total) * 100 if total > 0 else 0
    
    log("\n" + "=" * 50)
    log(f"TEST SUMMARY", BLUE)
    log("=" * 50)
    log(f"Total tests:  {total}")
    log(f"Passed:       {GREEN}{passed}{ENDC} ({success_rate:.1f}%)")
    log(f"Failed:       {RED}{failed}{ENDC}")
    log(f"Skipped:      {YELLOW}{skipped}{ENDC}")
    log("=" * 50)
    
    return failed == 0

def run_tests():
    """Run all API endpoint tests"""
    log("\n" + "=" * 50)
    log(f"STORYBOARD AI API TESTS", BLUE)
    log("=" * 50)
    
    # Health check
    health_response = test_endpoint("get", "/health", description="Health check")
    root_response = test_endpoint("get", BASE_URL, description="Root endpoint")
    
    # Projects endpoints
    projects_response = test_endpoint("get", "/projects", description="List all projects")
    
    # Create a test project
    project_data = {
        "title": "Test Project",
        "description": "A test project created by the API test script",
        "style": "cartoon",
        "genre": "action",
        "aspect_ratio": "16:9"
    }
    create_project_response = test_endpoint("post", "/projects", data=project_data, description="Create a new project")
    
    project_id = None
    if create_project_response and create_project_response.status_code == 200:
        project_id = create_project_response.json().get("project_id")
        
        # Test project detail endpoint
        test_endpoint("get", f"/projects/{project_id}", description=f"Get project details")
        
        # Test update project
        update_data = {
            "title": "Updated Test Project", 
            "description": "This project was updated by the API test script"
        }
        test_endpoint("put", f"/projects/{project_id}", data=update_data, description="Update project")
        
        # Skip frame generation if the project has no frames
        # test_endpoint("post", f"/projects/{project_id}/generate-all", description="Generate all frames (this may take time)")
        
        # Get project frames
        frames_response = test_endpoint("get", f"/projects/{project_id}/frames", description="Get project frames")
        
        # Test frame generation for a specific frame
        if frames_response and frames_response.status_code == 200:
            frames = frames_response.json()
            if frames and len(frames) > 0:
                frame_id = frames[0].get("id") or frames[0].get("frame_id")
                frame_data = {
                    "prompt": "A test prompt for regenerating this specific frame"
                }
                test_endpoint("post", f"/projects/{project_id}/frames/{frame_id}/generate", 
                             data=frame_data, description="Generate image for specific frame")
        
        # Test export
        test_endpoint("post", f"/projects/{project_id}/export", description="Export storyboard")
    
    # Actor-related endpoints
    actors_response = test_endpoint("get", "/actors", description="List all actors")
    
    # Create a test actor with a timestamp to make it unique
    import time
    timestamp = int(time.time())
    actor_name = f"Test Actor {timestamp}"
    
    # Create a test actor
    actor_data = {
        "name": actor_name,
        "description": "A test actor created by the API test script",
        "auto_generate_image": True
    }
    
    # We're not sending files, so we need to use data instead of json
    create_actor_response = test_endpoint("post", "/actors", 
                                         data=None, 
                                         files={
                                             'name': (None, actor_name),
                                             'description': (None, 'A test actor created by the API test script'),
                                             'auto_generate_image': (None, 'true')
                                         },
                                         description="Create a new actor with auto-generated image")
    
    # Film school consultation
    if project_id:
        film_school_data = {
            "initial_concept": "A thrilling action movie about a spy who discovers a conspiracy",
            "project_id": project_id
        }
        film_school_response = test_endpoint("post", "/film-school/projects", 
                                           data=film_school_data, 
                                           description="Create film school consultation")
        
        if film_school_response and film_school_response.status_code == 200:
            # Extract consultation_id from response
            consultation_id = film_school_response.json().get("project_id", project_id)
            
            # Get questions
            questions_response = test_endpoint("get", f"/film-school/projects/{consultation_id}/questions", 
                        description="Get film school consultation questions")
            
            # Only submit answers if there are questions
            if questions_response and questions_response.status_code == 200:
                questions_data = questions_response.json()
                questions = questions_data.get("questions", [])
                
                if questions and len(questions) > 0:
                    # Submit answers - format as a list instead of an object with "answers" property
                    answers_data = [
                        {
                            "question_id": questions[0].get("id", "1"),
                            "answer": "This is a test answer to the first question"
                        }
                    ]
                    
                    # The API expects a list format for answers
                    test_endpoint("post", f"/film-school/projects/{consultation_id}/answers", 
                                data=answers_data, 
                                description="Submit answers to consultation questions",
                                expected_status=200)
                else:
                    print(f"  ⚠️ {YELLOW}SKIPPED{ENDC} (No questions available to answer)")
                    results["skipped"] += 1
    
    # Cleanup - delete the test project if it was created
    if project_id:
        test_endpoint("delete", f"/projects/{project_id}", description="Delete test project")
    
    # Print summary of all tests
    return print_summary()

if __name__ == "__main__":
    # Check if API is up
    try:
        requests.get(f"{BASE_URL}/health", timeout=5)
    except requests.exceptions.ConnectionError:
        log(f"{RED}ERROR: API server is not running at {BASE_URL}{ENDC}")
        log(f"Please make sure the backend server is running before executing this test script.")
        sys.exit(1)
        
    # Run all tests
    success = run_tests()
    
    # Exit with appropriate status code
    sys.exit(0 if success else 1) 