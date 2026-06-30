# Examples

These examples are copy-friendly migration snippets used by the cookbook pages. They are intentionally small and parameterized. Replace placeholders with values from your own Azure and AWS environments.

The snippets assume:

- Azure is already configured.
- AWS credentials are available through SSO, a profile, an IAM role, or another approved mechanism.
- Bedrock model IDs are supplied through `AWS_BEDROCK_MODEL_ID`.
- Secrets are loaded from the environment or a secret manager, not committed to source control.

