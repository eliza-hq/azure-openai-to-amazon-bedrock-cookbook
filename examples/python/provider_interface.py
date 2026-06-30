from typing import Protocol


class GovernanceAnalysisProvider(Protocol):
    source_name: str

    def generate(
        self,
        request: "ProcurementRequest",
        rule_evaluation: "RuleEvaluation",
        policy_citations: list["PolicyCitation"],
    ) -> "GovernanceAnalysis":
        ...

