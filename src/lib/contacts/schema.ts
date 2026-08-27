import { z } from "zod";
import { ADDRESS_TYPES, type ContactInput } from "./types";

/**
 * Client/server-shared validation for the contact form.
 *
 * The rules mirror the API's Pydantic models (`ContactCreate` / `ContactReplace`)
 * so the user sees a mistake before a round trip — the API stays the authority,
 * and anything it rejects anyway is surfaced by `toFieldErrors` in `./api.ts`.
 */

/** Optional text: trimmed, and blank becomes `null` (the API clears the field). */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => value || null)
    .nullable()
    .default(null);
}

function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
}

/** Mirrors the API's cap: ~1.5 MB decoded, ~2,000,000 characters base64-encoded. */
export const MAX_PHOTO_DATA_URL_LENGTH = 2_000_000;

/** Optional photo, submitted as a `data:image/...;base64,...` URL; blank clears it. */
const photoUrlSchema = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable()
  .default(null)
  .refine(
    (value) => value === null || value.startsWith("data:image/"),
    "Photo must be an image",
  )
  .refine(
    (value) => value === null || value.length <= MAX_PHOTO_DATA_URL_LENGTH,
    "Photo is too large (max ~1.5 MB)",
  );

/**
 * One source of truth for each address field's length cap, shared with the
 * native `maxLength` attributes `AddressListField` renders.
 */
export const ADDRESS_FIELD_LIMITS = {
  address: 300,
  city: 120,
  state: 120,
  postal_code: 20,
  country: 120,
} as const;

const addressInputSchema = z.object({
  type: z.enum(ADDRESS_TYPES),
  address: optionalText(ADDRESS_FIELD_LIMITS.address, "Address"),
  city: optionalText(ADDRESS_FIELD_LIMITS.city, "City"),
  state: optionalText(ADDRESS_FIELD_LIMITS.state, "State"),
  postal_code: optionalText(ADDRESS_FIELD_LIMITS.postal_code, "Postal code"),
  country: optionalText(ADDRESS_FIELD_LIMITS.country, "Country"),
});

/** True once every location field is blank — nothing worth saving. */
function isBlankAddress(address: z.infer<typeof addressInputSchema>): boolean {
  return !(address.address || address.city || address.state || address.postal_code || address.country);
}

/**
 * `formDataToValues` reassembles the list from indexed `addresses.<n>.<field>`
 * form controls into this one JSON string (see the comment there for why),
 * so this parses that string before validating it as an address array. A
 * fully blank card (type picked, nothing else filled in) is dropped rather
 * than saved as an empty address — matching the pre-multi-address behavior,
 * where "no fields filled in" simply meant "no address".
 */
const addressesSchema = z
  .string()
  .transform((value, ctx) => {
    if (!value) return [];
    try {
      return JSON.parse(value) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Addresses could not be read." });
      return z.NEVER;
    }
  })
  .pipe(z.array(addressInputSchema))
  .transform((addresses) => addresses.filter((address) => !isBlankAddress(address)));

export const contactInputSchema = z.object({
  first_name: requiredText(100, "First name"),
  last_name: requiredText(100, "Last name"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(320, "Email must be 320 characters or fewer")
    .pipe(z.email("Enter a valid email address"))
    .transform((value) => value.toLowerCase()),
  phone: optionalText(40, "Phone"),
  photo_url: photoUrlSchema,
  company: optionalText(200, "Company"),
  job_title: optionalText(200, "Job title"),
  addresses: addressesSchema,
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null),
}) satisfies z.ZodType<ContactInput, unknown>;

export type ContactFormValues = z.input<typeof contactInputSchema>;

/**
 * Collapse a ZodError into one message per field, keyed by the issue's full
 * dotted path — e.g. `addresses.0.postal_code` for a nested address issue —
 * so each has its own key instead of every address issue colliding under a
 * single top-level `addresses` message. Mirrors `toFieldErrors` in `./api.ts`.
 */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key) fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

