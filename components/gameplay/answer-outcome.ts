export type AnswerOutcome = "unanswered" | "correct" | "incorrect";

export type AnswerChoiceState = "idle" | "selected-correct" | "selected-incorrect" | "correct-answer" | "disabled";

export function getAnswerChoiceState({
  choiceId,
  selectedId,
  correctId,
  outcome,
}: {
  choiceId: string;
  selectedId: string | null;
  correctId: string;
  outcome: AnswerOutcome;
}): AnswerChoiceState {
  if (outcome === "unanswered") return "idle";
  if (choiceId === selectedId) return outcome === "correct" ? "selected-correct" : "selected-incorrect";
  if (outcome === "incorrect" && choiceId === correctId) return "correct-answer";
  return "disabled";
}
