import argparse
from pathlib import Path

import nbformat
from nbclient import NotebookClient


def execute_notebook(input_path: Path, output_path: Path, timeout: int) -> None:
    notebook = nbformat.read(input_path, as_version=4)
    client = NotebookClient(
        notebook,
        timeout=timeout,
        kernel_name="python3",
        resources={"metadata": {"path": str(input_path.parent.parent)}},
    )
    client.execute()
    nbformat.write(notebook, output_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Execute a notebook to a separate output file.")
    parser.add_argument("notebook", type=Path)
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--timeout", type=int, default=180)
    args = parser.parse_args()

    input_path = args.notebook.resolve()
    output_path = args.output or input_path.with_suffix(".executed.ipynb")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    execute_notebook(input_path, output_path.resolve(), args.timeout)
    print(f"Executed {input_path} -> {output_path}")


if __name__ == "__main__":
    main()
