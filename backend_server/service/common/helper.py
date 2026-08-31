import hashlib
import uuid
from typing import List, Union
from core.config import PAGES_PER_SET
from service.common.models import DocumentType

def file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()

def page_hash(page_content: Union[str, bytes]) -> str:
    if isinstance(page_content, str):
        page_content = page_content.encode('utf-8')
    return hashlib.md5(page_content).hexdigest()

def generate_chunk_id() -> str:
    return f"chunk_{uuid.uuid4().hex[:12]}"

def generate_document_id() -> str:
    return f"doc_{uuid.uuid4().hex[:12]}"

def generate_set_id(doc_id: str, set_index: int) -> str:
    return f"{doc_id}_set_{set_index:04d}"

def extract_pages_as_list(raw_text: str, doc_type: DocumentType) -> List[str]:
    if doc_type == DocumentType.PPTX:
        slides = raw_text.split("---SLIDE_BREAK---")
        return [s.strip() for s in slides]
    if "---PAGE_BREAK---" in raw_text:
        pages = raw_text.split("---PAGE_BREAK---")
        return [p.strip() for p in pages]
    
    text = raw_text.strip()
    if not text:
        return [""]
    chunk_size = 3000
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]

def split_pages_into_sets(
    pages: List[str], pages_per_set: int = PAGES_PER_SET
) -> List[List[str]]:
    return [pages[i : i + pages_per_set] for i in range(0, len(pages), pages_per_set)]
