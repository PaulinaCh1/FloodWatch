from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import httpx
from datetime import datetime, timedelta, timezone
import logging
from urllib.parse import quote

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Flood Watch")

# Configure static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

FLOOD_API_BASE = "https://environment.data.gov.uk/flood-monitoring/id"

@app.get("/")
async def read_root(request: Request):
    """Serve the main template without any context variables"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/stations")
async def get_stations():
    """Get list of active monitoring stations"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{FLOOD_API_BASE}/stations",
                params={"status": "Active", "_limit": 500}
            )
            response.raise_for_status()
            
            return [
                {
                    "stationReference": station["stationReference"],
                    "label": station["label"],
                    "riverName": station.get("riverName", "Unknown River"),
                    "lat": station["lat"],
                    "long": station["long"]
                }
                for station in response.json().get("items", [])
                if all(key in station for key in ["stationReference", "label", "lat", "long"])
            ]
            
    except Exception as e:
        logger.error(f"Stations error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch stations")

@app.get("/api/readings/{station_id}")
async def get_readings(station_id: str):
    """Get readings for a specific station"""
    try:
        # Using UTC-aware datetime
        time_filter = datetime.now(timezone.utc) - timedelta(hours=24)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{FLOOD_API_BASE}/stations/{quote(station_id, safe='')}/readings",
                params={
                    "since": time_filter.isoformat(timespec='seconds'),  # Proper ISO format
                    "_sorted": "true"
                }
            )
            response.raise_for_status()
            
            items = response.json().get("items", [])
            if not items:
                return []
            
            unit = next((item.get("unit") for item in items if item.get("unit")), "N/A")
            
            return [
                {
                    "dateTime": reading["dateTime"],
                    "value": float(reading["value"]),
                    "unit": unit
                }
                for reading in items
                if reading.get("value") is not None
            ]
            
    except httpx.HTTPStatusError as e:
        logger.error(f"Readings API error: {e.response.text}")
        if e.response.status_code == 500:
            raise HTTPException(
                status_code=400,
                detail="Invalid station ID format"
            )
        raise HTTPException(status_code=502, detail="Failed to fetch readings")
    except Exception as e:
        logger.error(f"Readings error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch readings")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)