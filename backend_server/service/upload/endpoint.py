import json
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends, Request, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse

from core.config import PAGES_PER_SET
from core.database import supabase_client
from core.security import get_current_user
from service.common.models import (
    UploadMode,
    ConsentMessage,
    TokenClaims,
    Role,
)
from service.common.helper import (
    file_hash,
    generate_document_id,
    generate_set_id,
    extract_pages_as_list,
    split_pages_into_sets,
)
from service.upload.helper import (
    detect_document_type,
    extract_text_by_type,
    check_file_in_registry,
    store_file_in_registry,
    store_raw_file_global_supabase,
    store_raw_file_local_redis,
    process_set_global,
    process_set_local,
    check_file_hash_local_redis,
    store_file_hash_local_redis,
    store_local_alias_audit_redis,
)
from service.admin.helper import check_org_global_upload_setting

router = APIRouter(prefix="/api/v1/upload", tags=["Upload"])

@router.get("/consent", response_model=ConsentMessage)
async def get_upload_consent(
    upload_mode: UploadMode = Query(...),
    current_user: TokenClaims = Depends(get_current_user)
):
    if upload_mode == UploadMode.GLOBAL:
        if current_user.role not in [Role.ADMIN, Role.SUPER_ADMIN]:
            org_allowed = check_org_global_upload_setting(current_user.org_id)
            user_allowed = getattr(current_user, "allow_global_upload", False)
        
        # Allowed if either org-wide setting is ON OR this specific user was granted permission
            if not (org_allowed or user_allowed):
                raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Global upload permission is disabled for your account. Contact your administrator."
                )
        return ConsentMessage(
            upload_mode=UploadMode.GLOBAL,
            title="Global Upload Selected",
            message=(
                "You have selected Global Upload. Your document will be permanently stored and made "
                "available to all authorised users within your organisation. It will remain accessible "
                "until manually removed by an Admin. Please ensure the document complies with your "
                "organisation's data retention and compliance policies."
            ),
            confirm_label="Got it, Upload Globally",
            warning_label=None,
        )
    return ConsentMessage(
        upload_mode=UploadMode.LOCAL,
        title="Local Upload Selected",
        message=(
            "You have selected Local Upload. Your document will be stored privately for this session only — "
            "no other user, including Admins and Super Admins, can access or query it. After 1 hour "
            "(session expiry), your data will be automatically and permanently erased. It cannot be recovered "
            "after that point."
        ),
        confirm_label="Got it, Upload Locally",
        warning_label="⚠️ Data will be erased after session ends (1 hour).",
    )

