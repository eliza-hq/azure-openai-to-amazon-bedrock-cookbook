# Step 4. Rebuild retrieval

Retrieval is successful when it preserves the citation contract. A useful citation says `vendor_onboarding_handbook.md: Customer Data Handling`, not `chunk-83`.

## Define The Citation Shape

```python examples/policy_citation.py
from dataclasses import dataclass


@dataclass
class PolicyCitation:
    source_document: str
    section_title: str
    snippet: str
    relevance_score: float
```

## Parse Markdown Into Sections

Keep section titles in metadata so the new index can return human-readable evidence.

```python examples/markdown_sections.py
from dataclasses import dataclass


@dataclass
class PolicySection:
    source_document: str
    section_title: str
    content: str


def parse_markdown_sections(source_document: str, markdown: str) -> list[PolicySection]:
    sections: list[PolicySection] = []
    current_title = "Introduction"
    current_lines: list[str] = []

    for line in markdown.splitlines():
        if line.startswith("#"):
            if current_lines:
                sections.append(
                    PolicySection(source_document, current_title, "\n".join(current_lines).strip())
                )
            current_title = line.lstrip("#").strip()
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines:
        sections.append(PolicySection(source_document, current_title, "\n".join(current_lines).strip()))

    return [section for section in sections if section.content]
```

## Index Sections In OpenSearch

This example uses keyword fields for stable document metadata and text fields for search.

```python examples/opensearch_index_policies.py
import hashlib
import os

from opensearchpy import AWSV4SignerAuth, OpenSearch, RequestsHttpConnection
import boto3


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
```

## Query OpenSearch For Citations

```python examples/opensearch_retriever.py
def retrieve_policy_citations(client, index_name: str, query: str, limit: int = 5) -> list[PolicyCitation]:
    response = client.search(
        index=index_name,
        body={
            "size": limit,
            "_source": ["source_document", "section_title", "content", "snippet"],
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["section_title^2", "content", "source_document"],
                }
            },
        },
    )

    citations = []
    for hit in response.get("hits", {}).get("hits", []):
        source = hit.get("_source", {})
        citations.append(
            PolicyCitation(
                source_document=source.get("source_document", ""),
                section_title=source.get("section_title", ""),
                snippet=source.get("snippet") or source.get("content", "")[:420],
                relevance_score=float(hit.get("_score", 0) or 0),
            )
        )
    return citations
```

## Field Note

OpenSearch Serverless is not identical to provisioned OpenSearch. If an explicit `indices.refresh` call returns `404`, do not assume indexing failed. Verify with a query and tune around near-real-time visibility.

## Bedrock Knowledge Bases Option

Bedrock Knowledge Bases can replace OpenSearch when you want a managed retrieval path, but validate chunking and metadata carefully. The acceptance bar stays the same: retrieved evidence must include stable document and section information that users can inspect.

## Migration Checkpoint

Run a known query, such as `customer data security review`, and confirm the top citations refer to the expected policy documents and sections.

