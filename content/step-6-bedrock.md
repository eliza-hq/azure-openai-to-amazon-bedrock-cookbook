# Step 6. Switch generation to Bedrock

This is the narrow code change: add a Bedrock provider next to the Azure provider. Do not change the rule engine or request orchestration.

## Bedrock Provider

The provider calls the Bedrock Converse API and returns the same `GovernanceAnalysis` object used by the rest of the app. The deterministic fields are copied from the rule evaluation, not from the model response.

```python examples/bedrock_openai_provider.py
import json
import os
import re
from typing import Any

import boto3


class BedrockOpenAIAnalysisProvider:
    source_name = "aws_bedrock"

    def __init__(self, model_id: str | None = None, max_tokens: int = 700) -> None:
        self.model_id = model_id or os.getenv("AWS_BEDROCK_MODEL_ID", "openai.gpt-5.4")
        self.max_tokens = max_tokens
        self.client = boto3.client("bedrock-runtime", region_name=os.getenv("AWS_REGION", "us-east-1"))
        self.fallback = LocalGovernanceAnalysisProvider()

    def generate(self, request, rule_evaluation, policy_citations):
        base_analysis = self.fallback.generate(request, rule_evaluation, policy_citations)

        generated = self._generate_json(request, rule_evaluation, policy_citations)

        return GovernanceAnalysis(
            request_id=request.request_id,
            applicable_policies=base_analysis.applicable_policies,
            deterministic_findings=rule_evaluation.findings,
            policy_citations=policy_citations,
            model_generated_interpretation=(
                generated.get("model_generated_interpretation")
                or base_analysis.model_generated_interpretation
            ),
            detected_violations=base_analysis.detected_violations,
            business_risk=generated.get("business_risk") or base_analysis.business_risk,
            required_approvals=rule_evaluation.required_approvals,
            recommended_workflow_state=rule_evaluation.recommended_status,
            generated_escalation=GeneratedEscalation(
                recipient_group=generated.get("recipient_group") or "Procurement Governance",
                subject=generated.get("escalation_subject") or f"Review request {request.request_id}",
                body=generated.get("escalation_body") or base_analysis.generated_escalation.body,
            ),
        )

    def _generate_json(self, request, rule_evaluation, policy_citations) -> dict[str, Any]:
        prompt = json.dumps(
            {
                "task": (
                    "Write model_generated_interpretation, business_risk, recipient_group, "
                    "escalation_subject, and escalation_body. Use citations as evidence."
                ),
                "request": request.to_dict(),
                "deterministic_findings": [finding.to_dict() for finding in rule_evaluation.findings],
                "required_approvals": rule_evaluation.required_approvals,
                "recommended_workflow_state": rule_evaluation.recommended_status.value,
                "policy_citations": [citation.to_dict() for citation in policy_citations[:4]],
            },
            separators=(",", ":"),
        )

        response = self.client.converse(
            modelId=self.model_id,
            system=[
                {
                    "text": (
                        "Generate concise procurement governance analysis. "
                        "Do not invent policy evidence. "
                        "Keep deterministic findings and approvals unchanged. "
                        "Return only valid JSON."
                    )
                }
            ],
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": self.max_tokens, "temperature": 0.2},
        )

        text = "".join(
            block.get("text", "")
            for block in response.get("output", {}).get("message", {}).get("content", [])
        )
        return extract_json(text)


def extract_json(content: str) -> dict[str, Any]:
    try:
        parsed = json.loads(content.strip())
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, flags=re.DOTALL)
        if not match:
            return {"model_generated_interpretation": content.strip()}
        parsed = json.loads(match.group(0))
    return parsed if isinstance(parsed, dict) else {"model_generated_interpretation": content.strip()}
```

## Compare Azure And Bedrock Calls

The API call changes, but the application contract does not.

```python azure_openai_call.py
from openai import OpenAI


client = OpenAI(
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    base_url=os.environ["AZURE_OPENAI_BASE_URL"],
)

completion = client.chat.completions.create(
    model=os.environ["AZURE_OPENAI_DEPLOYMENT"],
    messages=messages,
    temperature=0.2,
    max_tokens=450,
)
```

```python bedrock_converse_call.py
import boto3


client = boto3.client("bedrock-runtime", region_name=os.environ["AWS_REGION"])

response = client.converse(
    modelId=os.environ["AWS_BEDROCK_MODEL_ID"],
    system=[{"text": "Keep deterministic findings and approvals unchanged. Return only valid JSON."}],
    messages=[{"role": "user", "content": [{"text": prompt}]}],
    inferenceConfig={"maxTokens": 700, "temperature": 0.2},
)
```

## Fail Open Carefully

For workflow systems, fail-open should mean the deterministic result still exists and the generated explanation is degraded. It should not mean approvals are skipped.

```python fail_open_pattern.py
try:
    analysis = bedrock_provider.generate(request, rule_evaluation, citations)
except Exception as exc:
    analysis = local_provider.generate(request, rule_evaluation, citations)
    analysis.model_generated_interpretation += (
        f"\n\nGeneration fallback: Bedrock was unavailable ({exc.__class__.__name__})."
    )
```

## Migration Checkpoint

Run one request with `LLM_PROVIDER=azure_openai` and one with `LLM_PROVIDER=aws_bedrock`. The prose may differ. Required approvals, findings, workflow state, and citations should not.

