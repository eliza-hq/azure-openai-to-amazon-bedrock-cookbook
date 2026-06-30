import hashlib
import os

import boto3
from opensearchpy import AWSV4SignerAuth, OpenSearch, RequestsHttpConnection


def opensearch_client():
    endpoint = os.environ["AWS_OPENSEARCH_ENDPOINT"].replace("https://", "").strip("/")
    region = os.getenv("AWS_REGION", "us-east-1")
    session = boto3.Session(region_name=region)
    auth = AWSV4SignerAuth(session.get_credentials(), region, "aoss")
    return OpenSearch(
        hosts=[{"host": endpoint, "port": 443}],
        http_auth=auth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        timeout=30,
    )


def ensure_index(client, index_name: str) -> None:
    if client.indices.exists(index=index_name):
        return
    client.indices.create(
        index=index_name,
        body={
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "source_document": {"type": "keyword"},
                    "section_title": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                    "content": {"type": "text"},
                    "snippet": {"type": "text"},
                    "tags": {"type": "keyword"},
                }
            }
        },
    )


def section_id(source_document: str, ordinal: int, section_title: str) -> str:
    raw = f"{source_document}:{ordinal}:{section_title}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()

