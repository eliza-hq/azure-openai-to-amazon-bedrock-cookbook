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

The included scanner catches common hazards such as AWS account IDs, access-key patterns, private keys, concrete tenant/subscription ID assignments, and obvious hardcoded secrets.

This scanner is a backstop, not a substitute for review.

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

## Release Checklist

- The repo has an MIT license.
- The README explains the audience, assumptions, local preview, and publishing path.
- Every page uses placeholders instead of real resource identifiers.
- Every code block is copyable in the rendered site.
- The public safety scanner passes.
- The GitHub Pages workflow passes.
- A reviewer has checked all screenshots and evidence files before they are added.

