import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressListField from "@/components/contacts/AddressListField";

/** Renders inside a real `<form>` so FormData reflects genuine named controls. */
function renderField(defaultValue = "[]", fieldErrors: Record<string, string> = {}) {
  const utils = render(
    <form>
      <AddressListField name="addresses" defaultValue={defaultValue} fieldErrors={fieldErrors} />
    </form>,
  );
  function formData() {
    return new FormData(utils.container.querySelector("form")!);
  }
  return { ...utils, formData };
}

describe("AddressListField", () => {
  it("starts empty and has no address cards when given none", () => {
    renderField();
    expect(screen.queryByLabelText(/address type/i)).toBeNull();
  });

  it("prefills from an existing list, as genuinely named form controls", () => {
    const { formData } = renderField(
      JSON.stringify([{ type: "Work", city: "Reno", address: null, state: null, postal_code: null, country: null }]),
    );

    // Real `name`s (not just React state) is the point: a native, pre-hydration
    // form submission has to be able to collect these too.
    expect(screen.getByLabelText(/city/i)).toHaveValue("Reno");
    expect(screen.getByLabelText(/city/i)).toHaveAttribute("name", "addresses.0.city");
    expect(screen.getByLabelText(/address type/i)).toHaveAttribute("name", "addresses.0.type");
    expect(formData().get("addresses.0.type")).toBe("Work");
    expect(formData().get("addresses.0.city")).toBe("Reno");
  });

  it("caps address inputs to the API's length limits and hints autofill", async () => {
    renderField();
    await userEvent.click(screen.getByRole("button", { name: /add address/i }));

    expect(screen.getByLabelText(/street address/i)).toHaveAttribute("maxLength", "300");
    expect(screen.getByLabelText(/postal code/i)).toHaveAttribute("maxLength", "20");
    expect(screen.getByLabelText(/street address/i)).toHaveAttribute("autoComplete", "street-address");
  });

  it("adds a blank address and lets it be edited", async () => {
    const { formData } = renderField();

    await userEvent.click(screen.getByRole("button", { name: /add address/i }));
    expect(screen.getByLabelText(/address type/i)).toHaveValue("Home");

    await userEvent.type(screen.getByLabelText(/city/i), "San Francisco");

    expect(formData().get("addresses.0.type")).toBe("Home");
    expect(formData().get("addresses.0.city")).toBe("San Francisco");
  });

  it("removes an address", async () => {
    const { formData } = renderField(
      JSON.stringify([{ type: "Home", city: "SF", address: null, state: null, postal_code: null, country: null }]),
    );

    await userEvent.click(screen.getByRole("button", { name: /remove address/i }));

    expect(screen.queryByLabelText(/address type/i)).toBeNull();
    expect(formData().get("addresses.0.city")).toBeNull();
  });

  it("keeps each address independently indexed when there's more than one", async () => {
    const { formData } = renderField();

    await userEvent.click(screen.getByRole("button", { name: /add address/i }));
    await userEvent.click(screen.getByRole("button", { name: /add address/i }));

    const [first, second] = screen.getAllByLabelText(/city/i);
    await userEvent.type(first, "San Francisco");
    await userEvent.type(second, "Reno");

    expect(formData().get("addresses.0.city")).toBe("San Francisco");
    expect(formData().get("addresses.1.city")).toBe("Reno");
  });

  it("keeps a remaining address's own data intact after removing an earlier one", async () => {
    const { formData } = renderField(
      JSON.stringify([
        { type: "Home", city: "San Francisco", address: null, state: null, postal_code: null, country: null },
        { type: "Work", city: "Reno", address: null, state: null, postal_code: null, country: null },
      ]),
    );

    // Removes the first (Home) card — a stable-id key means the second
    // (Work/Reno) card's own DOM node and data move down cleanly, rather
    // than React reusing the wrong node for it.
    const removeButtons = screen.getAllByRole("button", { name: /remove address/i });
    await userEvent.click(removeButtons[0]);

    expect(screen.getByLabelText(/address type/i)).toHaveValue("Work");
    expect(screen.getByLabelText(/city/i)).toHaveValue("Reno");
    expect(formData().get("addresses.0.city")).toBe("Reno");
  });

  it("renders a per-field error right under the specific input it belongs to", () => {
    renderField(
      JSON.stringify([{ type: "Home", city: "SF", address: null, state: null, postal_code: null, country: null }]),
      { "addresses.0.postal_code": "Postal code must be 20 characters or fewer" },
    );

    expect(screen.getByLabelText(/postal code/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Postal code must be 20 characters or fewer");
  });

  it("renders a list-level error (e.g. malformed JSON) separately from per-field errors", () => {
    renderField("[]", { addresses: "Addresses could not be read." });
    expect(screen.getByRole("alert")).toHaveTextContent("Addresses could not be read.");
  });

  it("keeps an error on the card it was actually about, not whichever card now sits at that position", async () => {
    const defaultAddresses = JSON.stringify([
      { type: "Home", city: "A", address: null, state: null, postal_code: null, country: null },
      { type: "Home", city: "B", address: null, state: null, postal_code: null, country: null },
      { type: "Home", city: "C", address: null, state: null, postal_code: null, country: null },
    ]);
    // This error is about card B (index 1) — from a submission where all
    // three cards were present.
    renderField(defaultAddresses, { "addresses.1.city": "City B is invalid" });

    const beforeRemoval = screen.getAllByLabelText(/city/i);
    expect(beforeRemoval[1]).toHaveValue("B");
    expect(beforeRemoval[1]).toHaveAttribute("aria-invalid", "true");

    // Removing card A shifts B and C down one live position each. A naive
    // fix that looks errors up by live position would now attach "City B is
    // invalid" to whichever card is at live index 1 — which is C, not B.
    await userEvent.click(screen.getAllByRole("button", { name: /remove address/i })[0]);

    const afterRemoval = screen.getAllByLabelText(/city/i);
    expect(afterRemoval[0]).toHaveValue("B");
    expect(afterRemoval[0]).toHaveAttribute("aria-invalid", "true");
    expect(afterRemoval[1]).toHaveValue("C");
    expect(afterRemoval[1]).not.toHaveAttribute("aria-invalid");
  });

  it("gives a newly-added card (added after the last submission) no stale error", async () => {
    renderField("[]", { "addresses.0.city": "Stale error from a previous submission" });

    await userEvent.click(screen.getByRole("button", { name: /add address/i }));

    expect(screen.getByLabelText(/city/i)).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
