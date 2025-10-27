import easyocr
import cv2
import numpy as np
from typing import Dict, Optional
import json
import os

# Initialize the OCR reader
reader = easyocr.Reader(['en'])

# Mock database for vehicle information (in production, this should be a real database)
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
    }
    # Add more mock data as needed
}

STATE_CODES = {
    "TN": "Tamil Nadu",
    "KA": "Karnataka",
    "KL": "Kerala",
    "AP": "Andhra Pradesh",
    "MH": "Maharashtra",
    # Add more state codes as needed
}

def process_license_plate(image_array: np.ndarray) -> Dict:
    """
    Process the license plate image and extract information
    """
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
            # If not found in DB, return basic information
            return {
                "plate_number": plate_text,
                "state_code": state_code,
                "state_name": STATE_CODES.get(state_code, "Unknown"),
                "confidence": float(max_conf),
                "message": "Vehicle details not found in database"
            }
        
        # Return full information if found
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
    """
    Process a license plate number provided as text
    """
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