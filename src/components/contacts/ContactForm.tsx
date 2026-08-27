"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import Field from "@/components/ui/Field";
import ContactPhotoField from "@/components/contacts/ContactPhotoField";
import AddressListField from "@/components/contacts/AddressListField";
import Button, { buttonClasses } from "@/components/ui/Button";
import { CONTACT_FIELD_GROUPS } from "@/lib/contacts/schema";
import {
  EMPTY_FORM_STATE,
  type Contact,
  type ContactInput,
  type FormState,
} from "@/lib/contacts/types";

export type ContactFormAction = (
  state: FormState,
  formData: FormData,
) => Promise<FormState>;

function SubmitButton({
  label,
  disabled,
}: {
  label: string;
  /** True while a photo is still being read, so a fresh selection can't be lost to an early submit. */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? "Saving…" : label}
    </Button>
  );
}

/**
 * Create/edit form. The field list comes from `CONTACT_FIELD_GROUPS`, and the
 * action is a bound server action — so a submit is a plain POST that works
 * before hydration and reports errors through `useActionState`.
 */
export default function ContactForm({
  action,
  contact,
  submitLabel,
  cancelHref,
}: {
  action: ContactFormAction;
  contact?: Contact;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  // True while a photo file is being read, so a submit can't race ahead of it
  // and send the hidden field's old value.
  const [photoPending, setPhotoPending] = useState(false);

  function valueFor(name: keyof ContactInput): string {
    // `addresses` isn't a plain string field (see `addressesDefault` below),
    // so anything non-string here just falls back to empty — it's never
    // actually rendered through this path.
    const value = state.values?.[name] ?? contact?.[name] ?? "";
    return typeof value === "string" ? value : "";
  }

  // `addresses` is an array, not a string — AddressListField manages it as
  // JSON, so the fallback chain has to build that JSON itself rather than
  // relying on `valueFor`'s plain string coercion.
  const addressesDefault =
    state.values?.addresses ?? JSON.stringify(contact?.addresses ?? []);

  return (
    <form action={formAction} noValidate className="space-y-8">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-foreground"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{state.message}</span>
        </div>
      ) : null}

      {CONTACT_FIELD_GROUPS.map((group) => (
        <fieldset key={group.title} className="space-y-4">
          <legend className="sr-only">{group.title}</legend>

          <div className="border-b border-hairline pb-2">
            <h2 className="font-display text-sm font-semibold text-foreground">
              {group.title}
            </h2>
            <p className="text-[13px] text-muted-foreground">
              {group.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => {
              if (field.type === "photo") {
                return (
                  <ContactPhotoField
                    key={field.name}
                    name={field.name}
                    label={field.label}
                    defaultValue={valueFor(field.name)}
                    error={state.fieldErrors?.[field.name]}
                    onPendingChange={setPhotoPending}
                  />
                );
              }
              if (field.type === "address-list") {
                return (
                  <AddressListField
                    key={field.name}
                    name={field.name}
                    defaultValue={addressesDefault}
                    error={state.fieldErrors?.[field.name]}
                  />
                );
              }
              return (
                <Field
                  key={field.name}
                  field={field}
                  defaultValue={valueFor(field.name)}
                  error={state.fieldErrors?.[field.name]}
                />
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <SubmitButton label={submitLabel} disabled={photoPending} />
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
