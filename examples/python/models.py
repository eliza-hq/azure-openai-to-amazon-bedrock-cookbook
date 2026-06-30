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
    deterministic_findings: list[RiskFinding]
    required_approvals: list[str]
    recommended_workflow_state: WorkflowStatus
    applicable_policies: list[str]
    policy_citations: list[PolicyCitation]
    model_generated_interpretation: str
    detected_violations: list[str]
    business_risk: str
    generated_escalation: GeneratedEscalation

