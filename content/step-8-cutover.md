# Step 8. Cut over safely

Cutover is the last step. By this point, identity, data, retrieval, generation, and validation should already work in AWS.

## Pre-Cutover Checklist

- AWS identity and region are pinned.
- Bedrock model access is confirmed for the target OpenAI model.
- S3 contains the policy corpus with stable filenames.
- OpenSearch or Bedrock Knowledge Bases returns section-level citations.
- DynamoDB contains requests, audit events, vendors, and approval matrix records.
- The API can process the golden request on AWS.
- The golden request matches Azure for deterministic outcomes.
- CloudWatch logs include request IDs.
- Teardown has been tested in a non-production environment.

## Route A Small Slice First

Start with a low-risk routing percentage and compare live traffic against the Azure stack.

```text cutover-sequence
0 percent AWS: deploy and validate internally
1 percent AWS: compare live low-risk requests
10 percent AWS: compare golden and representative requests
50 percent AWS: monitor latency, retrieval quality, model errors, and audit writes
100 percent AWS: keep Azure rollback window open until operational metrics settle
```

## Watch The Right Signals

| Signal | Why it matters |
| --- | --- |
| Required approvals mismatch | Deterministic logic or seed data drifted |
| Workflow state mismatch | Rule priority or status mapping changed |
| Empty citations | Retrieval index or credentials failed |
| Citation section drift | Chunking or ranking changed |
| Bedrock errors | Model access, quota, region, or payload issue |
| Audit event gaps | Workflow is no longer explainable |
| DynamoDB throttling | Capacity or access pattern issue |
| App Runner health failures | Runtime or health check mismatch |

## Keep A Rollback Path

Provider selection should make rollback boring.

```bash rollback-to-azure
export DATABASE_PROVIDER=azure_cosmos
export STORAGE_PROVIDER=azure_blob
export SEARCH_PROVIDER=azure_ai_search
export LLM_PROVIDER=azure_openai
```

And the AWS path should be equally explicit.

```bash route-to-aws
export DATABASE_PROVIDER=aws_dynamodb
export STORAGE_PROVIDER=aws_s3
export SEARCH_PROVIDER=aws_opensearch
export LLM_PROVIDER=aws_bedrock
export AWS_BEDROCK_API_MODE=responses
```

## Production Hardening

The reference migration intentionally favors clarity. Before production, harden the target stack:

- For GPT-5.4/GPT-5.5, store `AWS_BEARER_TOKEN_BEDROCK` in a secret manager or use a refreshable Bedrock token provider.
- For GPT-OSS Runtime APIs, scope `bedrock:InvokeModel` to the specific model ARN where possible.
- Use customer-managed KMS keys if your policy requires them.
- Restrict OpenSearch Serverless network access instead of leaving public network access enabled.
- Use VPC endpoints where required by your network model.
- Size App Runner, ECS, Lambda, and DynamoDB based on production traffic.
- Define CloudWatch dashboards and alarms for model errors, API failures, DynamoDB throttling, search failures, and cutover rollback signals.

## Migration Checkpoint

The cloud underneath changed. The business workflow did not. Cutover is complete only when request state, approvals, citations, generated explanation, and audit trail all survive the move.
