# Step 3. Move policy documents to S3

Move the policy corpus before you rebuild retrieval. The retrieval index is disposable; the named documents are not.

For ERP Governance Workbench, the policy corpus contains Markdown documents such as:

- `procurement_policy.md`
- `vendor_onboarding_handbook.md`
- `finance_controls_manual.md`
- `erp_workflow_guide.md`
- `risk_escalation_playbook.md`

Keep these filenames stable. They become part of the citation contract.

## Copy Blob Objects To S3

This script copies Markdown files from an Azure Blob container to an S3 prefix. It assumes your Azure and AWS credentials are already available through your local environment, managed identity, SSO, or a secure secret store.

```python examples/copy_blob_policies_to_s3.py
import os

import boto3
from azure.storage.blob import ContainerClient


AZURE_CONTAINER_URL = os.environ["AZURE_CONTAINER_URL"]
AWS_S3_POLICY_BUCKET = os.environ["AWS_S3_POLICY_BUCKET"]
AWS_S3_POLICY_PREFIX = os.getenv("AWS_S3_POLICY_PREFIX", "policies").strip("/")


def s3_key(blob_name: str) -> str:
    filename = blob_name.rsplit("/", 1)[-1]
    return f"{AWS_S3_POLICY_PREFIX}/{filename}" if AWS_S3_POLICY_PREFIX else filename


def main() -> None:
    container = ContainerClient.from_container_url(AZURE_CONTAINER_URL)
    s3 = boto3.client("s3")
    copied = 0

    for blob in container.list_blobs():
        if not blob.name.endswith(".md"):
            continue
        data = container.download_blob(blob.name).readall()
        s3.put_object(
            Bucket=AWS_S3_POLICY_BUCKET,
            Key=s3_key(blob.name),
            Body=data,
            ContentType="text/markdown; charset=utf-8",
        )
        copied += 1

    print(f"Copied {copied} policy documents to s3://{AWS_S3_POLICY_BUCKET}/{AWS_S3_POLICY_PREFIX}")


if __name__ == "__main__":
    main()
```

## Verify The Corpus

```bash verify-s3-policy-corpus
aws s3 ls "s3://${AWS_S3_POLICY_BUCKET}/${AWS_S3_POLICY_PREFIX}/"

aws s3api list-objects-v2 \
  --bucket "$AWS_S3_POLICY_BUCKET" \
  --prefix "${AWS_S3_POLICY_PREFIX}/" \
  --query "Contents[].Key" \
  --output text
```

## Add A Lightweight S3 Reader

Use a reader that returns `(filename, text)` pairs. This keeps retrieval independent from object-storage details.

```python examples/s3_policy_store.py
from pathlib import Path

import boto3


class S3PolicyStore:
    def __init__(self, bucket_name: str, prefix: str = "policies") -> None:
        self.bucket_name = bucket_name
        self.prefix = prefix.strip("/")
        self.s3 = boto3.client("s3")

    def list_policy_documents(self) -> list[tuple[str, str]]:
        documents: list[tuple[str, str]] = []
        paginator = self.s3.get_paginator("list_objects_v2")

        for page in paginator.paginate(Bucket=self.bucket_name, Prefix=f"{self.prefix}/"):
            for item in page.get("Contents", []):
                key = item["Key"]
                if not key.endswith(".md"):
                    continue
                obj = self.s3.get_object(Bucket=self.bucket_name, Key=key)
                text = obj["Body"].read().decode("utf-8")
                documents.append((Path(key).name, text))

        return sorted(documents, key=lambda item: item[0])
```

## Migration Checkpoint

You should have the same policy filenames in S3 that existed in Blob Storage, and you should be able to list and read them without embedding credentials in code.

