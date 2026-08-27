"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { X } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { MAX_PHOTO_DATA_URL_LENGTH } from "@/lib/contacts/schema";

/**
 * Reads an image file into a base64 data URL, rejecting non-images and
 * anything that would exceed the schema's limit.
 *
 * The size check happens on the *encoded* result, not the raw file: the
 * schema's cap covers the whole `data:image/...;base64,<payload>` string
 * (prefix included), and base64 inflates the payload by ~4/3, so estimating
 * from `file.size` alone would let some files through that the server then
 * rejects.
 */
function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      if (dataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
        reject(new Error("That image is too large (max ~1.5 MB)."));
        return;
      }
      resolve(dataUrl);
    };
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
  onPendingChange,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  error?: string;
  /** Notified while a file is being read, so the form can hold off on submitting. */
  onPendingChange?: (pending: boolean) => void;
}) {
  const inputId = useId();
  const [photo, setPhoto] = useState<string | null>(defaultValue || null);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError ?? externalError;

  // Guards against a stale read: picking a second file (or hitting Remove)
  // before the first `FileReader` finishes must not let that earlier result
  // land after the fact and overwrite the user's later choice.
  const selectionRef = useRef(0);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file after an error
    if (!file) return;

    const selection = ++selectionRef.current;
    onPendingChange?.(true);
    try {
      const dataUrl = await readImageFile(file);
      if (selection !== selectionRef.current) return; // superseded
      setPhoto(dataUrl);
      setLocalError(null);
    } catch (cause) {
      if (selection !== selectionRef.current) return;
      setLocalError(
        cause instanceof Error ? cause.message : "Could not read that file.",
      );
    } finally {
      // Only the most recent read gets to clear the pending flag — an older,
      // superseded read finishing late must not mark a newer one as done.
      if (selection === selectionRef.current) onPendingChange?.(false);
    }
  }

  function handleRemove() {
    selectionRef.current += 1; // invalidate any read still in flight
    setPhoto(null);
    setLocalError(null);
    onPendingChange?.(false);
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
