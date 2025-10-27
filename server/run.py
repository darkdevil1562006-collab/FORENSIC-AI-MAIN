import uvicorn
import os

if __name__ == "__main__":
    # Run the app module located in the same `server` directory as this script.
    # Use port 8005 by default to avoid conflicts with other services.
    uvicorn.run("main:app", host="127.0.0.1", port=int(os.environ.get("PORT", 8005)), reload=True)