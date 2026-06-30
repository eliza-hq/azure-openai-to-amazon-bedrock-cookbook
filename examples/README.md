# Examples

These examples are copy-friendly migration snippets used by the cookbook pages. They are intentionally small and parameterized. Replace placeholders with values from your own Azure and AWS environments.

The snippets assume:

- Azure is already configured.
- AWS credentials are available through SSO, a profile, an IAM role, or another approved mechanism.
- Bedrock model IDs are supplied through `AWS_BEDROCK_MODEL_ID`.
- GPT-5.4 and GPT-5.5 examples use the OpenAI SDK `BedrockOpenAI` client and the Responses API.
- GPT-OSS Converse examples use `boto3` and Bedrock Runtime.
- Secrets are loaded from the environment or a secret manager, not committed to source control.
- `examples/evidence/` contains sanitized golden-request outputs used by the validation notebook.

For local syntax checks:

```bash
python3 -m py_compile examples/python/*.py
```

For runtime experiments, install only the SDKs used by the snippet you are testing:

```bash
pip install openai boto3
```
