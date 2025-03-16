"""
Unit tests for the Flood Monitoring System API endpoints.
"""
import pytest
import httpx
from fastapi import HTTPException

# Test the stations endpoint
def test_get_stations(test_client, mock_environment_api):
    """
    Test that the stations endpoint returns a list of stations.
    """
    response = test_client.get("/api/stations")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    
    # Check structure of returned station data
    for station in data:
        assert "stationReference" in station
        assert "label" in station
        assert "riverName" in station
        assert "lat" in station
        assert "long" in station

# Test the readings endpoint with valid station ID
def test_get_readings_valid_station(test_client, mock_environment_api):
    """
    Test that the readings endpoint returns readings for a valid station ID.
    """
    response = test_client.get("/api/readings/1001")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3
    
    # Check structure of returned reading data
    for reading in data:
        assert "dateTime" in reading
        assert "value" in reading
        assert "unit" in reading
        
        # Verify the value is a float
        assert isinstance(reading["value"], float)

# Test the readings endpoint with invalid station ID format
def test_get_readings_invalid_station_format(test_client, monkeypatch):
    """
    Test that the readings endpoint handles invalid station ID formats properly.
    """
    # Create a mock AsyncClient for handling the 500 error case
    class MockError:
        async def get(self, url, **kwargs):
            # Simulate a 500 error from the external API
            response = type('Response', (), {
                'status_code': 500,
                'text': 'Server Error',
                'json': lambda: {"error": "Server Error"}
            })()
            raise httpx.HTTPStatusError("HTTP Error: 500", request=None, response=response)
        
        async def __aenter__(self):
            return self
        
        async def __aexit__(self, *args):
            pass
    
    # Apply the mock
    monkeypatch.setattr("httpx.AsyncClient", lambda *args, **kwargs: MockError())
    
    # This should be caught by the application and converted to a 400 error
    response = test_client.get("/api/readings/invalid!@#")
    
    assert response.status_code == 400
    assert "Invalid station ID format" in response.json()["detail"]

# Test error handling for general exceptions
def test_get_readings_general_error(test_client, monkeypatch):
    """
    Test that the readings endpoint handles general errors properly.
    """
    # Create a mock AsyncClient that raises a general exception
    class MockException:
        async def get(self, url, **kwargs):
            raise Exception("General error")
        
        async def __aenter__(self):
            return self
        
        async def __aexit__(self, *args):
            pass
    
    # Apply the mock
    monkeypatch.setattr("httpx.AsyncClient", lambda *args, **kwargs: MockException())
    
    # This should be caught and return a 500 error
    response = test_client.get("/api/readings/1001")
    
    assert response.status_code == 500
    assert "Failed to fetch readings" in response.json()["detail"]
