# Step 1. Map Azure services to AWS

Treat the service map as a migration contract, not a diagram. Every row should name the capability you need to preserve and the behavior you need to verify after the move.

![AWS deployment stack for the migrated workload](assets/diagrams/aws-deployment-stack.svg "The AWS target deploys an app runtime, an IAM runtime role, Bedrock generation, S3 policy storage, retrieval, DynamoDB state, and observability.")

## Reference Map

| Capability | Local reference | Azure source | AWS target |
| --- | --- | --- | --- |
| API runtime | FastAPI process | App Service or Container Apps | App Runner or ECS/Fargate |
| UI runtime | Streamlit process | App Service or static web frontend | App Runner, ECS, or static web frontend |
| Request store | SQLite | Cosmos DB | DynamoDB |
| Audit trail | SQLite table | Cosmos DB container | DynamoDB table keyed by request and event time |
| Policy documents | Markdown files | Blob Storage | S3 |
| Retrieval | Local retriever | Azure AI Search | OpenSearch Serverless or Bedrock Knowledge Bases |
| Generation | Local structured provider | Azure OpenAI | OpenAI on Amazon Bedrock |
| Identity | Local environment | Managed identity | IAM role |
| Logs | Process logs | Azure Monitor | CloudWatch and CloudTrail |

## Keep The Orchestration Stable

The orchestration should not know which cloud it is running on. It should assemble a repository, rule engine, retriever, analysis provider, and audit trail from configuration.

```python examples/service_factory.py
def build_repository(settings):
    if settings.database_provider == "azure_cosmos":
        return AzureCosmosRequestStore(settings)
    if settings.database_provider == "aws_dynamodb":
        return DynamoDBRequestStore(settings)
    return SQLiteRepository(settings.database_path)


def build_retriever(settings):
    if settings.search_provider == "azure_ai_search":
        return AzureAISearchPolicyRetriever(settings)
    if settings.search_provider == "aws_opensearch":
        return OpenSearchPolicyRetriever(settings)
    if settings.storage_provider == "aws_s3":
        return S3PolicyRetriever(S3PolicyStore(settings))
    return LocalPolicyRetriever(settings.policy_dir)


def build_analysis_provider(settings):
    if settings.llm_provider == "aws_bedrock":
        if settings.aws_bedrock_api_mode == "converse":
            return BedrockGptOssConverseAnalysisProvider(
                model_id=settings.aws_bedrock_model_id,
                max_tokens=settings.aws_bedrock_max_tokens,
            )
        return BedrockOpenAIAnalysisProvider(
            model_id=settings.aws_bedrock_model_id,
            max_tokens=settings.aws_bedrock_max_tokens,
            aws_region=settings.aws_region,
        )
    if settings.llm_provider == "azure_openai":
        return AzureOpenAIAnalysisProvider.from_settings(settings)
    return LocalGovernanceAnalysisProvider()
```

## Translate The Operational Differences

Azure managed identity and AWS IAM roles both remove hardcoded credentials, but they are not the same operationally. Azure AI Search and OpenSearch both retrieve policy sections, but scoring and refresh behavior differ. Cosmos DB and DynamoDB both store JSON-like records, but your key design must follow query patterns.

Build the migration around those differences:

- Identity: replace managed identity permissions with an explicit runtime IAM role.
- Retrieval: preserve citation shape first, then tune ranking.
- State: model DynamoDB tables around access patterns, not around the old container names.
- Model: hold the Bedrock model ID in configuration and validate it in the target region.
- Observability: include request IDs in logs and audit events so Azure and AWS runs can be compared.

## Migration Checkpoint

You should be able to explain the AWS target for every Azure capability and name the validation check that proves the capability survived the move.
