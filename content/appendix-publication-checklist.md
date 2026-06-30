# Appendix: Public Release Checklist

This repository is intended to be public. Treat every example, screenshot, and evidence file as publishable only after review.

## Scrub These Values

Remove or replace:

- AWS account IDs.
- Azure tenant IDs and subscription IDs.
- Resource group names that identify customers or internal environments.
- Real endpoints, hostnames, and object-storage URLs.
- API keys, access keys, connection strings, tokens, and passwords.
- Console screenshots that expose account names, regions, user names, emails, IDs, or billing details.
- Machine-readable evidence exports that include real request IDs, user emails, domains, or account metadata.

Use placeholders:

```text safe-placeholders
<aws-account-id>
<aws-region>
<policy-bucket-name>
<opensearch-serverless-endpoint>
<azure-openai-resource>
<azure-search-service>
<azure-cosmos-database>
<bedrock-openai-model-id>
```

## Run The Public Safety Check

```bash public-safety-check
npm test
```

The included scanner catches common hazards such as AWS account IDs, access-key patterns, private keys, concrete tenant/subscription ID assignments, and obvious hardcoded secrets. The release checks also verify that Python examples compile and that source files preserve real line breaks.

This scanner is a backstop, not a substitute for review.

## Validate Copyable Examples

```bash example-validation
python3 -m py_compile examples/python/*.py
shellcheck --shell=bash examples/env/*.env.example
cfn-lint examples/infra/*.yml
```

GitHub Actions runs these checks before publishing the Pages artifact. Keep examples small enough that a reviewer can tell whether they are snippets, runnable files, or templates.

## GitHub Pages Publishing

```bash github-pages-build
npm run build
```

The site is generated into `site/`. GitHub Actions publishes that directory through the included Pages workflow.

## Cloudflare Pages Or Amplify Later

The static site build is intentionally portable.

Cloudflare Pages:

```text cloudflare-pages-settings
Build command: npm run build
Build output directory: site
Node version: 20
```

AWS Amplify Hosting:

```yaml amplify-build-settings
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

## Production Readiness

Before using this pattern for a customer or production workload, explicitly decide:

- Model and region availability for the exact Bedrock model ID.
- Quotas, rate limits, latency targets, retry behavior, and pricing differences.
- IAM roles, token-provider strategy, Secrets Manager storage, and key rotation.
- OpenSearch network access, encryption, collection policy, and index lifecycle.
- DynamoDB backup, restore, point-in-time recovery, TTL, and throttling alarms.
- S3 bucket encryption, versioning, object retention, and access logging.
- PII handling, audit-log retention, redaction, and evidence export policy.
- CloudWatch dashboards, structured logs, traces, model error alerts, and cutover rollback alarms.

This cookbook does not replace a production infrastructure review. It gives the migration spine engineers can adapt to their platform standards.

## Release Checklist

- The repo has an MIT license.
- The README explains the audience, assumptions, local preview, and publishing path.
- Every page uses placeholders instead of real resource identifiers.
- Every code block is copyable in the rendered site.
- The public safety scanner passes.
- Python examples compile.
- CloudFormation and shell-style environment examples pass CI validation.
- The GitHub Pages workflow passes.
- A reviewer has checked all screenshots and evidence files before they are added.
