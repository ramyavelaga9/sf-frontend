"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleFavoriteAction } from "@/app/contacts/actions";
import Button, { type ButtonSize, type ButtonVariant } from "@/components/ui/Button";

/**
 * Favorite/unfavorite toggle. Calls the server action directly, with no
 * local optimistic state — same pattern as `DeleteContactButton` — and lets
 * the resulting revalidation refresh `is_favorite`, which also reorders the
 * contact in the list.
 */
export default function FavoriteButton({
  contactId,
  contactName,
  isFavorite,
  variant = "ghost",
  size = "sm",
  withLabel = false,
}: {
  contactId: number;
  contactName: string;
  isFavorite: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  withLabel?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = await toggleFavoriteAction(contactId, !isFavorite);
      if (result.error) setError(result.error);
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={toggle}
        disabled={isPending}
        aria-label={`${isFavorite ? "Unfavorite" : "Favorite"} ${contactName}`}
        aria-pressed={isFavorite}
        className={
          isFavorite
            ? "text-amber-500 hover:text-amber-600"
            : variant === "ghost"
              ? "hover:text-amber-500"
              : undefined
        }
      >
        <Star
          className="h-4 w-4"
          strokeWidth={1.75}
          fill={isFavorite ? "currentColor" : "none"}
          aria-hidden="true"
        />
        {withLabel ? (isFavorite ? "Favorited" : "Favorite") : null}
      </Button>
      {error ? (
        <span role="alert" className="text-[13px] text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
