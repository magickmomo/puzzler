import { describe, expect, it } from "vitest";
import { getAnswerChoiceState } from "./answer-outcome";

describe("answer choice states", () => {
  const base = { selectedId: "br", correctId: "fr" };

  it("leaves all choices idle before an answer", () => {
    expect(getAnswerChoiceState({ ...base, choiceId: "br", outcome: "unanswered" })).toBe("idle");
    expect(getAnswerChoiceState({ ...base, choiceId: "fr", outcome: "unanswered" })).toBe("idle");
  });

  it("marks the selected correct choice", () => {
    expect(getAnswerChoiceState({ choiceId: "fr", selectedId: "fr", correctId: "fr", outcome: "correct" })).toBe("selected-correct");
    expect(getAnswerChoiceState({ choiceId: "br", selectedId: "fr", correctId: "fr", outcome: "correct" })).toBe("disabled");
  });

  it("reveals both the incorrect selection and the correct answer", () => {
    expect(getAnswerChoiceState({ ...base, choiceId: "br", outcome: "incorrect" })).toBe("selected-incorrect");
    expect(getAnswerChoiceState({ ...base, choiceId: "fr", outcome: "incorrect" })).toBe("correct-answer");
    expect(getAnswerChoiceState({ ...base, choiceId: "de", outcome: "incorrect" })).toBe("disabled");
  });
});
