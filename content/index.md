# Azure OpenAI to OpenAI on Amazon Bedrock Cookbook

This cookbook walks through a migration from Azure OpenAI to OpenAI on Amazon Bedrock using a real workflow app as the reference shape.

The app is ERP Governance Workbench. It accepts procurement requests, persists workflow state, runs deterministic approval rules, retrieves policy evidence, asks a model for the explanation, and writes audit events.

You will:

- Freeze the workflow contract before changing providers.
- Move policy documents from Azure Blob Storage to S3.
- Rebuild retrieval with OpenSearch Serverless or Bedrock Knowledge Bases.
- Move request and audit state from Cosmos DB to DynamoDB.
- Replace the Azure OpenAI provider with an OpenAI-on-Bedrock provider.
- Validate the migration with a golden request.

The important constraint: the model does not decide approvals. Rules decide. Retrieval supports. The model explains.

This is a reference migration pattern, not a complete production Terraform or CDK deployment. The snippets are meant to be copied into an existing Azure-first application and adapted to your organization's AWS accounts, regions, networking, identity, and compliance controls.

## Validation Notebook

Use the [validation notebook](https://github.com/eliza-hq/azure-openai-to-amazon-bedrock-cookbook/blob/main/notebooks/azure_openai_to_amazon_bedrock_validation.ipynb) as the executable proof bench for the cookbook. It opens in GitHub's notebook viewer, runs the local release checks, compares sanitized Azure and AWS golden-request evidence, and skips live Bedrock unless `RUN_LIVE_BEDROCK=1`.

## What you will build

By the end, you will have an AWS-backed version of the same procurement workflow:

| Capability | Azure source | AWS target |
| --- | --- | --- |
| Model | Azure OpenAI | OpenAI on Amazon Bedrock |
| Retrieval | Azure AI Search | OpenSearch Serverless or Bedrock Knowledge Bases |
| Policy documents | Azure Blob Storage | Amazon S3 |
| Request and audit state | Azure Cosmos DB | Amazon DynamoDB |
| Runtime identity | Azure managed identity | AWS IAM role |
| API/UI runtime | App Service or Container Apps | App Runner, ECS/Fargate, or Lambda where appropriate |

![Azure services mapped to AWS through a stable workflow contract](assets/diagrams/migration-architecture.svg "Azure services change underneath the app; the workflow contract stays stable.")

The code examples use placeholders for resource names and endpoints. Replace values like `<policy-bucket-name>`, `<azure-search-service>`, and `<bedrock-openai-model-id>` with values from your environment.

## Prerequisites

This cookbook assumes the Azure side already exists.

You need:

- An Azure OpenAI deployment or Azure Foundry model endpoint.
- An Azure AI Search index for policy or knowledge-base content.
- Azure Blob Storage or equivalent source storage for policy documents.
- Cosmos DB or equivalent source state for requests and audit records.
- An AWS account where you can create S3, DynamoDB, OpenSearch Serverless, IAM, and Bedrock resources.
- Access to the OpenAI model you plan to invoke through Amazon Bedrock.

## Set shared variables

The examples keep model IDs and resource names in configuration. Use the Bedrock model ID available in your account and region. The default here is intentionally easy to override.

```bash quick-start-env
export AWS_REGION=us-east-1
export AWS_RESOURCE_PREFIX=erpgov-migration
export AWS_BEDROCK_API_MODE=responses
export AWS_BEDROCK_MODEL_ID="${AWS_BEDROCK_MODEL_ID:-openai.gpt-5.4}"

export AZURE_AI_SEARCH_INDEX=policy-sections
export AWS_OPENSEARCH_INDEX=policy-sections
export AWS_S3_POLICY_PREFIX=policies
```

Confirm the AWS identity before provisioning anything.

```bash verify-aws-identity
aws sts get-caller-identity
aws configure get region
```

## Success criteria

The migration is done when the same high-risk procurement request produces the same operational result on AWS:

- The request persists with a durable ID.
- Required approvals match.
- Workflow state matches.
- Citations include document names and section titles.
- The model generates explanation and escalation language.
- Audit events record submission, rules, retrieval, generation, escalation drafting, and status changes.
