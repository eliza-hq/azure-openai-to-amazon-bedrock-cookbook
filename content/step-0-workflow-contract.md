# Step 0. Freeze the workflow contract

Before moving infrastructure, define the behavior that must not change. For ERP Governance Workbench, the migration boundary is not a chat answer. It is a business workflow.

```text workflow-shape
business request
-> persistent request record
-> deterministic rule evaluation
-> policy retrieval
-> model-generated interpretation and escalation draft
-> audit events
-> next workflow state
```

![Procurement workflow contract from request through audit trail](assets/diagrams/workflow-contract.svg "Rules own decisions, retrieval owns evidence, and the model owns explanation.")

This contract gives you something concrete to compare before and after the platform move.

## Define The Output Object

Group fields by their source. Deterministic fields come from code, evidence comes from retrieval, and generated fields come from the model.

```python examples/models.py
from dataclasses import dataclass
from enum import Enum


class WorkflowStatus(str, Enum):
    SUBMITTED = "Submitted"
    PROCUREMENT_REVIEW = "Procurement Review"
    SECURITY_REVIEW = "Security Review"
    FINANCE_APPROVAL = "Finance Approval"
    LEGAL_REVIEW = "Legal Review"
    ESCALATED = "Escalated"
    APPROVED = "Approved"
    BLOCKED = "Blocked"
    NEEDS_MORE_INFO = "Needs More Info"


@dataclass
class RiskFinding:
    finding_id: str
    severity: str
    category: str
    description: str
    deterministic: bool = True


@dataclass
class PolicyCitation:
    source_document: str
    section_title: str
    snippet: str
    relevance_score: float


@dataclass
class GeneratedEscalation:
    recipient_group: str
    subject: str
    body: str


@dataclass
class GovernanceAnalysis:
    request_id: str

    # Deterministic fields. The model must not decide these.
    deterministic_findings: list[RiskFinding]
    required_approvals: list[str]
    recommended_workflow_state: WorkflowStatus

    # Evidence fields. Retrieval owns these.
    applicable_policies: list[str]
    policy_citations: list[PolicyCitation]

    # Generated fields. The model may write these.
    model_generated_interpretation: str
    detected_violations: list[str]
    business_risk: str
    generated_escalation: GeneratedEscalation
```

## Keep One Provider Interface

The generation provider should accept the request, the rule evaluation, and the retrieved citations. It should return the same `GovernanceAnalysis` shape regardless of whether the call goes to Azure OpenAI or Amazon Bedrock.

```python examples/provider_interface.py
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
```

## Assert The Non-Negotiables

Write tests for the parts that should be identical after migration.

```python examples/test_workflow_contract.py
def test_high_value_new_vendor_with_customer_data_escalates(repository):
    vendor = repository.get_vendor_by_name("DataNimbus Labs")
    request = ProcurementRequest(
        request_id="REQ-TEST-0001",
        request_type="New Vendor Purchase",
        vendor_name="DataNimbus Labs",
        amount=125000,
        currency="USD",
        requester="requester@example.com",
        department="Sales Operations",
        business_justification="Data enrichment for customer health scoring.",
        contract_length_months=24,
        handles_customer_data=True,
        is_new_vendor=True,
        geography="India",
        category="Offshore Data Processing",
    )

    result = WorkflowRuleEngine().evaluate(
        request,
        vendor,
        repository.list_approval_matrix(),
    )

    assert result.recommended_status == WorkflowStatus.ESCALATED
    assert result.risk_level == "High"
    assert "CFO Approval" in result.required_approvals
    assert "Vendor Onboarding Review" in result.required_approvals
    assert "Security Review" in result.required_approvals
    assert "Legal Review" in result.required_approvals
    assert "Executive Risk Escalation" in result.required_approvals
```

## Migration Checkpoint

Do not proceed until these are true:

- The workflow state is represented explicitly.
- Required approvals are deterministic.
- Citations include human-readable document and section fields.
- Model output cannot override deterministic fields.
- You have at least one golden request that exercises the hard path.