@router.post("/document")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    upload_mode: UploadMode = Form(...),
    confirmed: bool = Form(...),
    current_user: TokenClaims = Depends(get_current_user),
):
    if not confirmed:
        raise HTTPException(status_code=400, detail="Upload requires explicit consent.")

    if upload_mode == UploadMode.GLOBAL:
        if current_user.role not in [Role.ADMIN, Role.SUPER_ADMIN]:
            if not check_org_global_upload_setting(current_user.org_id):
                raise HTTPException(status_code=403, detail="Global uploads disabled.")

    org_id = current_user.org_id
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    file_hash_val = file_hash(file_bytes)
    filename = file.filename or "unknown"
    doc_type = detect_document_type(filename, file_bytes)

    existing_global_doc = None
    if upload_mode == UploadMode.GLOBAL:
        existing_global_doc = check_file_in_registry(file_hash_val, org_id)
        if existing_global_doc:
            doc_id = existing_global_doc["id"]
        else:
            doc_id = generate_document_id()
    else:
        doc_id = generate_document_id()

    if upload_mode == UploadMode.GLOBAL:
        await asyncio.to_thread(store_raw_file_global_supabase, org_id, doc_id, filename, file_bytes)
        if supabase_client:
            await asyncio.to_thread(
                lambda: supabase_client.table("audit_log").insert({
                    "event_type": "global_upload_started",
                    "user_id": current_user.user_id,
                    "org_id": org_id,
                    "doc_id": doc_id,
                    "file_name": filename,
                    "file_hash": file_hash_val,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }).execute()
            )
    else:
        store_raw_file_local_redis(current_user.user_id, doc_id, filename, file_bytes)

    async def process_and_stream_upload():
        yield f"data: {json.dumps({'status': 'extracting_text', 'message': 'Running OCR and extracting text. This may take a moment for large files...'})}\n\n"

        extraction_task = asyncio.create_task(
            asyncio.to_thread(extract_text_by_type, doc_type, file_bytes, filename)
        )

        while not extraction_task.done():
            yield ": heartbeat\n\n"
            await asyncio.sleep(15)

        try:
            raw_text, total_pages = extraction_task.result()
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': f'Extraction failed: {e}'})}\n\n"
            return

        pages = extract_pages_as_list(raw_text, doc_type)

        yield f"data: {json.dumps({'status': 'extraction_complete', 'total_pages': len(pages), 'filename': filename})}\n\n"

        if upload_mode == UploadMode.GLOBAL and existing_global_doc:
            original_filename = existing_global_doc.get("file_name", "unknown")
            if original_filename and original_filename != filename:
                if supabase_client:
                    try:
                        await asyncio.to_thread(
                            lambda: supabase_client.table("audit_log").insert({
                                "event_type": "duplicate_file_detected",
                                "doc_id": doc_id,
                                "alias_filename": filename,
                                "original_filename": original_filename,
                                "file_hash": file_hash_val,
                                "file_name": filename,
                                "doc_type": doc_type.value,
                                "user_id": current_user.user_id,
                                "org_id": org_id,
                                "role": current_user.role.value,
                                "timestamp": datetime.now(timezone.utc).isoformat()
                            }).execute()
                        )
                    except Exception as e:
                        logger.error(f"Global alias audit log write failed: {e}")
                yield f"data: {json.dumps({'status': 'alias_detected', 'message': f'Duplicate content detected. Alias recorded: {filename} (original: {original_filename})'})}\n\n"

        if upload_mode == UploadMode.LOCAL:
            existing_doc_raw = check_file_hash_local_redis(current_user.user_id, file_hash_val)
            if existing_doc_raw:
                try:
                    existing_doc = json.loads(existing_doc_raw)
                    original_filename = existing_doc.get("file_name")
                    if original_filename and original_filename != filename:
                        store_local_alias_audit_redis(
                            user_id=current_user.user_id, org_id=org_id, doc_id=existing_doc["doc_id"],
                            alias_filename=filename, original_filename=original_filename, file_hash=file_hash_val
                        )
                        yield f"data: {json.dumps({'status': 'alias_detected', 'message': f'Duplicate content. Alias recorded: {filename}'})}\n\n"
                except Exception:
                    pass
            else:
                store_file_hash_local_redis(current_user.user_id, file_hash_val, doc_id, filename)

        page_sets = split_pages_into_sets(pages, PAGES_PER_SET)
        total_chunks = 0

        for set_index, page_set in enumerate(page_sets):
            set_id = generate_set_id(doc_id, set_index)
            start_page = (set_index * PAGES_PER_SET) + 1
            page_offsets = list(range(start_page, start_page + len(page_set)))

            yield f"data: {json.dumps({'status': 'processing_set', 'set_id': set_id, 'pages': page_offsets})}\n\n"

            if upload_mode == UploadMode.GLOBAL:
                report = await asyncio.to_thread(
                    process_set_global, set_id, doc_id, org_id, page_set, page_offsets,
                    doc_type, current_user.user_id, upload_mode, current_user.role.value
                )
            else:
                report = await asyncio.to_thread(
                    lambda: process_set_local(
                        set_id=set_id,
                        doc_id=doc_id,
                        user_id=current_user.user_id,
                        org_id=org_id,
                        filename=filename,
                        page_set=page_set,
                        page_offsets=page_offsets,
                        doc_type=doc_type,
                    )
                )

            total_chunks += report.get("chunks_created", 0)
            if upload_mode == UploadMode.GLOBAL and not existing_global_doc:

                await asyncio.to_thread(
                store_file_in_registry,
                file_hash_val=file_hash_val,
                org_id=org_id,
                doc_id=doc_id,
                file_name=filename,
                total_pages=len(pages),
                uploaded_by=current_user.user_id
            )
            yield f"data: {json.dumps({'status': 'set_complete', 'set_id': set_id, 'report': report})}\n\n"

        yield f"data: {json.dumps({'status': 'upload_complete', 'doc_id': doc_id, 'total_chunks': total_chunks})}\n\n"

    return StreamingResponse(
        process_and_stream_upload(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
