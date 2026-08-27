"use client";

import { useId, useState, type ChangeEvent } from "react";
import { X } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { MAX_PHOTO_DATA_URL_LENGTH } from "@/lib/contacts/schema";

// Base64 inflates size by ~4/3, so cap the raw file below the API's encoded limit.
const MAX_FILE_BYTES = Math.floor((MAX_PHOTO_DATA_URL_LENGTH * 3) / 4);

/** Reads an image file into a base64 data URL, rejecting non-images and oversized files. */
function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error("That image is too large (max ~1.5 MB)."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Photo upload for the contact form. Converts the chosen file to a base64 data
 * URL in the browser and stows it in a hidden input, so it rides the same
 * `FormData` -> server action pipeline as every other field — no upload
 * endpoint needed.
 */
export default function ContactPhotoField({
  name,
  label,
  defaultValue,
  error: externalError,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  error?: string;
}) {
  const inputId = useId();
  const [photo, setPhoto] = useState<string | null>(defaultValue || null);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError ?? externalError;

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file after an error
    if (!file) return;

    try {
      setPhoto(await readImageFile(file));
      setLocalError(null);
    } catch (cause) {
      setLocalError(
        cause instanceof Error ? cause.message : "Could not read that file.",
      );
    }
  }

  function handleRemove() {
    setPhoto(null);
    setLocalError(null);
  }

  return (
    <div className="sm:col-span-2">
      <label className="mb-1.5 block text-[13px] font-medium text-foreground">
        {label}
        <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
          optional
        </span>
      </label>

      <input type="hidden" name={name} value={photo ?? ""} />

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-secondary/40"
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- previewing a client-side data URL, not a static asset
            <img
              src={photo}
              alt=""
              className="aspect-square h-full w-full rounded-full object-cover"
            />
          ) : null}
        </span>

        <label
          htmlFor={inputId}
          className={buttonClasses("secondary", "sm", "cursor-pointer")}
        >
          Choose photo
          <input
            id={inputId}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="sr-only"
          />
        </label>

        {photo ? (
          <button
            type="button"
            onClick={handleRemove}
            className={buttonClasses("ghost", "sm")}
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Remove
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-1.5 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
