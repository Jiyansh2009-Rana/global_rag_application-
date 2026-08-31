import mimetypes
from fastapi import APIRouter, HTTPException, Response, Depends
from core.security import get_current_user, enforce_tenant_access
from service.common.models import TokenClaims
from service.documents.helper import (
    get_global_document_record,
    download_global_file,
    get_local_file,
)

router = APIRouter(prefix="/api/v1/documents", tags=["Documents"])

@router.get("/global/{doc_id}")
async def get_global_document(
    doc_id: str,
    current_user: TokenClaims = Depends(get_current_user)
):
    doc_record = get_global_document_record(doc_id)
    if not doc_record:
        raise HTTPException(status_code=404, detail="Document not found")

    org_id = doc_record["org_id"]
    filename = doc_record["file_name"]

    enforce_tenant_access(org_id, current_user)

    file_data = download_global_file(org_id, doc_id, filename)
    media_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

    return Response(
        content=file_data,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )

@router.get("/local/{doc_id}")
async def get_local_document(
    doc_id: str,
    current_user: TokenClaims = Depends(get_current_user)
):
    file_bytes, filename = get_local_file(current_user.user_id, doc_id)
    media_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )
