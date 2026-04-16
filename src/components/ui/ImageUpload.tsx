"use client";

import * as React from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImageUploadProps {
  value?: File | string | null;
  onChange: (file: File | null) => void;
  onError?: (message: string) => void;
  accept?: string;
  maxSizeMb?: number;
  label?: string;
  error?: string;
  helper?: string;
  chooseLabel?: string;
  dropLabel?: string;
  className?: string;
}

function isFile(v: File | string | null | undefined): v is File {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as File).name === "string" &&
    typeof (v as File).size === "number"
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function ImageUpload({
  value,
  onChange,
  onError,
  accept = "image/jpeg,image/png",
  maxSizeMb = 5,
  label,
  error,
  helper,
  chooseLabel = "Choisir une image",
  dropLabel = "Glissez une image ou cliquez pour parcourir",
  className,
}: ImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isFile(value)) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (typeof value === "string" && value) {
      setPreviewUrl(value);
      return;
    }
    setPreviewUrl(null);
  }, [value]);

  const validate = (file: File): boolean => {
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      onError?.("Format invalide. Utilisez JPG ou PNG.");
      return false;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      onError?.(`Image trop lourde. Maximum ${maxSizeMb} Mo.`);
      return false;
    }
    return true;
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!validate(file)) return;
    onChange(file);
  };

  const fileName = isFile(value) ? value.name : null;
  const fileSize = isFile(value) ? formatSize(value.size) : null;
  const generatedId = React.useId();
  const inputId = `image-upload-${generatedId}`;
  const helperId = helper || error ? `${inputId}-helper` : undefined;

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-primary"
        >
          {label}
        </label>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          dragOver
            ? "border-primary bg-pink/30"
            : error
              ? "border-red-500 bg-background"
              : "border-border bg-muted/40 hover:border-primary/50",
        )}
      >
        {previewUrl ? (
          <div className="flex w-full flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Aperçu"
              className="max-h-40 w-auto rounded-lg object-contain"
            />
            {fileName ? (
              <p className="text-xs text-muted-foreground">
                {fileName}
                {fileSize ? ` · ${fileSize}` : ""}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Supprimer l'image"
            >
              <X size={16} />
              Supprimer
            </button>
          </div>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink text-primary">
              <ImageIcon size={22} />
            </div>
            <p className="text-sm text-muted-foreground">{dropLabel}</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-primary bg-background px-4 py-2 text-sm font-semibold text-primary hover:bg-pink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Upload size={16} />
              {chooseLabel}
            </button>
          </>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
          aria-label={label || chooseLabel}
          aria-describedby={helperId}
          aria-invalid={error ? true : undefined}
        />
      </div>

      {error ? (
        <p id={helperId} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
