from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import easyocr
from typing import Dict
import io
import json
import os
from pathlib import Path

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the OCR reader
reader = easyocr.Reader(['en'])

# Mock database for vehicle information
VEHICLE_DB = {
    "TN01AB1234": {
        "owner": "John Doe",
        "vehicle_type": "Car",
        "make": "Toyota",
        "model": "Camry",
        "year": "2020",
        "state": "TN",
        "state_name": "Tamil Nadu",
        "registration_valid_until": "2025-12-31"
    },
    "KA02CD5678": {
        "owner": "Jane Smith",
        "vehicle_type": "SUV",
        "make": "Honda",
        "model": "CR-V",
        "year": "2021",
        "state": "KA",
        "state_name": "Karnataka",
        "registration_valid_until": "2026-06-30"
    }
}

STATE_CODES = {
    "TN": "Tamil Nadu",
    "KA": "Karnataka",
    "KL": "Kerala",
    "AP": "Andhra Pradesh",
    "MH": "Maharashtra",
    "DL": "Delhi",
    "HR": "Haryana",
    "UP": "Uttar Pradesh",
    "MP": "Madhya Pradesh",
    "GJ": "Gujarat"
}

def process_license_plate(image_array: np.ndarray) -> Dict:
    """Process the license plate image and extract information"""
    try:
        # Convert to grayscale
        gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
        
        # Apply some image preprocessing
        blur = cv2.GaussianBlur(gray, (5,5), 0)
        thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

        # Perform OCR
        results = reader.readtext(thresh)
        
        if not results:
            return {"error": "No text detected in the image"}

        # Extract the text with highest confidence
        plate_text = ""
        max_conf = 0
        for (bbox, text, prob) in results:
            if prob > max_conf:
                plate_text = text
                max_conf = prob

        # Clean and format the detected text
        plate_text = ''.join(e for e in plate_text if e.isalnum()).upper()
        
        # Extract state code (first two characters)
        state_code = plate_text[:2] if len(plate_text) >= 2 else ""
        
        # Look up vehicle information
        vehicle_info = VEHICLE_DB.get(plate_text, {})
        if not vehicle_info:
            return {
                "plate_number": plate_text,
                "state_code": state_code,
                "state_name": STATE_CODES.get(state_code, "Unknown"),
                "confidence": float(max_conf),
                "message": "Vehicle details not found in database"
            }
        
        return {
            "plate_number": plate_text,
            "state_code": state_code,
            "state_name": STATE_CODES.get(state_code, "Unknown"),
            "confidence": float(max_conf),
            **vehicle_info
        }

    except Exception as e:
        return {"error": str(e)}

def process_license_plate_text(plate_text: str) -> Dict:
    """Process a license plate number provided as text"""
    try:
        plate_text = ''.join(e for e in plate_text if e.isalnum()).upper()
        state_code = plate_text[:2] if len(plate_text) >= 2 else ""
        
        # Look up vehicle information
        vehicle_info = VEHICLE_DB.get(plate_text, {})
        if not vehicle_info:
            return {
                "plate_number": plate_text,
                "state_code": state_code,
                "state_name": STATE_CODES.get(state_code, "Unknown"),
                "message": "Vehicle details not found in database"
            }
        
        return {
            "plate_number": plate_text,
            "state_code": state_code,
            "state_name": STATE_CODES.get(state_code, "Unknown"),
            **vehicle_info
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/license-plate/image")
async def analyze_license_plate(file: UploadFile = File(...)) -> Dict:
    """Endpoint to analyze license plate from an uploaded image"""
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Read and validate the image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    # Process the license plate
    result = process_license_plate(img)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@app.post("/api/license-plate/text")
async def analyze_license_plate_text(plate_number: str = Body(..., embed=True)) -> Dict:
    """Endpoint to analyze license plate from JSON body input

    Accepts JSON like: { "plate_number": "TN01AB1234" }
    """
    if not plate_number:
        raise HTTPException(status_code=400, detail="No license plate number provided")

    result = process_license_plate_text(plate_number)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result

@app.get("/")
async def root():
    return {"message": "License Plate Recognition API is running"}


DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
SUSPECTS_FILE = DATA_DIR / "suspects.json"


def _read_suspects_file():
    if not SUSPECTS_FILE.exists():
        return []
    try:
        with open(SUSPECTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _write_suspects_file(arr):
    with open(SUSPECTS_FILE, "w", encoding="utf-8") as f:
        json.dump(arr, f, indent=2, ensure_ascii=False)


def save_suspect_record(suspect: Dict) -> Dict:
    """Save suspect profile to server-side JSON file (append to top)."""
    arr = _read_suspects_file()
    arr.insert(0, suspect)
    _write_suspects_file(arr)
    return suspect


@app.post("/api/suspects")
async def add_suspect(payload: Dict):
    """Persist a suspect profile on the server. Accepts the same shape stored in localStorage."""
    if not payload or not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid suspect payload")
    try:
        saved = save_suspect_record(payload)
        return {"status": "ok", "saved": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))