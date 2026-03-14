"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "@/components/toaster";

interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
}

const MAX_SIZE = 4.5 * 1024 * 1024;

export function ImageField({ value, onChange }: ImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      toast("Image must be under 4.5 MB", "error");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      const { url } = await res.json();
      onChange(url);
      setPreviewError(false);
    } catch {
      toast("Failed to upload image", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground">Image</label>
      <div className="flex gap-2 mt-1">
        <input
          type="url"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setPreviewError(false);
          }}
          placeholder="https://..."
          className="flex-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2.5 rounded-lg border bg-background text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
      {value && !previewError && (
        <img
          src={value}
          alt="Preview"
          onError={() => setPreviewError(true)}
          className="mt-3 rounded-lg max-h-48 object-cover"
        />
      )}
    </div>
  );
}
