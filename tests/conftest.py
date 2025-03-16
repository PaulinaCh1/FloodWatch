"""
Shared fixtures for testing the Flood Monitoring System.
"""
import pytest
from fastapi.testclient import TestClient
import httpx

from main import app

@pytest.fixture
def test_client():
    """
    Create a test client for the FastAPI application.
    """
    return TestClient(app)

@pytest.fixture
def mock_stations_data():
    """
    Mock data for stations endpoint.
    """
    return {
        "items": [
            {
                "stationReference": "1001",
                "label": "Test Station 1",
                "riverName": "Test River",
                "lat": 51.5074,
                "long": -0.1278
            },
            {
                "stationReference": "1002",
                "label": "Test Station 2",
                "riverName": "Another River",
                "lat": 52.5200,
                "long": 13.4050
            }
        ]
    }

@pytest.fixture
def mock_readings_data():
    """
    Mock data for readings endpoint.
    """
    return {
        "items": [
            {
                "dateTime": "2025-03-15T10:00:00Z",
                "value": "1.23",
                "unit": "m"
            },
            {
                "dateTime": "2025-03-15T11:00:00Z",
                "value": "1.25",
                "unit": "m"
            },
            {
                "dateTime": "2025-03-15T12:00:00Z",
                "value": "1.27",
                "unit": "m"
            }
        ]
    }

@pytest.fixture
def mock_environment_api(monkeypatch, mock_stations_data, mock_readings_data):
    """
    Mock the external API calls made through httpx.AsyncClient
    """
    original_async_client = httpx.AsyncClient
    
    # Create a async mocked get method for our mock client
    async def mocked_get(self, url, **kwargs):
        class MockResponse:
            def __init__(self, status_code, json_data):
                self.status_code = status_code
                self._json = json_data
                self.text = str(json_data)
            
            def json(self):
                return self._json
            
            def raise_for_status(self):
                if self.status_code >= 400:
                    request = None
                    response = self
                    raise httpx.HTTPStatusError(f"Error {self.status_code}", request, response)
        
        # For stations endpoint - match any URL containing "/stations"
        if "/stations" in url and not "/stations/" in url:
            return MockResponse(200, mock_stations_data)
        
        # For readings endpoint - match any URL containing "/readings"
        if "/readings" in url or "/stations/" in url:
            return MockResponse(200, mock_readings_data)
        
        # Default response for unmatched URLs
        return MockResponse(404, {"detail": "Not found"})
    
    # Create a mock AsyncClient that provides the mocked get method
    class MockAsyncClient:
        def __init__(self, *args, **kwargs):
            pass
        
        async def __aenter__(self):
            # Return self as the client to be used in the context
            return self
        
        async def __aexit__(self, *args):
            # Clean up (nothing to do)
            pass
        
        # Attach our mocked get method
        get = mocked_get
    
    # Patch httpx.AsyncClient with our mock
    monkeypatch.setattr("httpx.AsyncClient", MockAsyncClient)
    
    yield
    
    # Restore original after test
    monkeypatch.setattr("httpx.AsyncClient", original_async_client)
