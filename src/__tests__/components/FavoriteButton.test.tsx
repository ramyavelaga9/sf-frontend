import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FavoriteButton from "@/components/contacts/FavoriteButton";
import { toggleFavoriteAction } from "@/app/contacts/actions";

jest.mock("@/app/contacts/actions", () => ({
  toggleFavoriteAction: jest.fn(async () => ({})),
}));

const mockedToggle = toggleFavoriteAction as jest.MockedFunction<
  typeof toggleFavoriteAction
>;

beforeEach(() => {
  mockedToggle.mockClear();
  mockedToggle.mockResolvedValue({});
});

function renderButton(isFavorite: boolean) {
  return render(
    <FavoriteButton contactId={7} contactName="Ada Lovelace" isFavorite={isFavorite} />,
  );
}

describe("FavoriteButton", () => {
  it("favorites an unfavorited contact", async () => {
    renderButton(false);

    await userEvent.click(
      screen.getByRole("button", { name: /favorite ada lovelace/i }),
    );

    await waitFor(() => expect(mockedToggle).toHaveBeenCalledWith(7, true));
  });

  it("unfavorites an already-favorited contact", async () => {
    renderButton(true);

    await userEvent.click(
      screen.getByRole("button", { name: /unfavorite ada lovelace/i }),
    );

    await waitFor(() => expect(mockedToggle).toHaveBeenCalledWith(7, false));
  });

  it("reflects favorited state via aria-pressed", () => {
    renderButton(true);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("reflects unfavorited state via aria-pressed", () => {
    renderButton(false);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("reports a failure instead of pretending it worked", async () => {
    mockedToggle.mockResolvedValue({ error: "Contact 7 not found" });
    renderButton(false);

    await userEvent.click(
      screen.getByRole("button", { name: /favorite ada lovelace/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Contact 7 not found",
    );
  });
});
