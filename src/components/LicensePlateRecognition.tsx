import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import Image from "next/image";

interface VehicleInfo {
  plate_number: string;
  state_code: string;
  state_name: string;
  owner?: string;
  vehicle_type?: string;
  make?: string;
  model?: string;
  year?: string;
  registration_valid_until?: string;
  confidence?: number;
  message?: string;
}

export const LicensePlateRecognition: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [plateNumber, setPlateNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<VehicleInfo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [autoRun, setAutoRun] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file type
      if (!selectedFile.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }
      // Check file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size should be less than 5MB");
        return;
      }
      setFile(selectedFile);
      setError("");

      // Create preview URL
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const handleImageSubmit = async () => {
    if (!file) {
      setError("Please select an image");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/license-plate/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze license plate");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to analyze license plate"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!plateNumber) {
      setError("Please enter a license plate number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/license-plate/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plate_number: plateNumber }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze license plate");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to analyze license plate"
      );
    } finally {
      setLoading(false);
    }
  };

  // Cleanup preview URL when component unmounts
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Check sessionStorage for preloaded plate image/text from suspect management
  React.useEffect(() => {
    try {
      const imgData = sessionStorage.getItem("advancedPlateImage");
      const txt = sessionStorage.getItem("advancedPlateText");
      if (imgData) {
        // convert dataURL to File
        (async () => {
          try {
            const res = await fetch(imgData);
            const blob = await res.blob();
            const f = new File([blob], "plate.jpg", { type: blob.type });
            setFile(f);
            const url = URL.createObjectURL(f);
            setPreviewUrl(url);
            setAutoRun(true);
            // remove keys so repeated navigation doesn't auto-run again
            sessionStorage.removeItem("advancedPlateImage");
          } catch (e) {
            console.warn("Failed to load preloaded plate image", e);
          }
        })();
      } else if (txt) {
        setPlateNumber(txt);
        setAutoRun(true);
        sessionStorage.removeItem("advancedPlateText");
      }
    } catch (e) {
      /* ignore */
    }
  }, []);

  // auto-run when file or plateNumber set via sessionStorage
  React.useEffect(() => {
    if (!autoRun) return;
    if (file && previewUrl) {
      // slight delay to allow UI to update
      setTimeout(() => {
        handleImageSubmit();
      }, 200);
    } else if (plateNumber) {
      setTimeout(() => {
        handleTextSubmit();
      }, 200);
    }
    setAutoRun(false);
  }, [autoRun, file, previewUrl, plateNumber]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>License Plate Recognition</CardTitle>
          <CardDescription>
            Upload an image of a license plate or enter the plate number
            manually
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Image Upload</h3>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="mb-2"
                />
                {previewUrl && (
                  <div className="relative w-full h-48 mb-2">
                    <Image
                      src={previewUrl}
                      alt="License plate preview"
                      fill
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                )}
                <Button
                  onClick={handleImageSubmit}
                  disabled={!file || loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze Image"
                  )}
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Manual Entry</h3>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Enter license plate number"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  className="mb-2"
                />
                <Button
                  onClick={handleTextSubmit}
                  disabled={!plateNumber || loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Process Number"
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p>
                      <strong>Plate Number:</strong> {result.plate_number}
                    </p>
                    <p>
                      <strong>State:</strong> {result.state_name} (
                      {result.state_code})
                    </p>
                    {result.confidence && (
                      <p>
                        <strong>Confidence:</strong>{" "}
                        {(result.confidence * 100).toFixed(2)}%
                      </p>
                    )}
                    {result.owner && (
                      <p>
                        <strong>Owner:</strong> {result.owner}
                      </p>
                    )}
                    {result.vehicle_type && (
                      <p>
                        <strong>Vehicle Type:</strong> {result.vehicle_type}
                      </p>
                    )}
                    {result.make && (
                      <p>
                        <strong>Make:</strong> {result.make}
                      </p>
                    )}
                    {result.model && (
                      <p>
                        <strong>Model:</strong> {result.model}
                      </p>
                    )}
                    {result.year && (
                      <p>
                        <strong>Year:</strong> {result.year}
                      </p>
                    )}
                    {result.registration_valid_until && (
                      <p>
                        <strong>Registration Valid Until:</strong>{" "}
                        {result.registration_valid_until}
                      </p>
                    )}
                    {result.message && (
                      <Alert>
                        <AlertDescription>{result.message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
