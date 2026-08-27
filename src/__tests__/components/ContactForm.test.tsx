import React, { act } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "@/components/contacts/ContactForm";
import { makeContact } from "../mocks/handlers";
import type { FormState } from "@/lib/contacts/types";

/** A `FileReader` stand-in whose `readAsDataURL` never resolves on its own — the
 * test drives `onload` manually, so it can inspect state mid-read. */
class ManualFileReader {
  static instances: ManualFileReader[] = [];
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | null = null;

  readAsDataURL() {
    ManualFileReader.instances.push(this);
  }
}

function renderForm(action: jest.Mock, contact?: ReturnType<typeof makeContact>) {
  return render(
    <ContactForm
      action={action as never}
      contact={contact}
      submitLabel="Create contact"
      cancelHref="/contacts"
    />,
  );
}

describe("ContactForm", () => {
  it("renders every editable field", () => {
    renderForm(jest.fn());

    expect(screen.getByLabelText(/first name/i)).toBeRequired();
    expect(screen.getByLabelText(/last name/i)).toBeRequired();
    expect(screen.getByLabelText(/^email/i)).toBeRequired();
    expect(screen.getByLabelText(/phone/i)).not.toBeRequired();
    expect(screen.getByLabelText(/notes/i).tagName).toBe("TEXTAREA");
  });

  it("prefills from an existing contact", () => {
    renderForm(jest.fn(), makeContact());

    expect(screen.getByLabelText(/first name/i)).toHaveValue("Ada");
    expect(screen.getByLabelText(/^email/i)).toHaveValue("ada@example.com");
    // Nulls become empty inputs rather than the string "null".
    expect(screen.getByLabelText(/street address/i)).toHaveValue("");
  });

  it("disables submit while a picked photo is still being read", async () => {
    // A submit that races ahead of the FileReader would send the hidden
    // field's old value and silently drop the newly picked photo.
    const OriginalFileReader = global.FileReader;
    // @ts-expect-error -- swapping in a controllable stand-in for this test only
    global.FileReader = ManualFileReader;
    ManualFileReader.instances = [];

    try {
      const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
        async () => ({ status: "idle" }),
      );
      renderForm(action);
      const submitButton = screen.getByRole("button", { name: /create contact/i });
      expect(submitButton).not.toBeDisabled();

      const file = new File(["hello"], "avatar.png", { type: "image/png" });
      await userEvent.upload(screen.getByLabelText(/choose photo/i), file);
      expect(submitButton).toBeDisabled();

      const reader = ManualFileReader.instances.at(-1)!;
      reader.result = "data:image/png;base64,aGVsbG8=";
      await act(async () => reader.onload?.());

      expect(submitButton).not.toBeDisabled();
    } finally {
      global.FileReader = OriginalFileReader;
    }
  });

  it("carries the existing photo forward when editing without touching it", async () => {
    // PUT is a full replace: if this hidden field weren't pre-filled from the
    // contact, saving any other edit would silently wipe the photo.
    const photo = "data:image/png;base64,aGVsbG8=";
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    const { container } = renderForm(
      action,
      makeContact({ photo_url: photo }),
    );

    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));
    await waitFor(() => expect(action).toHaveBeenCalled());

    const hiddenInput = container.querySelector('input[name="photo_url"]');
    expect(hiddenInput).toHaveValue(photo);
    expect(action.mock.calls[0][1].get("photo_url")).toBe(photo);
  });

  it("submits the entered values to the action", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action);

    await userEvent.type(screen.getByLabelText(/first name/i), "Grace");
    await userEvent.type(screen.getByLabelText(/last name/i), "Hopper");
    await userEvent.type(screen.getByLabelText(/^email/i), "grace@example.com");
    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));

    await waitFor(() => expect(action).toHaveBeenCalled());

    const formData = action.mock.calls[0][1];
    expect(formData.get("first_name")).toBe("Grace");
    expect(formData.get("email")).toBe("grace@example.com");
  });

  it("shows the summary and the per-field errors the action returns", async () => {
    const action = jest.fn(
      async (): Promise<FormState> => ({
        status: "error",
        message: "That email address is already taken.",
        fieldErrors: { email: "This email is already in use." },
        values: { first_name: "Grace" },
      }),
    );
    renderForm(action);

    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.map((node) => node.textContent)).toEqual(
      expect.arrayContaining([
        "That email address is already taken.",
        "This email is already in use.",
      ]),
    );
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("links back out without submitting", () => {
    renderForm(jest.fn());
    expect(screen.getByRole("link", { name: /cancel/i })).toHaveAttribute(
      "href",
      "/contacts",
    );
  });
});
