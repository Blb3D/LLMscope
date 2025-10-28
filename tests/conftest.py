import pytest
import subprocess
import time
import requests

@pytest.fixture(scope="session")
def docker_stack():
    """Start Docker stack before tests"""
    print("\n[FIXTURE] Starting Docker stack...")
    subprocess.run(["docker-compose", "up", "-d"], check=True)
    time.sleep(5)  # Wait for services to start
    
    # Wait for API to be ready
    max_retries = 30
    for i in range(max_retries):
        try:
            response = requests.get("http://localhost:8000/health")
            if response.status_code == 200:
                print("[FIXTURE] API is ready!")
                break
        except:
            pass
        time.sleep(1)
    
    yield
    
    print("\n[FIXTURE] Stopping Docker stack...")
    subprocess.run(["docker-compose", "down"], check=True)

@pytest.fixture
def api_key():
    return "dev-123"

@pytest.fixture
def api_base_url():
    return "http://localhost:8000"

@pytest.fixture
def browser():
    """Selenium browser fixture"""
    from selenium import webdriver
    driver = webdriver.Chrome()
    yield driver
    driver.quit()