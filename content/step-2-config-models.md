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

    # GPT-5.4/GPT-5.5 use Bedrock Mantle with the Responses API.
    # GPT-OSS models may use Bedrock Runtime Converse/Invoke where supported.
    aws_bedrock_api_mode: str = os.getenv("AWS_BEDROCK_API_MODE", "responses")
    aws_bedrock_model_id: str = os.getenv("AWS_BEDROCK_MODEL_ID", "openai.gpt-5.4")
    aws_bedrock_max_tokens: int = int(os.getenv("AWS_BEDROCK_MAX_TOKENS", "700"))
```

## Match Model IDs To API Surfaces

Do not assume every OpenAI model on Bedrock uses the same runtime API. Pick the model, region, and API surface together.

| Model family | Bedrock endpoint | API surface | Cookbook default |
| --- | --- | --- | --- |
| `openai.gpt-5.4`, `openai.gpt-5.5` | `bedrock-mantle` | Responses API or Chat Completions through the OpenAI SDK | Yes |
| `openai.gpt-oss-20b-1:0`, `openai.gpt-oss-120b-1:0` | `bedrock-runtime` | Converse, InvokeModel, or OpenAI-compatible Chat Completions where supported | Optional variant |

The examples default to `openai.gpt-5.4` and `AWS_BEDROCK_API_MODE=responses`. If you switch to GPT-OSS to use Bedrock Runtime Converse, change both `AWS_BEDROCK_MODEL_ID` and `AWS_BEDROCK_API_MODE`.

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
export AWS_BEDROCK_API_MODE="responses"
export AWS_BEDROCK_MODEL_ID="${AWS_BEDROCK_MODEL_ID:-openai.gpt-5.4}"
# Use a secret manager or a Bedrock token provider for production workloads.
export AWS_BEARER_TOKEN_BEDROCK="<bedrock-api-key-or-token-provider-output>"
export AWS_S3_POLICY_BUCKET="<policy-bucket-name>"
export AWS_S3_POLICY_PREFIX="policies"
export AWS_OPENSEARCH_ENDPOINT="https://<opensearch-serverless-endpoint>"
export AWS_OPENSEARCH_INDEX="policy-sections"
export AWS_DYNAMODB_REQUESTS_TABLE="erpgov-migration-requests"
export AWS_DYNAMODB_AUDIT_EVENTS_TABLE="erpgov-migration-audit-events"
export AWS_DYNAMODB_VENDORS_TABLE="erpgov-migration-vendors"
export AWS_DYNAMODB_APPROVAL_MATRIX_TABLE="erpgov-migration-approval-matrix"
```

## Verify Bedrock Model And Region Access

Bedrock model catalog visibility, region support, runtime API support, and token configuration are separate permission surfaces. Check all of them before a cutover.

```bash verify-bedrock-model
aws bedrock list-foundation-models \
  --region "$AWS_REGION" \
  --query "modelSummaries[?contains(modelId, 'openai')].[modelId,providerName]" \
  --output table

aws bedrock get-foundation-model \
  --region "$AWS_REGION" \
  --model-identifier "$AWS_BEDROCK_MODEL_ID"
```

For GPT-5.4 and GPT-5.5, also confirm your Bedrock API key or token provider can reach the regional Mantle endpoint. For GPT-OSS Converse, confirm `bedrock-runtime` invocation succeeds in the same region.

## Migration Checkpoint

You should be able to run the same application binary with Azure or AWS providers by changing only environment variables.
