from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .license_plate import process_license_plate, process_license_plate_text
import numpy as np
import cv2
from typing import Dict
import io

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/license-plate/image")
async def analyze_license_plate(file: UploadFile = File(...)) -> Dict:
    """
    Endpoint to analyze license plate from an uploaded image
    """
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
async def analyze_license_plate_text(plate_number: str) -> Dict:
    """
    Endpoint to analyze license plate from text input
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