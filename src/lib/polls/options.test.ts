import { describe, expect, it } from "vitest";
import { buildPollOptions, normalizePollOptions } from "./options";

describe("normalizePollOptions", () => {
  it("transforms an array of simple strings into option records", () => {
    const options = normalizePollOptions(["Ja", "Nein"]);
    expect(options).toHaveLength(2);
    expect(options[0]?.label).toBe("Ja");
    expect(options[1]?.label).toBe("Nein");
    expect(options[0]?.id).toBeTruthy();
    expect(options[1]?.id).toBeTruthy();
  });

  it("keeps provided ids when available", () => {
    const options = normalizePollOptions([
      { id: "yes", label: "Ja" },
      { id: "no", label: "Nein" },
    ]);
    expect(options).toEqual([
      { id: "yes", label: "Ja" },
      { id: "no", label: "Nein" },
    ]);
  });
});

describe("buildPollOptions", () => {
  it("builds option records from labels and filters empty entries", () => {
    const result = buildPollOptions(["Ja", "", "   ", "Nein"]);
    expect(result).toHaveLength(2);
    const labels = result.map((option) => option.label);
    expect(labels).toEqual(["Ja", "Nein"]);
  });
});
