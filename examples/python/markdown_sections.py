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

