# Azure OpenAI to OpenAI on Amazon Bedrock Cookbook

[![Publish GitHub Pages](https://github.com/eliza-hq/azure-openai-to-amazon-bedrock-cookbook/actions/workflows/pages.yml/badge.svg)](https://github.com/eliza-hq/azure-openai-to-amazon-bedrock-cookbook/actions/workflows/pages.yml)

Read the live cookbook: https://eliza-hq.github.io/azure-openai-to-amazon-bedrock-cookbook/

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

## Deployment

This repository is published with GitHub Pages at:

```text
https://eliza-hq.github.io/azure-openai-to-amazon-bedrock-cookbook/
```

GitHub Pages is configured to build from GitHub Actions. Every push to `main` runs the public-safety scanner, builds the single-page site into `site/`, and publishes that artifact.

You can also trigger a deployment manually from the `Publish GitHub Pages` workflow.

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
