from models import PolicyCitation


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

