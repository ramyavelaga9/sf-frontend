import {
  CONTACT_FIELDS,
  contactInputSchema,
  formDataToValues,
  zodFieldErrors,
} from "@/lib/contacts/schema";

function values(overrides: Record<string, string> = {}) {
  return {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "Ada@Example.com",
    phone: "",
    photo_url: "",
    company: "",
    job_title: "",
    addresses: "[]",
    notes: "",
    ...overrides,
  };
}

describe("contactInputSchema", () => {
  it("lowercases the email and nulls out the blanks", () => {
    const parsed = contactInputSchema.parse(values());

    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.phone).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("trims what the user typed", () => {
    expect(contactInputSchema.parse(values({ company: "  Acme  " })).company).toBe(
      "Acme",
    );
  });

  it("requires the three fields the API requires", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: " ", last_name: "", email: "" }),
    );

    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name is required",
      last_name: "Last name is required",
      email: "Email is required",
    });
  });

  it("rejects a malformed email", () => {
    const result = contactInputSchema.safeParse(values({ email: "not-an-email" }));
    expect(zodFieldErrors(result.error!).email).toBe("Enter a valid email address");
  });

  it("accepts a photo as a data URL and blanks it out to null", () => {
    expect(contactInputSchema.parse(values()).photo_url).toBeNull();

    const photo = "data:image/png;base64,aGVsbG8=";
    expect(contactInputSchema.parse(values({ photo_url: photo })).photo_url).toBe(
      photo,
    );
  });

  it("rejects a photo that is not a data URL", () => {
    const result = contactInputSchema.safeParse(
      values({ photo_url: "not-a-photo" }),
    );
    expect(zodFieldErrors(result.error!).photo_url).toBe("Photo must be an image");
  });

  it("rejects a photo over the size limit", () => {
    const oversized = "data:image/png;base64," + "a".repeat(2_000_000);
    const result = contactInputSchema.safeParse(
      values({ photo_url: oversized }),
    );
    expect(zodFieldErrors(result.error!).photo_url).toBe(
      "Photo is too large (max ~1.5 MB)",
    );
  });

  it("enforces the API's length limits", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: "a".repeat(101) }),
    );

    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name must be 100 characters or fewer",
    });
  });

  it("parses a JSON addresses list into structured objects", () => {
    const addresses = JSON.stringify([
      { type: "Home", city: "San Francisco", state: "CA" },
      { type: "Work", city: "New York" },
    ]);

    const parsed = contactInputSchema.parse(values({ addresses })).addresses;

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ type: "Home", city: "San Francisco" });
    expect(parsed[1]).toMatchObject({ type: "Work", city: "New York" });
  });

  it("rejects addresses that aren't valid JSON", () => {
    const result = contactInputSchema.safeParse(values({ addresses: "{not json" }));
    expect(zodFieldErrors(result.error!).addresses).toBe(
      "Addresses could not be read.",
    );
  });

  it("rejects an address with an unknown type", () => {
    const addresses = JSON.stringify([{ type: "Vacation", city: "Reno" }]);
    const result = contactInputSchema.safeParse(values({ addresses }));
    expect(result.success).toBe(false);
  });

  it("enforces length limits within each address", () => {
    const addresses = JSON.stringify([{ type: "Home", postal_code: "9".repeat(21) }]);
    const result = contactInputSchema.safeParse(values({ addresses }));
    expect(result.success).toBe(false);
  });
});

describe("formDataToValues", () => {
  it("pulls every known field out, defaulting to an empty string", () => {
    const formData = new FormData();
    formData.set("first_name", "Grace");
    formData.set("email", "grace@example.com");
    formData.set("ignored", "nope");

    const extracted = formDataToValues(formData);

    expect(extracted.first_name).toBe("Grace");
    expect(extracted.last_name).toBe("");
    expect(Object.keys(extracted).sort()).toEqual(
      CONTACT_FIELDS.map((field) => field.name).sort(),
    );
  });
});
