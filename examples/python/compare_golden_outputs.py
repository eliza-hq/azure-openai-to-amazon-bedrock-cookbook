import json
from pathlib import Path


DETERMINISTIC_FIELDS = [
    "status",
    "risk_level",
    "required_approvals",
]

ANALYSIS_FIELDS = [
    "deterministic_findings",
    "recommended_workflow_state",
    "required_approvals",
]


def load(path: str) -> dict:
    return json.loads(Path(path).read_text())


def normalize_list(values):
    return sorted(str(value) for value in values)


def assert_equal_operational_outcome(azure: dict, aws: dict) -> None:
    for field in DETERMINISTIC_FIELDS:
        if field == "required_approvals":
            assert normalize_list(azure[field]) == normalize_list(aws[field])
        else:
            assert azure[field] == aws[field]

    azure_analysis = azure["analysis"]
    aws_analysis = aws["analysis"]

    for field in ANALYSIS_FIELDS:
        if field == "required_approvals":
            assert normalize_list(azure_analysis[field]) == normalize_list(aws_analysis[field])
        else:
            assert azure_analysis[field] == aws_analysis[field]

    azure_citations = azure_analysis["policy_citations"]
    aws_citations = aws_analysis["policy_citations"]
    assert {citation["source_document"] for citation in azure_citations}
    assert {citation["source_document"] for citation in aws_citations}
    assert {citation["section_title"] for citation in aws_citations}


if __name__ == "__main__":
    assert_equal_operational_outcome(
        load("evidence/azure-golden-request-response.json"),
        load("evidence/aws-golden-request-response.json"),
    )

