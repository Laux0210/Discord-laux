"""Converte o corpo OOXML do contexto histórico sem alterar sua redação.

Uso: python scripts/converter_contexto.py --source CAMINHO [--check]
Somente biblioteca padrão. --check não grava arquivos.
"""

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import re
import shutil
import xml.etree.ElementTree as ET
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "docs" / "contexto"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def inline(element, relationships):
    if element.tag == W + "t":
        return element.text or ""
    if element.tag == W + "tab":
        return "\t"
    if element.tag == W + "br":
        return "" if element.get(W + "type") == "page" else "<br>"
    content = "".join(inline(child, relationships) for child in element)
    if element.tag == W + "hyperlink":
        target = relationships.get(element.get(R + "id"))
        if target:
            return f"[{content}]({target})"
    return content


def paragraph(element, relationships):
    text = inline(element, relationships)
    style_node = element.find(W + "pPr/" + W + "pStyle")
    style = style_node.get(W + "val", "") if style_node is not None else ""
    if style == "Title":
        return "# " + text
    if style.startswith("Heading"):
        return "#" * (int(style.removeprefix("Heading")) + 1) + " " + text
    if style == "ListBullet":
        return "- " + text
    if element.find(W + "pPr/" + W + "numPr") is not None:
        raise ValueError("Numeração explícita não suportada: revisar antes de converter.")
    return text


def extract(data):
    with ZipFile(io.BytesIO(data)) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
        relationships = {
            node.get("Id"): node.get("Target")
            for node in ET.fromstring(archive.read("word/_rels/document.xml.rels"))
            if node.get("Type", "").endswith("/hyperlink")
        }
        furniture = {
            name: ["".join(p.itertext()) for p in ET.fromstring(archive.read(name)).iter(W + "p")]
            for name in archive.namelist()
            if re.fullmatch(r"word/(header|footer)\d+\.xml", name)
        }
    body = document.find(W + "body")
    blocks = []
    for element in body:
        if element.tag == W + "p":
            value = paragraph(element, relationships)
            if value:
                blocks.append(value)
        elif element.tag == W + "tbl":
            if list(element.iter(W + "gridSpan")) or list(element.iter(W + "vMerge")):
                raise ValueError("Tabela com mesclagem não suportada: revisar antes de converter.")
            rows = []
            for row in element.findall(W + "tr"):
                cells = []
                for cell in row.findall(W + "tc"):
                    value = "<br>".join(paragraph(p, relationships) for p in cell.findall(W + "p"))
                    cells.append(value.replace("|", "\\|"))
                rows.append(cells)
            if not rows or any(len(row) != len(rows[0]) for row in rows):
                raise ValueError("Tabela irregular não suportada.")
            rendered = ["| " + " | ".join(row) + " |" for row in rows]
            rendered.insert(1, "| " + " | ".join("---" for _ in rows[0]) + " |")
            blocks.append("\n".join(rendered))
        elif element.tag != W + "sectPr":
            raise ValueError(f"Elemento do corpo não suportado: {element.tag}")
    markdown = "\n\n".join(blocks) + "\n"
    styles = Counter(node.get(W + "val") for node in body.iter(W + "pStyle"))
    urls = re.findall(r"https?://[^\s<>]+", " ".join(node.text or "" for node in body.iter(W + "t")))
    counts = {
        "paragraphs": len(list(body.iter(W + "p"))),
        "tables": len(list(body.iter(W + "tbl"))),
        "table_rows": len(list(body.iter(W + "tr"))),
        "table_cells": len(list(body.iter(W + "tc"))),
        "title": styles["Title"],
        "heading1": styles["Heading1"],
        "heading2": styles["Heading2"],
        "list_bullets": styles["ListBullet"],
        "urls": len(urls),
        "external_hyperlinks": len(relationships),
    }
    # Validação independente do renderizador: cada trecho textual deve permanecer.
    unescaped = markdown.replace("\\|", "|")
    missing = [node.text for node in body.iter(W + "t") if node.text and node.text not in unescaped]
    if missing:
        raise ValueError(f"Trechos OOXML ausentes na saída: {missing!r}")
    return markdown, counts, furniture, urls


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    data = args.source.read_bytes()
    markdown, counts, furniture, urls = extract(data)
    encoded = markdown.encode("utf-8")
    markdown_path = DEST / "contexto-mestre.md"
    copy_path = DEST / "fontes" / "contexto-mestre.docx"
    metadata_path = DEST / "fonte.json"
    if args.check:
        assert markdown_path.read_bytes() == encoded, "Markdown difere da conversão da fonte"
        assert copy_path.read_bytes() == data, "Cópia DOCX difere da fonte"
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        assert metadata["source_sha256"] == sha256(data), "Hash da fonte mudou"
        assert metadata["markdown_sha256"] == sha256(encoded), "Hash Markdown difere"
        assert metadata["counts"] == counts, "Contagens divergem"
        assert metadata["headers_and_footers"] == furniture, "Cabeçalhos/rodapés divergem"
        assert metadata["urls_in_body"] == urls, "URLs divergem"
    else:
        if any(p.exists() for p in (markdown_path, copy_path, metadata_path)):
            raise FileExistsError("Saídas existentes: use --check; não sobrescrever fonte histórica.")
        copy_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(args.source, copy_path)
        markdown_path.write_bytes(encoded)
        metadata = {
            "source_path": str(args.source.resolve()),
            "source_sha256": sha256(data),
            "source_bytes": len(data),
            "copied_source": "fontes/contexto-mestre.docx",
            "converted_at_utc": datetime.now(timezone.utc).isoformat(),
            "source_document_version": "1.0 — 14 de outubro de 2026",
            "method": "Python stdlib; OOXML word/document.xml; ordem original do corpo",
            "markdown_sha256": sha256(encoded),
            "counts": counts,
            "urls_in_body": urls,
            "headers_and_footers": furniture,
            "limitations": [
                "Markdown não preserva paginação, fontes, cores, dimensões ou layout visual do Word.",
                "Cabeçalho e rodapé preservados neste JSON; campo PAGE dinâmico não é renderizado.",
                "Heading1 vira H2 e Heading2 vira H3 abaixo do título H1; redação preservada.",
                "Não houve renderização visual no Word nem incorporação de decisões posteriores.",
            ],
        }
        metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"check": args.check, "source_sha256": sha256(data), "counts": counts}, ensure_ascii=False))


if __name__ == "__main__":
    main()
