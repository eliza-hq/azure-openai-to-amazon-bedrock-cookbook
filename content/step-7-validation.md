# Step 7. Run golden request validation

A migrated GenAI workflow is not validated by the model returning text. It is validated when the same input produces the same operational outcome.

## Use A Hard Request

Choose a request that exercises spend, vendor onboarding, security, legal, and escalation logic.

```json golden-request.json
{
  "request_type": "New Vendor Purchase",
  "vendor_name": "DataNimbus Labs",
  "amount": 125000,
  "currency": "USD",
  "requester": "requester@example.com",
  "department": "Sales Operations",
  "business_justification": "Data enrichment for customer health scoring and account risk modeling.",
  "contract_length_months": 24,
  "handles_customer_data": true,
  "is_new_vendor": true,
  "geography": "India",
  "category": "Offshore Data Processing",
  "invoice_variance_percent": 0
}
```

Expected result:

| Field | Expected value |
| --- | --- |
| Workflow state | `Escalated` |
| Risk level | `High` |
| Approvals | `CFO Approval`, `Vendor Onboarding Review`, `Security Review`, `Legal Review`, `Executive Risk Escalation` |
| Findings | Spend Threshold, Vendor Onboarding, Security Review, Contract Review, Vendor Risk |
| Audit events | request submitted, rules evaluated, status changed, retrieval completed, analysis generated, escalation drafted |

![Golden request validation across Azure and AWS](assets/diagrams/golden-validation.svg "The same request runs on Azure and AWS; deterministic outputs are compared before cutover.")

## Compare Azure And AWS Responses

```python examples/compare_golden_outputs.py
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
    assert {c["source_document"] for c in azure_citations}
    assert {c["source_document"] for c in aws_citations}
    assert {c["section_title"] for c in aws_citations}


assert_equal_operational_outcome(
    load("evidence/azure-golden-request-response.json"),
    load("evidence/aws-golden-request-response.json"),
)
```

## Assert The Audit Trail

```python examples/test_audit_events.py
def test_workflow_records_required_audit_events(repository):
    request = submit_golden_request()
    event_types = [event.event_type for event in repository.list_audit_events(request.request_id)]

    assert "request_submitted" in event_types
    assert "rules_evaluated" in event_types
    assert "workflow_status_changed" in event_types
    assert "policy_retrieval_completed" in event_types
    assert "llm_analysis_generated" in event_types
    assert "escalation_email_drafted" in event_types
```

## Smoke Test Retrieval

```bash smoke-test-policy-search
curl "$API_URL/policy/search?query=customer%20data%20security&limit=5"
```

The response should include policy citations with `source_document`, `section_title`, `snippet`, and `relevance_score`.

## Migration Checkpoint

The AWS output should match Azure for deterministic business behavior. Only narrative fields such as `model_generated_interpretation` and escalation prose are allowed to differ.