/* ------------------------------------------------------------------ */
/* Form metadata — one source of truth for the fields and their limits */
/* ------------------------------------------------------------------ */

export interface ContactFieldSpec {
  name: keyof ContactInput;
  label: string;
  type?: "text" | "email" | "tel" | "textarea" | "photo" | "address-list";
  required?: boolean;
  /** Unused by the "photo" and "address-list" types, which render their own widget. */
  maxLength?: number;
  placeholder?: string;
  autoComplete?: string;
  /** Column span inside the section grid. */
  wide?: boolean;
}

export interface ContactFieldGroup {
  title: string;
  description: string;
  fields: ContactFieldSpec[];
}

export const CONTACT_FIELD_GROUPS: ContactFieldGroup[] = [
  {
    title: "Identity",
    description: "First name, last name, and email are required.",
    fields: [
      {
        name: "photo_url",
        label: "Photo",
        type: "photo",
        maxLength: MAX_PHOTO_DATA_URL_LENGTH,
        wide: true,
      },
      {
        name: "first_name",
        label: "First name",
        required: true,
        maxLength: 100,
        placeholder: "Ada",
        autoComplete: "given-name",
      },
      {
        name: "last_name",
        label: "Last name",
        required: true,
        maxLength: 100,
        placeholder: "Lovelace",
        autoComplete: "family-name",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        maxLength: 320,
        placeholder: "ada@example.com",
        autoComplete: "email",
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        maxLength: 40,
        placeholder: "+1-415-555-0101",
        autoComplete: "tel",
      },
    ],
  },
  {
    title: "Work",
    description: "Where they work and what they do.",
    fields: [
      {
        name: "company",
        label: "Company",
        maxLength: 200,
        placeholder: "Analytical Engines",
        autoComplete: "organization",
      },
      {
        name: "job_title",
        label: "Job title",
        maxLength: 200,
        placeholder: "Mathematician",
        autoComplete: "organization-title",
      },
    ],
  },
  {
    title: "Addresses",
    description: "Add as many as you need — each gets its own type.",
    fields: [
      {
        name: "addresses",
        label: "Addresses",
        type: "address-list",
        wide: true,
      },
    ],
  },
  {
    title: "Notes",
    description: "Anything worth remembering. No length limit.",
    fields: [
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        maxLength: 10_000,
        placeholder: "Met at the SF hackathon.",
        wide: true,
      },
    ],
  },
];

export const CONTACT_FIELDS: ContactFieldSpec[] = CONTACT_FIELD_GROUPS.flatMap(
  (group) => group.fields,
);

const ADDRESS_FIELD_PATTERN = /^addresses\.(\d+)\.(type|address|city|state|postal_code|country)$/;

/**
 * `AddressListField` renders each address's fields as real, independently
 * named controls (`addresses.<index>.<field>`) rather than one JSON blob —
 * that's what keeps them genuine "successful form controls" that submit
 * correctly even before React hydrates. This reassembles those indexed
 * entries back into the JSON string `addressesSchema` (above) expects, so
 * the rest of the validation pipeline doesn't need to know the difference.
 */
function extractAddressesJson(formData: FormData): string {
  const byIndex = new Map<number, Record<string, string>>();
  for (const [key, value] of formData.entries()) {
    const match = ADDRESS_FIELD_PATTERN.exec(key);
    if (!match) continue;
    const [, indexText, field] = match;
    const entry = byIndex.get(Number(indexText)) ?? {};
    entry[field] = String(value);
    byIndex.set(Number(indexText), entry);
  }

  const addresses = [...byIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, entry]) => entry);
  return JSON.stringify(addresses);
}

/** Pull the contact fields out of a submitted form, as raw strings. */
export function formDataToValues(
  formData: FormData,
): Record<keyof ContactInput, string> {
  const values = Object.fromEntries(
    CONTACT_FIELDS.filter((field) => field.name !== "addresses").map((field) => [
      field.name,
      String(formData.get(field.name) ?? ""),
    ]),
  ) as Record<keyof ContactInput, string>;
  values.addresses = extractAddressesJson(formData);
  return values;
}
