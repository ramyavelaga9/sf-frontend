import type { CSSProperties } from "react";
import { avatarHue, initials } from "@/lib/contacts/format";
import type { Contact } from "@/lib/contacts/types";

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

/**
 * Circular contact photo when one is set; otherwise an initials bubble tinted
 * with a hue derived from the contact's email.
 */
export default function ContactAvatar({
  contact,
  size = "md",
}: {
  contact: Pick<Contact, "first_name" | "last_name" | "email" | "photo_url">;
  size?: keyof typeof SIZES;
}) {
  if (contact.photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary data URLs, not a static asset next/image can optimize
      <img
        src={contact.photo_url}
        alt=""
        aria-hidden="true"
        className={`aspect-square shrink-0 rounded-full object-cover ${SIZES[size]}`}
      />
    );
  }

  const style = {
    "--avatar-hue": avatarHue(contact.email),
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      style={style}
      className={`contact-avatar inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-semibold ${SIZES[size]}`}
    >
      {initials(contact)}
    </span>
  );
}
