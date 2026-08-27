"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { ADDRESS_TYPES, type AddressInput, type AddressType } from "@/lib/contacts/types";

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

const TEXT_FIELDS: { name: TextFieldName; label: string; placeholder: string }[] = [
  { name: "address", label: "Street address", placeholder: "1 Market St, Suite 400" },
  { name: "city", label: "City", placeholder: "San Francisco" },
  { name: "state", label: "State / region", placeholder: "CA" },
  { name: "postal_code", label: "Postal code", placeholder: "94105" },
  { name: "country", label: "Country", placeholder: "USA" },
];

function AddressCard({
  address,
  onChange,
  onRemove,
}: {
  address: AddressInput;
  onChange: (patch: Partial<AddressInput>) => void;
  onRemove: () => void;
}) {
  const idPrefix = useId();

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <select
          aria-label="Address type"
          value={address.type}
          onChange={(event) => onChange({ type: event.target.value as AddressType })}
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
        {TEXT_FIELDS.map(({ name, label, placeholder }) => (
          <div key={name}>
            <label
              htmlFor={`${idPrefix}-${name}`}
              className="mb-1 block text-[12px] text-muted-foreground"
            >
              {label}
            </label>
            <input
              id={`${idPrefix}-${name}`}
              value={address[name] ?? ""}
              placeholder={placeholder}
              onChange={(event) => onChange({ [name]: event.target.value || null })}
              className={CONTROL}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Add/edit/remove a contact's addresses. There's no native form encoding for
 * an array of objects, so the list is kept as client-side array state and
 * serialized into a single hidden `addresses` input as JSON — the same
 * pattern `ContactPhotoField` uses — so it rides the existing
 * `FormData` -> schema pipeline unchanged.
 */
export default function AddressListField({
  name,
  defaultValue,
  error,
}: {
  name: string;
  defaultValue: string;
  error?: string;
}) {
  const [addresses, setAddresses] = useState<AddressInput[]>(() => parseAddresses(defaultValue));

  function updateAddress(index: number, patch: Partial<AddressInput>) {
    setAddresses((current) =>
      current.map((address, i) => (i === index ? { ...address, ...patch } : address)),
    );
  }

  function addAddress() {
    setAddresses((current) => [...current, { ...BLANK_ADDRESS }]);
  }

  function removeAddress(index: number) {
    setAddresses((current) => current.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <input type="hidden" name={name} value={JSON.stringify(addresses)} />

      {addresses.map((address, index) => (
        <AddressCard
          key={index}
          address={address}
          onChange={(patch) => updateAddress(index, patch)}
          onRemove={() => removeAddress(index)}
        />
      ))}

      <button type="button" onClick={addAddress} className={buttonClasses("secondary", "sm")}>
        <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Add address
      </button>

      {error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
