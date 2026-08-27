"use client";

import { useId, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { ADDRESS_FIELD_LIMITS } from "@/lib/contacts/schema";
import { ADDRESS_TYPES, type AddressInput } from "@/lib/contacts/types";

const CONTROL =
  "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-primary focus:bg-input";

const BLANK_ADDRESS: AddressInput = {
  type: "Home",
  address: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
};

/** Parses the JSON default value once; malformed input just starts empty rather than crashing the form. */
function parseAddresses(raw: string): AddressInput[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AddressInput[]) : [];
  } catch {
    return [];
  }
}

type TextFieldName = Exclude<keyof AddressInput, "type">;

const TEXT_FIELDS: {
  name: TextFieldName;
  label: string;
  placeholder: string;
  autoComplete: string;
}[] = [
  { name: "address", label: "Street address", placeholder: "1 Market St, Suite 400", autoComplete: "street-address" },
  { name: "city", label: "City", placeholder: "San Francisco", autoComplete: "address-level2" },
  { name: "state", label: "State / region", placeholder: "CA", autoComplete: "address-level1" },
  { name: "postal_code", label: "Postal code", placeholder: "94105", autoComplete: "postal-code" },
  { name: "country", label: "Country", placeholder: "USA", autoComplete: "country-name" },
];

/**
 * One address's fields, all genuine named/uncontrolled form controls (the
 * same `defaultValue`-driven pattern the rest of this form uses) — not
 * `value`/`onChange` React state. That's what lets a native submit collect
 * them correctly even before React has hydrated.
 */
function AddressCard({
  namePrefix,
  initial,
  errors,
  onRemove,
}: {
  namePrefix: string;
  initial: AddressInput;
  errors: Record<string, string>;
  onRemove: () => void;
}) {
  const idPrefix = useId();

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <select
          name={`${namePrefix}.type`}
          aria-label="Address type"
          defaultValue={initial.type}
          className={`${CONTROL} w-auto`}
        >
          {ADDRESS_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove address"
          className={buttonClasses("ghost", "sm")}
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TEXT_FIELDS.map(({ name, label, placeholder, autoComplete }) => {
          const fieldName = `${namePrefix}.${name}`;
          const error = errors[fieldName];
          const inputId = `${idPrefix}-${name}`;
          const errorId = `${inputId}-error`;

          return (
            <div key={name}>
              <label htmlFor={inputId} className="mb-1 block text-[12px] text-muted-foreground">
                {label}
              </label>
              <input
                id={inputId}
                name={fieldName}
                defaultValue={initial[name] ?? ""}
                placeholder={placeholder}
                autoComplete={autoComplete}
                maxLength={ADDRESS_FIELD_LIMITS[name]}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={`${CONTROL} ${error ? "border-destructive focus:border-destructive" : "border-border"}`}
              />
              {error ? (
                <p id={errorId} role="alert" className="mt-1 text-[12px] text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Add/edit/remove a contact's addresses.
 *
 * Each address's fields are real named inputs (`<name>.<index>.<field>`),
 * not a single JSON blob — a native form submission (no JS, or before
 * hydration) collects them correctly, same as every other field in this
 * form. `formDataToValues` (`lib/contacts/schema.ts`) reassembles those
 * indexed entries back into one JSON string for the shared Zod schema.
 *
 * Cards are keyed by a stable id assigned on creation, not their array
 * index — removing a card in the middle would otherwise shift every later
 * card's index-based key, and React would reuse the wrong DOM node (and
 * drop focus) instead of removing the one the user actually deleted.
 */
export default function AddressListField({
  name,
  defaultValue,
  fieldErrors,
}: {
  name: string;
  defaultValue: string;
  fieldErrors: Record<string, string>;
}) {
  const [cards, setCards] = useState<{ id: number; initial: AddressInput }[]>(() =>
    parseAddresses(defaultValue).map((initial, index) => ({ id: index, initial })),
  );
  // Refs can't be touched during render (including a useState initializer),
  // so this is seeded from the already-computed initial state instead.
  const nextId = useRef(cards.length);

  function addAddress() {
    setCards((current) => [...current, { id: nextId.current++, initial: { ...BLANK_ADDRESS } }]);
  }

  function removeAddress(id: number) {
    setCards((current) => current.filter((card) => card.id !== id));
  }

  const listError = fieldErrors[name];

  return (
    <div className="space-y-3 sm:col-span-2">
      {cards.map((card, index) => (
        <AddressCard
          key={card.id}
          namePrefix={`${name}.${index}`}
          initial={card.initial}
          errors={fieldErrors}
          onRemove={() => removeAddress(card.id)}
        />
      ))}

      <button type="button" onClick={addAddress} className={buttonClasses("secondary", "sm")}>
        <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Add address
      </button>

      {listError ? (
        <p role="alert" className="text-[13px] text-destructive">
          {listError}
        </p>
      ) : null}
    </div>
  );
}
