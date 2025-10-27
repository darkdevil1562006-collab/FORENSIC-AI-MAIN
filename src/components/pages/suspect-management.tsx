"use client";

import React from "react";
import { Button } from "@/components/ui/button";
// face-api is only used in the browser; dynamic import at runtime
// We import types for TypeScript but load models at runtime when needed
import * as faceapi from "face-api.js";
import loadFaceApiModels, { tinyFaceOptions } from "@/lib/faceapi-loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function SuspectManagementPage() {
  const { toast } = useToast();
  const [suspects, setSuspects] = React.useState<any[]>([]);
  const [name, setName] = React.useState("");
  const [age, setAge] = React.useState<string>("");
  const [bloodGroup, setBloodGroup] = React.useState<string | undefined>(
    undefined
  );
  const [aliases, setAliases] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [fingerprintDataUrl, setFingerprintDataUrl] = React.useState<
    string | null
  >(null);
  const [faceDataUrl, setFaceDataUrl] = React.useState<string | null>(null);
  const [plateNumber, setPlateNumber] = React.useState<string>("");
  const [plateState, setPlateState] = React.useState<string | null>(null);
  const [plateVehicleInfo, setPlateVehicleInfo] = React.useState<any | null>(
    null
  );
  const [plateImageDataUrl, setPlateImageDataUrl] = React.useState<
    string | null
  >(null);

  const handleFileToDataUrl = (
    file?: File | null,
    cb?: (dataUrl: string | null) => void
  ) => {
    if (!file) return cb?.(null);
    const reader = new FileReader();
    reader.onload = (e) => cb?.((e.target?.result as string) || null);
    reader.readAsDataURL(file);
  };

  const compressDataUrl = async (
    dataUrl: string | null,
    maxDim = 800,
    quality = 0.75
  ) => {
    if (!dataUrl) return null;
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
      });
      const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.floor(img.width * ratio));
      const h = Math.max(1, Math.floor(img.height * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return dataUrl;
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", quality);
    } catch (err) {
      console.warn("compressDataUrl failed", err);
      return dataUrl;
    }
  };

  const handleSave = async () => {
    if (!name || name.trim() === "")
      return toast({
        title: "Missing name",
        description: "Please enter the suspect full name.",
        variant: "destructive",
      });
    const id = `SUS-${Date.now()}`;
    const ageNum = age ? Number(age) : null;

    let suspect: any = {
      id,
      name: name.trim(),
      age: ageNum,
      bloodGroup,
      aliases,
      notes,
      fingerprintDataUrl,
      faceDataUrl,
      plateNumber,
      plateState,
      plateVehicleInfo,
      plateImageDataUrl,
    };

    // If a faceDataUrl is present, attempt to compute face descriptors (original + horizontally flipped)
    if (faceDataUrl) {
      try {
        // Ensure models are available (they should be served from /models)
        await loadFaceApiModels("/models");

        const blob = await (await fetch(faceDataUrl)).blob();
        const img = await faceapi.bufferToImage(blob);
        const det = await faceapi
          .detectSingleFace(img, tinyFaceOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();
        const descriptors: number[][] = [];
        if (det && det.descriptor) {
          descriptors.push(Array.from(det.descriptor as Float32Array));
        }

        // create a mirrored image to increase robustness
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.translate(img.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0);
            const flippedBlob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob((b) => resolve(b))
            );
            if (flippedBlob) {
              const flippedImg = await faceapi.bufferToImage(flippedBlob);
              const det2 = await faceapi
                .detectSingleFace(flippedImg, tinyFaceOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();
              if (det2 && det2.descriptor)
                descriptors.push(Array.from(det2.descriptor as Float32Array));
            }
          }
        } catch (e) {
          console.warn("Failed to compute mirrored descriptor", e);
        }

        if (descriptors.length > 0) suspect.faceDescriptors = descriptors;
      } catch (err) {
        console.warn("Failed to compute face descriptor", err);
      }
    }

    const trySave = (obj: any) => {
      const raw = localStorage.getItem("suspects");
      const arr = raw ? JSON.parse(raw) : [];
      arr.unshift(obj);
      localStorage.setItem("suspects", JSON.stringify(arr));
    };

    try {
      trySave(suspect);
      toast({
        title: "Profile Saved",
        description: "Suspect profile stored locally.",
      });
      // Attempt to persist on the server as well (best-effort)
      try {
        fetch("/api/suspects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(suspect),
        })
          .then(async (r) => {
            if (!r.ok) {
              const txt = await r.text();
              console.warn("Server save failed:", txt);
              return;
            }
            const d = await r.json();
            console.info("Saved suspect to server:", d);
            toast({
              title: "Synced",
              description: "Suspect profile synced to server.",
            });
          })
          .catch((err) => console.warn("Server sync error", err));
      } catch (e) {
        console.warn("Server persistence not available", e);
      }
      // clear form
      setName("");
      setAge("");
      setBloodGroup(undefined);
      setAliases("");
      setNotes("");
      setFingerprintDataUrl(null);
      setFaceDataUrl(null);
      setPlateNumber("");
      setPlateState(null);
      setPlateVehicleInfo(null);
      setPlateImageDataUrl(null);
      // refresh suspects list
      try {
        const raw = localStorage.getItem("suspects");
        setSuspects(raw ? JSON.parse(raw) : []);
      } catch (e) {}
      return;
    } catch (err: any) {
      console.warn("Initial save failed", err);
      // If quota exceeded or storage error, attempt to compress images and retry
      const isQuota =
        err &&
        (err.name === "QuotaExceededError" ||
          err.code === 22 ||
          /quota/i.test(String(err.message || "")));
      if (!isQuota) {
        toast({
          title: "Error",
          description: "Failed to save suspect profile.",
        });
        return;
      }
    }

    // Try compressing images and retry
    try {
      toast({
        title: "Storage full",
        description: "Attempting to compress images to save profile...",
      });
      const fp = await compressDataUrl(fingerprintDataUrl, 800, 0.7);
      const face = await compressDataUrl(faceDataUrl, 800, 0.7);
      const plateImg = await compressDataUrl(plateImageDataUrl, 800, 0.7);
      suspect = {
        ...suspect,
        fingerprintDataUrl: fp,
        faceDataUrl: face,
        plateImageDataUrl: plateImg,
      };
      trySave(suspect);
      toast({
        title: "Profile Saved",
        description: "Suspect profile stored locally (images compressed).",
      });
      setName("");
      setAge("");
      setBloodGroup(undefined);
      setAliases("");
      setNotes("");
      setFingerprintDataUrl(null);
      setFaceDataUrl(null);
    } catch (err) {
      console.error("Save after compression failed", err);
      toast({
        title: "Save Failed",
        description:
          "Unable to store profile locally. Consider removing large media or using server storage.",
      });
    }
  };

  // load saved suspects on mount
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("suspects");
      if (raw) setSuspects(JSON.parse(raw));
    } catch (e) {
      console.warn("failed to load suspects", e);
    }
  }, []);

  const removeSuspect = (id: string) => {
    try {
      const raw = localStorage.getItem("suspects");
      const arr = raw ? JSON.parse(raw) : [];
      const keep = arr.filter((s: any) => s.id !== id);
      localStorage.setItem("suspects", JSON.stringify(keep));
      setSuspects(keep);
      toast({ title: "Removed", description: `Suspect ${id} removed.` });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to remove suspect",
        variant: "destructive",
      });
    }
  };

  const downloadSuspectPDF = async (suspect: any) => {
    try {
      // dynamic import to keep bundle small
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      // create a container element off-screen
      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "0";
      wrapper.style.padding = "20px";
      wrapper.style.background = "white";
      wrapper.style.color = "black";
      wrapper.style.width = "800px";

      // build HTML content
      const title = document.createElement("h2");
      title.innerText = `${suspect.name} (${suspect.id})`;
      title.style.margin = "0 0 8px 0";
      wrapper.appendChild(title);

      const details = document.createElement("div");
      details.innerHTML = `
        <div><strong>Age:</strong> ${suspect.age ?? ""}</div>
        <div><strong>Blood Group:</strong> ${suspect.bloodGroup ?? ""}</div>
        <div><strong>Aliases:</strong> ${suspect.aliases ?? ""}</div>
        <div><strong>Notes:</strong> ${suspect.notes ?? ""}</div>
        <div><strong>Plate:</strong> ${suspect.plateNumber ?? ""}</div>
      `;
      details.style.marginBottom = "12px";
      wrapper.appendChild(details);

      const imagesRow = document.createElement("div");
      imagesRow.style.display = "flex";
      imagesRow.style.gap = "12px";

      const addImg = (src: string | null, label: string) => {
        const c = document.createElement("div");
        c.style.flex = "1";
        const lbl = document.createElement("div");
        lbl.innerText = label;
        lbl.style.fontWeight = "600";
        lbl.style.marginBottom = "6px";
        c.appendChild(lbl);
        if (src) {
          const im = document.createElement("img");
          im.src = src;
          im.style.maxWidth = "100%";
          im.style.height = "auto";
          im.style.display = "block";
          im.style.border = "1px solid #ddd";
          c.appendChild(im);
        } else {
          const p = document.createElement("div");
          p.innerText = "No image";
          p.style.height = "120px";
          p.style.display = "flex";
          p.style.alignItems = "center";
          p.style.justifyContent = "center";
          p.style.background = "#f7f7f7";
          c.appendChild(p);
        }
        imagesRow.appendChild(c);
      };

      addImg(suspect.faceDataUrl || null, "Photo");
      addImg(suspect.fingerprintDataUrl || null, "Fingerprint");
      addImg(suspect.plateImageDataUrl || null, "Number Plate");

      wrapper.appendChild(imagesRow);
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(wrapper, { scale: 2 });
      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const pdf = new jsPDF({
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
      const filename = `${suspect.id}_${(suspect.name || "suspect").replace(
        /\s+/g,
        "_"
      )}.pdf`;
      pdf.save(filename);

      // cleanup
      document.body.removeChild(wrapper);
      toast({ title: "Downloaded", description: `PDF saved: ${filename}` });
    } catch (e) {
      console.error("PDF generation failed", e);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const analyzePlateByText = async (text?: string) => {
    const plate = (text ?? plateNumber ?? "").trim();
    if (!plate)
      return toast({
        title: "No plate",
        description: "Enter a plate number to lookup.",
      });
    try {
      const res = await fetch("/api/license-plate/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate_number: plate }),
      });
      if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
      const data = await res.json();
      setPlateVehicleInfo(data);
      setPlateState(data.state_code || data.state_name || null);
      setPlateNumber(data.plate_number || plate);
      toast({
        title: "Lookup complete",
        description: data.message || "Plate lookup returned results.",
      });
      return data;
    } catch (err: any) {
      console.error("Plate lookup failed", err);
      toast({ title: "Lookup failed", description: String(err) });
    }
  };

  const analyzePlateImage = async (file?: File | null) => {
    if (!file && !plateImageDataUrl)
      return toast({
        title: "No image",
        description: "Upload a plate image to analyze.",
      });
    try {
      const form = new FormData();
      if (file) form.append("file", file);
      else {
        // convert data url to blob
        const resp = await fetch(plateImageDataUrl as string);
        const blob = await resp.blob();
        form.append("file", blob, "plate.jpg");
      }
      const res = await fetch("/api/license-plate/image", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `status ${res.status}`);
      }
      const data = await res.json();
      setPlateVehicleInfo(data);
      setPlateState(data.state_code || data.state_name || null);
      setPlateNumber(data.plate_number || plateNumber);
      toast({
        title: "Image analysis complete",
        description: data.message || "Plate image analyzed.",
      });
      return data;
    } catch (err: any) {
      console.error("Plate image analysis failed", err);
      toast({ title: "Analysis failed", description: String(err) });
    }
  };
  const bloodGroups = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

  return (
    <>
      <div className="space-y-4 mb-8">
        <h1 className="font-headline text-3xl font-bold">
          Suspect Profile Management
        </h1>
        <p className="text-muted-foreground">
          Create and manage suspect profiles.
        </p>
      </div>
      <Card className="glass-card max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Suspect Profile</CardTitle>
          <CardDescription>
            Fill out the form to add a new suspect to the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold font-headline">
              Biographical Data
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="35"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blood-group">Blood Group</Label>
                <Select
                  value={bloodGroup}
                  onValueChange={(v) => setBloodGroup(v)}
                >
                  <SelectTrigger id="blood-group">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Label htmlFor="aliases">Known Aliases</Label>
              <Input
                id="aliases"
                placeholder="Johnny, The Shadow, etc."
                value={aliases}
                onChange={(e) => setAliases(e.target.value)}
              />
            </div>
            <div className="space-y-2 pt-2">
              <Label htmlFor="notes">Analyst Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any relevant notes about the suspect..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="plate-number">License Plate Number</Label>
              <div className="flex gap-2">
                <Input
                  id="plate-number"
                  placeholder="TN01AB1234"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                />
                <Button
                  onClick={() => analyzePlateByText()}
                  className="shrink-0"
                >
                  Lookup
                </Button>
              </div>
              {plateState && (
                <p className="text-sm text-muted-foreground mt-1">
                  State: <strong>{plateState}</strong>
                </p>
              )}
              {plateVehicleInfo && plateVehicleInfo.plate_number && (
                <div className="mt-2 text-sm bg-muted rounded-md p-2">
                  <div>
                    <strong>Plate:</strong> {plateVehicleInfo.plate_number}
                  </div>
                  <div>
                    <strong>Owner:</strong>{" "}
                    {plateVehicleInfo.owner || plateVehicleInfo.message}
                  </div>
                  {plateVehicleInfo.vehicle_type && (
                    <div>
                      <strong>Vehicle:</strong> {plateVehicleInfo.vehicle_type}{" "}
                      {plateVehicleInfo.make || ""}{" "}
                      {plateVehicleInfo.model || ""}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h3 className="text-lg font-semibold font-headline">
              Biometric & Evidence Upload
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fingerprint-upload">Fingerprint Image</Label>
                <Input
                  id="fingerprint-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleFileToDataUrl(
                      e.target.files?.[0] || null,
                      setFingerprintDataUrl
                    )
                  }
                />
                {fingerprintDataUrl && (
                  <img
                    src={fingerprintDataUrl}
                    alt="fp-preview"
                    className="mt-2 h-24 object-contain"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="face-upload">Face Photo</Label>
                <Input
                  id="face-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleFileToDataUrl(
                      e.target.files?.[0] || null,
                      setFaceDataUrl
                    )
                  }
                />
                {faceDataUrl && (
                  <img
                    src={faceDataUrl}
                    alt="face-preview"
                    className="mt-2 h-24 object-contain rounded-md"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="plate-image-upload">License Plate Image</Label>
                <Input
                  id="plate-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    handleFileToDataUrl(f, setPlateImageDataUrl);
                    if (f) analyzePlateImage(f);
                  }}
                />
                {plateImageDataUrl && (
                  <img
                    src={plateImageDataUrl}
                    alt="plate-preview"
                    className="mt-2 h-24 object-contain rounded-md"
                  />
                )}
                <div className="flex gap-2 mt-2">
                  <Button onClick={() => analyzePlateImage(null)}>
                    Analyze Plate Image
                  </Button>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={() => {
                      if (!plateImageDataUrl) {
                        toast({
                          title: "No plate image",
                          description: "Upload or select a plate image first",
                          variant: "destructive",
                        });
                        return;
                      }
                      try {
                        sessionStorage.setItem(
                          "advancedPlateImage",
                          plateImageDataUrl as string
                        );
                        // clear any text
                        sessionStorage.removeItem("advancedPlateText");
                        // navigate to advanced tools
                        window.location.href = "/advanced-tools";
                      } catch (e) {
                        console.error(e);
                        toast({
                          title: "Error",
                          description: "Failed to launch advanced tools",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Analyze in Advanced Tools (Image)
                  </Button>
                  <Button
                    onClick={() => {
                      if (!plateNumber) {
                        toast({
                          title: "No plate number",
                          description: "Enter or extract a plate number first",
                          variant: "destructive",
                        });
                        return;
                      }
                      try {
                        sessionStorage.setItem(
                          "advancedPlateText",
                          plateNumber
                        );
                        sessionStorage.removeItem("advancedPlateImage");
                        window.location.href = "/advanced-tools";
                      } catch (e) {
                        console.error(e);
                        toast({
                          title: "Error",
                          description: "Failed to launch advanced tools",
                          variant: "destructive",
                        });
                      }
                    }}
                    variant="outline"
                  >
                    Analyze in Advanced Tools (Text)
                  </Button>
                </div>
                {plateVehicleInfo && (
                  <div className="mt-2 text-sm bg-muted rounded-md p-2">
                    <div>
                      <strong>Plate:</strong> {plateVehicleInfo.plate_number}
                    </div>
                    <div>
                      <strong>Owner:</strong>{" "}
                      {plateVehicleInfo.owner || plateVehicleInfo.message}
                    </div>
                    {plateVehicleInfo.vehicle_type && (
                      <div>
                        <strong>Vehicle:</strong>{" "}
                        {plateVehicleInfo.vehicle_type}{" "}
                        {plateVehicleInfo.make || ""}{" "}
                        {plateVehicleInfo.model || ""}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Voice samples removed */}
            </div>
            <p className="text-xs text-muted-foreground">
              Uploaded media files will be stored securely. Image EXIF data will
              be extracted automatically.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full sm:w-auto ml-auto neon-glow-button"
            onClick={handleSave}
          >
            Save Suspect Profile
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
