import React from "react";
import { render, screen } from "@testing-library/react";
import ContactAvatar from "@/components/contacts/ContactAvatar";
import { makeContact } from "../mocks/handlers";

// The avatar is decorative (the contact's name is always rendered as text
// alongside it) — `alt=""` drops its ARIA role to "presentation", so it's
// queried as a plain element rather than by role.
describe("ContactAvatar", () => {
  it("falls back to initials when there is no photo", () => {
    const { container } = render(
      <ContactAvatar contact={makeContact({ photo_url: null })} />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("renders a circular photo when one is set", () => {
    const photo = "data:image/png;base64,aGVsbG8=";
    const { container } = render(
      <ContactAvatar contact={makeContact({ photo_url: photo })} />,
    );

    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", photo);
    expect(img?.className).toContain("rounded-full");
    expect(img?.className).toContain("object-cover");
    expect(screen.queryByText("AL")).toBeNull();
  });
});
