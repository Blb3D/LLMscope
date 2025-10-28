import pytest
import subprocess
import time

@pytest.fixture(scope="session")
def docker_stack():
    """Start Docker stack before tests"""
    subprocess.run(["docker-compose", "up", "-d"], check=True)
    time.sleep(5)  # Wait for services to start
    yield
    subprocess.run(["docker-compose", "down"], check=True)

@pytest.fixture
def api_key():
    return "dev-123"

@pytest.fixture
def api_base_url():
    return "http://localhost:8000"