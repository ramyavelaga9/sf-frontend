import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressListField from "@/components/contacts/AddressListField";

function renderField(defaultValue = "[]") {
  return render(<AddressListField name="addresses" defaultValue={defaultValue} />);
}

function hiddenValue(container: HTMLElement): unknown {
  const input = container.querySelector<HTMLInputElement>('input[name="addresses"]');
  return input ? JSON.parse(input.value) : undefined;
}

describe("AddressListField", () => {
  it("starts empty and has no address cards when given none", () => {
    const { container } = renderField();
    expect(hiddenValue(container)).toEqual([]);
    expect(screen.queryByLabelText(/address type/i)).toBeNull();
  });

  it("prefills from an existing list of addresses", () => {
    const { container } = renderField(
      JSON.stringify([{ type: "Work", city: "Reno", address: null, state: null, postal_code: null, country: null }]),
    );

    expect(hiddenValue(container)).toEqual([
      { type: "Work", city: "Reno", address: null, state: null, postal_code: null, country: null },
    ]);
    expect(screen.getByLabelText(/city/i)).toHaveValue("Reno");
  });

  it("adds a blank address and lets it be edited", async () => {
    const { container } = renderField();

    await userEvent.click(screen.getByRole("button", { name: /add address/i }));
    expect(screen.getByLabelText(/address type/i)).toHaveValue("Home");

    await userEvent.type(screen.getByLabelText(/city/i), "San Francisco");

    expect(hiddenValue(container)).toMatchObject([{ type: "Home", city: "San Francisco" }]);
  });

  it("removes an address", async () => {
    const { container } = renderField(
      JSON.stringify([{ type: "Home", city: "SF", address: null, state: null, postal_code: null, country: null }]),
    );

    await userEvent.click(screen.getByRole("button", { name: /remove address/i }));

    expect(hiddenValue(container)).toEqual([]);
    expect(screen.queryByLabelText(/address type/i)).toBeNull();
  });

  it("supports more than one address at once", async () => {
    const { container } = renderField();

    await userEvent.click(screen.getByRole("button", { name: /add address/i }));
    await userEvent.click(screen.getByRole("button", { name: /add address/i }));

    expect(screen.getAllByLabelText(/address type/i)).toHaveLength(2);
    expect(hiddenValue(container)).toHaveLength(2);
  });
});
