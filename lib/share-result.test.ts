import { describe, expect, it } from "vitest";
import { createShareText } from "./share-result";

describe("createShareText", () => {
  it("adds the invitation and direct game link", () => {
    expect(createShareText("I scored 9/10 on Puzzler Flag Classic.", "https://puzzler.example/flag-blitz"))
      .toBe("I scored 9/10 on Puzzler Flag Classic.\n\nHow’s your geography?\nhttps://puzzler.example/flag-blitz");
  });
});
