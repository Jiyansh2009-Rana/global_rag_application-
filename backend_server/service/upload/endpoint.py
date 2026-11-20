import json
import logging 
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends, Request, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from typing import List
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
    compensate_neon_chunks,
    compensate_supabase_metadata,
    check_file_in_registry,
    check_file_by_name_in_registry,
    update_file_in_registry,
    cleanup_removed_global_pages,
    store_file_in_registry,
    store_raw_file_global_supabase,
    store_raw_file_local_redis,
    process_set_global,
    process_set_local,
    check_file_hash_local_redis,
    store_file_hash_local_redis,
    store_local_alias_audit_redis,
    finalize_local_docmeta,
    resolve_local_document_status,
)
from service.admin.helper import check_org_global_upload_setting

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/upload", tags=["Upload"])


def is_user_allowed_global_upload(user_id: str, org_id: str, role: Role) -> bool:
    """Checks live in DB if the user or org has global upload enabled."""
    if role in [Role.ADMIN, Role.SUPER_ADMIN]:
        return True
    
    
    if check_org_global_upload_setting(org_id):
        return True
        
    
    if supabase_client and user_id:
        try:
            res = supabase_client.table("users").select("allow_global_upload").eq("id", user_id).execute()
            if res.data and res.data[0].get("allow_global_upload"):
                return True
        except Exception:
            pass
            
    return False


