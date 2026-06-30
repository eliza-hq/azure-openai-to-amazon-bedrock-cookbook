import os

import boto3
from azure.cosmos import CosmosClient

from dynamodb_serialization import to_dynamodb


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
    lambda event: to_dynamodb(
        {
            **event,
            "event_sort_key": f"{event['timestamp']}#{event['event_id']}",
        }
    ),
)

