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

