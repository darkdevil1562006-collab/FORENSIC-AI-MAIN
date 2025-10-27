# SpeechBrain ECAPA-TDNN service

This small FastAPI service accepts uploaded audio and returns speaker embedding matches using SpeechBrain's ECAPA-TDNN model.

Prerequisites (recommended):
- Python 3.10+
- ffmpeg (for audio conversions)

Install locally:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# first run will download the pretrained model (may take time)
uvicorn server.app:app --host 0.0.0.0 --port 8001
```

Docker (simpler for reproducibility): I can provide a Dockerfile on request.
