# Step 2. Parameterize configuration

The migration should switch providers with environment variables, not code edits. This keeps the Azure implementation honest and gives you a reversible AWS path.

## Define Provider Selection

Use one variable per layer. The values below are intentionally plain so they are easy to set in App Runner, ECS, Lambda, GitHub Actions, or a local shell.

```python examples/settings.py
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_provider: str = os.getenv("DATABASE_PROVIDER", "local")
    storage_provider: str = os.getenv("STORAGE_PROVIDER", "local")
    search_provider: str = os.getenv("SEARCH_PROVIDER", "local")
    llm_provider: str = os.getenv("LLM_PROVIDER", "local")

    azure_openai_base_url: str = os.getenv("AZURE_OPENAI_BASE_URL", "")
    azure_openai_deployment: str = os.getenv("AZURE_OPENAI_DEPLOYMENT", "")
    azure_ai_search_endpoint: str = os.getenv("AZURE_AI_SEARCH_ENDPOINT", "")
    azure_ai_search_index: str = os.getenv("AZURE_AI_SEARCH_INDEX", "policy-sections")

    aws_region: str = os.getenv("AWS_REGION", "us-east-1")
    aws_s3_policy_bucket: str = os.getenv("AWS_S3_POLICY_BUCKET", "")
    aws_s3_policy_prefix: str = os.getenv("AWS_S3_POLICY_PREFIX", "policies")
    aws_opensearch_endpoint: str = os.getenv("AWS_OPENSEARCH_ENDPOINT", "")
    aws_opensearch_index: str = os.getenv("AWS_OPENSEARCH_INDEX", "policy-sections")

    # Replace this with the OpenAI model ID enabled in your Bedrock account and region.
    aws_bedrock_model_id: str = os.getenv("AWS_BEDROCK_MODEL_ID", "openai.gpt-5.4")
    aws_bedrock_max_tokens: int = int(os.getenv("AWS_BEDROCK_MAX_TOKENS", "700"))
```

## Use Separate Azure And AWS Profiles

Keep side-by-side environment files for validation. Do not commit real values.

```bash azure-source.env
export DATABASE_PROVIDER=azure_cosmos
export STORAGE_PROVIDER=azure_blob
export SEARCH_PROVIDER=azure_ai_search
export LLM_PROVIDER=azure_openai

export AZURE_OPENAI_BASE_URL="https://<azure-openai-resource>.openai.azure.com/openai/v1/"
export AZURE_OPENAI_DEPLOYMENT="<azure-openai-deployment>"
export AZURE_AI_SEARCH_ENDPOINT="https://<azure-search-service>.search.windows.net"
export AZURE_AI_SEARCH_INDEX="policy-sections"
export AZURE_BLOB_POLICY_CONTAINER="policies"
export AZURE_COSMOS_DATABASE="erp-governance"
```

```bash aws-target.env
export DATABASE_PROVIDER=aws_dynamodb
export STORAGE_PROVIDER=aws_s3
export SEARCH_PROVIDER=aws_opensearch
export LLM_PROVIDER=aws_bedrock

export AWS_REGION="us-east-1"
export AWS_RESOURCE_PREFIX="erpgov-migration"
export AWS_BEDROCK_MODEL_ID="${AWS_BEDROCK_MODEL_ID:-openai.gpt-5.4}"
export AWS_S3_POLICY_BUCKET="<policy-bucket-name>"
export AWS_S3_POLICY_PREFIX="policies"
export AWS_OPENSEARCH_ENDPOINT="https://<opensearch-serverless-endpoint>"
export AWS_OPENSEARCH_INDEX="policy-sections"
export AWS_DYNAMODB_REQUESTS_TABLE="erpgov-migration-requests"
export AWS_DYNAMODB_AUDIT_EVENTS_TABLE="erpgov-migration-audit-events"
export AWS_DYNAMODB_VENDORS_TABLE="erpgov-migration-vendors"
export AWS_DYNAMODB_APPROVAL_MATRIX_TABLE="erpgov-migration-approval-matrix"
```

## Verify Bedrock Model Access

Bedrock model catalog visibility and runtime invocation are separate permission surfaces. Check both.

```bash verify-bedrock-model
aws bedrock list-foundation-models \
  --region "$AWS_REGION" \
  --query "modelSummaries[?contains(modelId, 'openai')].[modelId,providerName]" \
  --output table

aws bedrock get-foundation-model \
  --region "$AWS_REGION" \
  --model-identifier "$AWS_BEDROCK_MODEL_ID"
```

If listing fails but runtime invocation succeeds, the issue may be catalog permissions rather than model usability. Still fix the permissions before production because support and operations teams need visibility.

## Migration Checkpoint

You should be able to run the same application binary with Azure or AWS providers by changing only environment variables.

