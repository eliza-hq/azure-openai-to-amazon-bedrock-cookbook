# Azure OpenAI to OpenAI on Amazon Bedrock Cookbook

This public cookbook walks through migrating an Azure-first enterprise GenAI application from Azure OpenAI, Azure AI Search, Blob Storage, and Cosmos DB to OpenAI on Amazon Bedrock, Amazon OpenSearch or Bedrock Knowledge Bases, S3, and DynamoDB.

The reference application is ERP Governance Workbench: a procurement/vendor governance workflow that creates durable request records, applies deterministic approval rules, retrieves policy evidence, asks the model for interpretation, drafts an escalation, and records audit events.

## Audience

This cookbook is for engineering teams that already have an Azure implementation and want a practical migration path to AWS. It assumes Azure is already set up and focuses on the code, configuration, validation checks, and cutover sequence needed to move the workload.

## Repository Shape

- `content/` contains the source cookbook pages.
- `examples/` contains copyable code snippets used by the walkthrough.
- `registry.json` controls page order, metadata, and navigation.
- `scripts/build.mjs` renders the single-page static GitHub Pages site to `site/`.
- `scripts/check-public-safety.mjs` scans for common public-release hazards.

## Local Preview

```bash
npm install
npm run build
npx http-server site -p 4173
```

The project has no runtime npm dependencies. The build uses Node.js only, renders one scrollable `index.html`, and stays portable across GitHub Pages, Cloudflare Pages, and AWS Amplify Hosting.

## Publish With GitHub Pages

1. Create the public repository under the Eliza GitHub organization.
2. Push this repo to `main`.
3. In GitHub, open Settings -> Pages and select GitHub Actions as the source.
4. The included workflow publishes the generated `site/` artifact.

## Portability

Cloudflare Pages:

```text
Build command: npm run build
Build output directory: site
Node version: 20
```

AWS Amplify Hosting:

```yaml
version: 1
frontend:
  phases:
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: site
    files:
      - "**/*"
```

## Public Safety

Do not publish real account IDs, tenant IDs, endpoints, screenshots, API keys, connection strings, or evidence exports. Use placeholders such as `<aws-account-id>`, `<azure-search-endpoint>`, and `<bedrock-openai-model-id>`.

Run the release check before publishing:

```bash
npm test
```
