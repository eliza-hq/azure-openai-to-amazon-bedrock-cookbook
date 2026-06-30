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
    aws_bedrock_api_mode: str = os.getenv("AWS_BEDROCK_API_MODE", "responses")
    aws_bedrock_model_id: str = os.getenv("AWS_BEDROCK_MODEL_ID", "openai.gpt-5.4")
    aws_bedrock_max_tokens: int = int(os.getenv("AWS_BEDROCK_MAX_TOKENS", "700"))
