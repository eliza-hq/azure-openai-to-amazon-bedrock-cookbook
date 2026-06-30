# Step 5. Move operational state

Do not move workflow state as an undifferentiated JSON dump. DynamoDB table design should follow the queries your application actually runs.

## Target Tables

| Table | Partition key | Sort key | Query it supports |
| --- | --- | --- | --- |
| `requests` | `request_id` | none | Load and update a request |
| `audit_events` | `request_id` | `event_sort_key` | Read ordered audit history for one request |
| `vendors` | `vendor_id` | none | Seed and list vendors |
| `approval_matrix` | `approval_role` | none | Seed and list approval thresholds |

The audit sort key should combine timestamp and event ID so events remain ordered and unique.

```python examples/audit_event_sort_key.py
def audit_event_sort_key(event) -> str:
    return f"{event.timestamp}#{event.event_id}"
```

## Write DynamoDB-Safe Documents

DynamoDB stores numbers as decimals. Convert floats before writing and convert them back when loading domain objects.

```python examples/dynamodb_serialization.py
from decimal import Decimal
from typing import Any


def to_dynamodb(value: Any) -> Any:
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {key: to_dynamodb(item) for key, item in value.items() if item is not None}
    if isinstance(value, list):
        return [to_dynamodb(item) for item in value]
    return value


def from_dynamodb(value: Any) -> Any:
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    if isinstance(value, dict):
        return {key: from_dynamodb(item) for key, item in value.items() if key != "event_sort_key"}
    if isinstance(value, list):
        return [from_dynamodb(item) for item in value]
    return value
```

## Backfill Requests And Audit Events

This example shows the migration shape. In production, page through the source containers and write in batches.

```python examples/backfill_cosmos_to_dynamodb.py
import os

import boto3
from azure.cosmos import CosmosClient


cosmos = CosmosClient(os.environ["AZURE_COSMOS_ENDPOINT"], credential=os.environ["AZURE_COSMOS_KEY"])
database = cosmos.get_database_client(os.environ["AZURE_COSMOS_DATABASE"])

dynamodb = boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION", "us-east-1"))
requests_table = dynamodb.Table(os.environ["AWS_DYNAMODB_REQUESTS_TABLE"])
audit_table = dynamodb.Table(os.environ["AWS_DYNAMODB_AUDIT_EVENTS_TABLE"])


def copy_container(container_name: str, table, transform):
    container = database.get_container_client(container_name)
    copied = 0
    with table.batch_writer() as batch:
        for item in container.query_items("SELECT * FROM c", enable_cross_partition_query=True):
            batch.put_item(Item=transform(item))
            copied += 1
    print(f"Copied {copied} records from {container_name}")


copy_container("requests", requests_table, to_dynamodb)
copy_container(
    "audit_events",
    audit_table,
    lambda event: to_dynamodb({
        **event,
        "event_sort_key": f"{event['timestamp']}#{event['event_id']}",
    }),
)
```

## Verify With CLI Scans

The DynamoDB console can look empty if it is pointed at the wrong operation. Verify with the CLI before assuming data did not load.

```bash verify-dynamodb-state
aws dynamodb scan \
  --table-name "$AWS_DYNAMODB_REQUESTS_TABLE" \
  --limit 5 \
  --query "Items[].request_id.S"

aws dynamodb query \
  --table-name "$AWS_DYNAMODB_AUDIT_EVENTS_TABLE" \
  --key-condition-expression "request_id = :request_id" \
  --expression-attribute-values '{":request_id":{"S":"REQ-TEST-0001"}}'
```

## Migration Checkpoint

You should be able to load a request by ID, update its workflow state, and query the full audit trail in chronological order from DynamoDB.

