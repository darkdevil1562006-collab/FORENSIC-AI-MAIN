from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import logging
import os

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Forensic-AI Backend (minimal)")

# Allow requests from the frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9002", "http://127.0.0.1:9002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Capture(BaseModel):
    dataUrl: str
    label: Optional[str] = None
    ts: Optional[int] = None


@app.get("/", tags=["health"])
async def root():
    return {"ok": True, "service": "forensic-ai-backend-minimal"}


@app.get("/health", tags=["health"])
async def health():
    return {"ok": True}


@app.post("/captures")
async def post_capture(capture: Capture):
    try:
        logging.info("Received capture: label=%s ts=%s", capture.label, capture.ts)
        # Save minimal record locally for inspection (append to file)
        out_dir = os.path.join(os.path.dirname(__file__), "..", "test-data")
        os.makedirs(out_dir, exist_ok=True)
        out_file = os.path.join(out_dir, "captures.log")
        with open(out_file, "a", encoding="utf-8") as f:
            f.write(f"{capture.label}\t{capture.ts}\n")
        return {"ok": True}
    except Exception as e:
        logging.exception("Failed to handle capture")
        raise HTTPException(status_code=500, detail=str(e))
