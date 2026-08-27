import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactPhotoField from "@/components/contacts/ContactPhotoField";

function renderField() {
  return render(<ContactPhotoField name="photo_url" label="Photo" />);
}

// The preview `<img>` is decorative (`alt=""`), which drops its ARIA role to
// "presentation", so it's queried as a plain element rather than by role.
describe("ContactPhotoField", () => {
  it("previews the photo and fills the hidden field once one is chosen", async () => {
    const { container } = renderField();
    const file = new File(["hello"], "avatar.png", { type: "image/png" });

    await userEvent.upload(screen.getByLabelText(/choose photo/i), file);

    await waitFor(() => {
      const hiddenInput = container.querySelector<HTMLInputElement>(
        'input[name="photo_url"]',
      );
      expect(hiddenInput?.value).toContain("data:image/png;base64,");
    });
    expect(container.querySelector("img")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("rejects a file that is not an image", async () => {
    // The input's `accept="image/*"` already steers a real file picker, but a
    // user can bypass it (drag-and-drop, "all files"), so the component must
    // reject it too — simulate that bypass by skipping user-event's own
    // accept-attribute filtering.
    const user = userEvent.setup({ applyAccept: false });
    const { container } = renderField();
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });

    await user.upload(screen.getByLabelText(/choose photo/i), file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please choose an image file.",
    );
    const hiddenInput = container.querySelector('input[name="photo_url"]');
    expect(hiddenInput).toHaveValue("");
  });

  it("clears the photo when removed", async () => {
    const { container } = renderField();
    const file = new File(["hello"], "avatar.png", { type: "image/png" });

    await userEvent.upload(screen.getByLabelText(/choose photo/i), file);
    await waitFor(() =>
      expect(container.querySelector("img")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(container.querySelector("img")).toBeNull();
    const hiddenInput = container.querySelector('input[name="photo_url"]');
    expect(hiddenInput).toHaveValue("");
  });
});