@router.get("/consent", response_model=ConsentMessage)
async def get_upload_consent(
    upload_mode: UploadMode = Query(...),
    current_user: TokenClaims = Depends(get_current_user)
):
    if upload_mode == UploadMode.GLOBAL:
        # LIVE PERMISSION CHECK
        if not is_user_allowed_global_upload(current_user.user_id, current_user.org_id, current_user.role):
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
            if not is_user_allowed_global_upload(current_user.user_id, current_user.org_id, current_user.role):
                raise HTTPException(status_code=403, detail="Global uploads disabled.")

    org_id = current_user.org_id
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    file_hash_val = file_hash(file_bytes)
    filename = file.filename or "unknown"
    doc_type = detect_document_type(filename, file_bytes)

    existing_global_doc = None
    local_status = None
    is_global_duplicate = False
    is_global_update = False
    if upload_mode == UploadMode.GLOBAL:
        existing_by_hash = check_file_in_registry(file_hash_val, org_id)
        if existing_by_hash:
            doc_id = existing_by_hash["id"]
            existing_global_doc = existing_by_hash
            is_global_duplicate = True
        else:
            # 2. Check by filename (content update / delta indexing)
            existing_by_name = check_file_by_name_in_registry(filename, org_id)
            if existing_by_name:
                doc_id = existing_by_name["id"]
                existing_global_doc = existing_by_name
                is_global_update = True
            else:
                # 3. Completely new document
                doc_id = generate_document_id()
    else:
        local_status = resolve_local_document_status(current_user.user_id, org_id, filename, file_hash_val)
        doc_id = local_status["doc_id"]

    if upload_mode == UploadMode.GLOBAL:
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
    elif not local_status["is_duplicate"]:
        store_raw_file_local_redis(current_user.user_id, doc_id, filename, file_bytes)

    async def process_and_stream_upload():
        total_chunks = 0
        try:
            # 1. Fast exit for local duplicates/aliases (skips OCR and chunking)
            if upload_mode == UploadMode.LOCAL and local_status and local_status.get("is_duplicate"):
                cached_chunks = local_status.get("chunks_created", 0)
                if cached_chunks > 0:
                    if local_status.get("is_alias"):
                        orig_name = local_status.get("original_filename") or "unknown"
                        alias_msg = f"Duplicate content detected. Alias recorded: {filename} (original: {orig_name})"
                        yield f"data: {json.dumps({'status': 'alias_detected', 'message': alias_msg})}\n\n"
                    yield f"data: {json.dumps({'status': 'upload_complete', 'doc_id': doc_id, 'total_chunks': 0})}\n\n"
                    return
            # 2. Extraction & OCR
            yield f"data: {json.dumps({'status': 'extracting_text', 'message': 'Running OCR and extracting text. This may take a moment for large files...'})}\n\n"
            extraction_task = asyncio.create_task(
                asyncio.to_thread(extract_text_by_type, doc_type, file_bytes, filename)
            )
            while not extraction_task.done():
                yield ": heartbeat\n\n"
                try:
                # Wait up to 1.0s for the task without blocking after completion
                    await asyncio.wait_for(asyncio.shield(extraction_task), timeout=1.0)
                except asyncio.TimeoutError:
                    pass
            try:
                raw_text, total_pages = extraction_task.result()
            except Exception as e:
                err_detail = getattr(e, "detail", str(e))
                yield f"data: {json.dumps({'status': 'error', 'message': f'Extraction failed: {err_detail}'})}\n\n"
                return
            pages = extract_pages_as_list(raw_text, doc_type)
            yield f"data: {json.dumps({'status': 'extraction_complete', 'total_pages': len(pages), 'filename': filename})}\n\n"
            # 3. Global alias detection audit
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
            # 4. Process page sets
                        # 4. Process page sets
            page_sets = split_pages_into_sets(pages, PAGES_PER_SET)
            total_chunks = 0
            total_pages_skipped = 0
            indexed_pages_in_session: List[int] = []


            for set_index, page_set in enumerate(page_sets):
                set_id = generate_set_id(doc_id, set_index)
                start_page = (set_index * PAGES_PER_SET) + 1
                page_offsets = list(range(start_page, start_page + len(page_set)))
                yield f"data: {json.dumps({'status': 'processing_set', 'set_id': set_id, 'pages': page_offsets})}\n\n"
                
                try:
                    if upload_mode == UploadMode.GLOBAL:
                        report = await asyncio.to_thread(
                            process_set_global, set_id, doc_id, org_id, page_set, page_offsets,
                            doc_type, current_user.user_id, upload_mode, current_user.role.value
                        )
                    else:
                        report = await asyncio.to_thread(
                            lambda: process_set_local(
                                set_id=set_id, doc_id=doc_id, user_id=current_user.user_id,
                                org_id=org_id, filename=filename, page_set=page_set,
                                page_offsets=page_offsets, doc_type=doc_type, file_hash_val=file_hash_val,
                            )
                        )
                except Exception as set_err:
                    # SAGA COMPENSATION: If set processing fails, roll back all Neon chunks added so far
                    if upload_mode == UploadMode.GLOBAL and indexed_pages_in_session:
                        logger.warning(f"[Saga] Rolling back {len(indexed_pages_in_session)} pages in Neon due to set failure: {set_err}")
                        await asyncio.to_thread(compensate_neon_chunks, doc_id, org_id, indexed_pages_in_session)
                    raise set_err
                
                total_chunks += report.get("chunks_created", 0)
                total_pages_skipped += report.get("pages_skipped", 0)
                if report.get("chunks_created", 0) > 0:
                    indexed_pages_in_session.extend(page_offsets)
                yield f"data: {json.dumps({'status': 'set_complete', 'set_id': set_id, 'report': report})}\n\n"
            # 5. Final post-processing (runs ONCE after all sets complete)
            if upload_mode == UploadMode.GLOBAL:
                is_new_document = not (is_global_duplicate or is_global_update)
                has_new_pages_indexed = total_chunks > 0

                if is_new_document or has_new_pages_indexed:
                    # Upload / overwrite file in Supabase Storage
                    try:
                        # 1. Supabase Storage upload
                        await asyncio.to_thread(
                            store_raw_file_global_supabase,
                            org_id=org_id, doc_id=doc_id, filename=filename,
                            file_bytes=file_bytes, delete_old=is_global_update
                        )
                        # 2. Supabase Registry commit
                        if is_new_document:
                            await asyncio.to_thread(
                                store_file_in_registry,
                                file_hash_val=file_hash_val, org_id=org_id, doc_id=doc_id,
                                file_name=filename, total_pages=len(pages), uploaded_by=current_user.user_id
                            )
                        elif is_global_update:
                            await asyncio.to_thread(update_file_in_registry, doc_id, file_hash_val, len(pages))
                            await asyncio.to_thread(cleanup_removed_global_pages, doc_id, org_id, len(pages))
                    except Exception as meta_err:
                        # SAGA COMPENSATION: Metadata or storage failed! Roll back Neon chunks
                        logger.critical(f"[Saga] Final Supabase commit failed. Executing compensating rollback on Neon: {meta_err}")
                        await asyncio.to_thread(compensate_neon_chunks, doc_id, org_id, indexed_pages_in_session)
                        await asyncio.to_thread(compensate_supabase_metadata, doc_id, org_id, filename, is_new_document)
                        yield f"data: {json.dumps({'status': 'error', 'code': 'METADATA_STORE_UNAVAILABLE', 'message': 'Storage or Registry write failed. Transaction rolled back safely.'})}\n\n"
                        return
                else:
                    logger.info(f"Skipping Supabase Storage upload for duplicate/fully-indexed file: {filename}")
            else:
                # Local mode: purge removed pages and record local:docmeta (untouched)
                await asyncio.to_thread(
                    finalize_local_docmeta,
                    current_user.user_id,
                    org_id,
                    doc_id,
                    filename,
                    file_hash_val,
                    len(pages),
                )

            # Only fail if 0 chunks created AND 0 pages were skipped by delta AND it is a brand-new file
            if total_chunks == 0 and total_pages_skipped == 0 and not is_global_duplicate and not is_global_update:
                yield f"data: {json.dumps({'status': 'error', 'message': '0 text chunks were generated from this document. Processing cannot index an empty or unscannable file.'})}\n\n"
                return

            yield f"data: {json.dumps({'status': 'upload_complete', 'doc_id': doc_id, 'total_chunks': total_chunks,'pages_skipped': total_pages_skipped})}\n\n"
        except Exception as e:
            logger.error(f"Upload processing failed for {filename}: {e}", exc_info=True)
            err_msg = getattr(e, "detail", str(e))
            yield f"data: {json.dumps({'status': 'error', 'message': f'Upload processing failed: {err_msg}'})}\n\n"
    return StreamingResponse(
        process_and_stream_upload(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )