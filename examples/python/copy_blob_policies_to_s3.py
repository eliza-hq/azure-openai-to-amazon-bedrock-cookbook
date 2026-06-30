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

