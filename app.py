import json
from math import ceil
from typing import List
from fastapi import Depends, FastAPI, Query, Request, HTTPException
from datetime import datetime, timedelta
from fastapi_swagger import patch_fastapi
from loguru import logger
import hashlib
import hmac
from sqlalchemy import func, cast
from sqlalchemy.types import String

import uvicorn
from models import get_db, Session,Repository,Author,Asset,Release,WebhookLog,Plugin, save_releases_to_db, write_webhook_log_with_db
from github_utils import create_pr, webhook_install, webhook_release
from res_model import *
from auth import  router as auth_router, get_current_user
from authors import  router  as authors_router
from repositories import  router  as repositories_router

def verify_signature(payload_body, secret_token, signature_header):
    """Verify that the payload was sent from GitHub by validating SHA256.

    Raise and return 403 if not authorized.

    Args:
        payload_body: original request body to verify (request.body())
        secret_token: GitHub app webhook token (WEBHOOK_SECRET)
        signature_header: header received from GitHub (x-hub-signature-256)
    """
    if not signature_header:
        raise HTTPException(status_code=403, detail="x-hub-signature-256 header is missing!")
    hash_object = hmac.new(secret_token.encode('utf-8'), msg=payload_body, digestmod=hashlib.sha256)
    expected_signature = "sha256=" + hash_object.hexdigest()
    if not hmac.compare_digest(expected_signature, signature_header):
        raise HTTPException(status_code=403, detail="Request signatures didn't match!")



app = FastAPI(docs_url="/api/docs", redoc_url="/api/redoc", openapi_url="/api/openapi.json")

patch_fastapi(app)

# include auth routes (login / callback)
app.include_router(auth_router, prefix="/api")
# include authors routes
app.include_router(authors_router, prefix="/api")
# include repositories routes
app.include_router(repositories_router, prefix="/api")



@app.post("/api/webhook")
async def github_webhook(request: Request):
    # 验证请求来源 (可选)
    event = request.headers.get("X-GitHub-Event")
    logger.info(f"Received event: {event}")
    payload = await request.json()

    # 处理 GitHub App 安装创建事件：将仓库信息存入数据库
    if event == "installation" or event == "installation_repositories":
        return webhook_install(payload, event)

    # 现有：处理 release 事件
    elif event == "release":
       return webhook_release(payload, event) 
        
    return "skip"

@app.get("/", name="root")
async def root():
    return {"message": "GitHub App is running!"}

@app.get("/api/")
async def health_check():
    return {"message": "GitHub App is running!"}




@app.get("/api/releases/{release_id}", response_model=ReleaseModel, tags=["Releases"])
async def get_release(release_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    获取特定发布版本的详细信息
    """
    release = db.query(Release).filter(Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    return release

@app.get("/api/releases/{release_id}/assets", response_model=List[AssetModel], tags=["Assets"])
async def get_release_assets(
    release_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    获取特定发布版本的所有资源文件
    """
    release = db.query(Release).filter(Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    assets = db.query(Asset).filter(Asset.release_id == release_id).all()
    return assets


@app.patch("/api/releases/{release_id}/visible", tags=["Releases"])
async def set_release_visible(release_id: int, request: Request, db: Session = Depends(get_db), current_user: Author = Depends(get_current_user)):
    """
    更新 Release 的 `visible` 字段。只有管理员或仓库所属作者可以修改可见性。
    请求体: { "visible": true|false }
    """
    body = await request.json()
    if 'visible' not in body:
        raise HTTPException(status_code=400, detail="Missing 'visible' in request body")
    visible = bool(body.get('visible'))

    release = db.query(Release).filter(Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")

    # permission check: admin or repository owner
    repo = db.query(Repository).filter(Repository.id == release.repository_id).first()
    if not current_user.is_admin:
        if not repo or repo.author_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to change release visibility")

    release.visible = visible
    db.add(release)
    write_webhook_log_with_db(db, repository_id=repo.id,
                              author_id=current_user.id, event="",action="",
                              payload=f"设置仓库 {repo.full_name} 版本 {release.tag_name} 可见状态为 {release.visible}")
    db.commit()
    db.refresh(release)

    return {"id": release.id, "visible": release.visible}

@app.get("/api/assets/{asset_id}", response_model=AssetModel, tags=["Assets"])
async def get_asset(asset_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    获取特定资源文件的详细信息
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@app.get("/api/webhook_logs", response_model=List[WebhookLogModel], tags=["WebhookLogs"])
async def get_webhook_logs(
    db: Session = Depends(get_db),
    current_user: Author = Depends(get_current_user),
    day: str = Query(None, description="Date in YYYY-MM-DD format. Defaults to today."),
):
    """
    获取 webhook 日志：普通用户仅能看到与自身相关的日志，管理员可查看全部。
    支持按 `day` 查询（YYYY-MM-DD），默认当天。
    """
    # Determine the date to filter (default to today)
    if day:
        try:
            day_date = datetime.strptime(day, "%Y-%m-%d").date()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        day_date = datetime.now().date()

    start_dt = datetime(day_date.year, day_date.month, day_date.day)
    end_dt = start_dt + timedelta(days=1)

    # Return logs ordered from oldest -> newest (ascending) so frontend can display small->large
    query = db.query(WebhookLog).filter(WebhookLog.created_at >= start_dt, WebhookLog.created_at < end_dt).order_by(WebhookLog.created_at.asc())
    if not current_user.is_admin:
        query = query.filter(WebhookLog.author_id == current_user.id)
    logs = query.all()
    return logs


@app.get("/api/stats", tags=["Stats"])
async def get_stats(db: Session = Depends(get_db), current_user: Author = Depends(get_current_user)):
    """
    返回三个仪表盘统计项：
    - total_plugins: 已解析并保存到插件表的 plugin.json 数量
    - installed_repos: 已安装的仓库数量 (Repository.installed == True)
    - watched_repos: 被标记为 watched 的仓库数量 (Repository.watched == True)

    管理员返回全局统计，普通用户仅返回与其相关的统计。
    """
    try:
        if current_user.is_admin:
            # 仅统计关联到被标记为 watched 的仓库的插件，且 Release 为 visible
            total_plugins = db.query(Plugin).join(Plugin.repository).join(Plugin.release).filter(Repository.watched == True, Release.visible == True).count()
            installed_repos = db.query(Repository).filter(Repository.installed == True).count()
            watched_repos = db.query(Repository).filter(Repository.watched == True).count()
        else:
            installed_repos = db.query(Repository).filter(Repository.author_id == current_user.id, Repository.installed == True).count()
            watched_repos = db.query(Repository).filter(Repository.author_id == current_user.id, Repository.watched == True).count()
            # 仅统计属于当前用户且被 watched 的仓库下的 plugins，且 Release 为 visible
            total_plugins = db.query(Plugin).join(Plugin.repository).join(Plugin.release).filter(Repository.author_id == current_user.id, Repository.watched == True, Release.visible == True).count()

        return {
            "total_plugins": int(total_plugins or 0),
            "installed_repos": int(installed_repos or 0),
            "watched_repos": int(watched_repos or 0),
        }
    except Exception as e:
        logger.exception("Failed to compute stats")
        raise HTTPException(status_code=500, detail="Failed to compute stats")


@app.get("/api/store/plugins", tags=["Store"])
async def get_store_plugins(page: int = Query(1, ge=1), limit: int = Query(30, ge=1, le=200), db: Session = Depends(get_db)):
    """
    返回用于 Store Preview 的插件列表（分页）。
    仅返回属于被 `watched` 的仓库且对应 Release `visible==True` 的插件。
    """
    try:
        # Count distinct plugins (grouped by plugin identifier) instead of counting all versions
        distinct_expr = func.coalesce(Plugin.plugin_id, cast(Plugin.id, String))
        total = db.query(func.count(func.distinct(distinct_expr))).join(Plugin.release).join(Plugin.repository).filter(
            Release.visible == True, Repository.watched == True).scalar() or 0
        pages = ceil(total / limit) if total and limit else 1

        # Build a subquery that selects distinct plugin identifiers and the latest created_at per plugin
        distinct_expr = func.coalesce(Plugin.plugin_id, cast(Plugin.id, String))
        subq = db.query(
            distinct_expr.label('pid'),
            func.max(Plugin.created_at).label('last_updated')
        ).join(Plugin.release).join(Plugin.repository).filter(
            Release.visible == True, Repository.watched == True
        ).group_by(distinct_expr).order_by(func.max(Plugin.created_at).desc()).offset((page - 1) * limit).limit(limit).all()

        # Extract the paged plugin ids in order
        paged_pids = [r.pid for r in subq]

        # If no pids returned, return empty page
        if not paged_pids:
            return {
                "total": total,
                "page": page,
                "limit": limit,
                "pages": pages,
                "items": {}
            }

        # Fetch all Plugin rows that belong to the selected plugin ids, ordered by created_at desc
        items = db.query(Plugin).join(Plugin.release).join(Plugin.repository).filter(
            Release.visible == True, Repository.watched == True, distinct_expr.in_(paged_pids)
        ).order_by(Plugin.created_at.desc()).all()

        results = []
        for p in items:
            # default asset extraction
            zip_url = None
            try:
                rel = p.release
                if rel and rel.assets:
                    for a in rel.assets:
                        if a.name and a.name.lower().endswith('.sdow'):
                            zip_url = a.browser_download_url
                            break
            except Exception:
                zip_url = None

            # Try to construct final model from raw_json if available
            plugin_obj = None
            if getattr(p, 'raw_json', None):
                try:
                    plugin_obj = json.loads(p.raw_json)
                except Exception:
                    plugin_obj = None

            # helper to safely read nested values with common alternate keys
            def _get(obj, *keys, default=None):
                if not obj:
                    return default
                for k in keys:
                    if k in obj:
                        return obj.get(k)
                return default

            if plugin_obj:
                # Build from plugin.json content, with fallbacks to DB fields
                affiliation = _get(plugin_obj, 'AffiliationTag', None) or {
                    "Name": (p.tags[0].tag if p.tags and len(p.tags) > 0 else "") ,
                    "BackgroundHex": p.background_color or "#111827",
                    "ForegroundHex": "#FFFFFF",
                    "Icon": "",
                    "PluginId": plugin_obj.get('Id') or p.plugin_id
                }

                deps = []
                raw_deps = _get(plugin_obj, 'Dependencies', 'dependencies', default=[]) or []
                for d in raw_deps:
                    try:
                        dep_id = d.get('Id') if isinstance(d, dict) else d
                        need = d.get('Need') if isinstance(d, dict) else None
                        deps.append({"Id": dep_id, "Need": need})
                    except Exception:
                        continue

                results.append({
                    "Id": _get(plugin_obj, 'Id', 'id') or p.plugin_id or str(p.id),
                    "Name": _get(plugin_obj, 'Name', 'name') or p.name,
                    "Version": _get(plugin_obj, 'Version', 'version') or p.version,
                    "Description": _get(plugin_obj, 'Description', 'description') or p.description,
                    "Authors": _get(plugin_obj, 'Authors', 'authors') or p.authors,
                    "WebUri": _get(plugin_obj, 'WebUri', 'web_uri') or p.web_uri,
                    "Logo": _get(plugin_obj, 'Logo', 'logo') or p.logo,
                    "PluginManage": _get(plugin_obj, 'PluginManage', default=None),
                    "AffiliationTag": affiliation,
                    "SdkVersion": _get(plugin_obj, 'SdkVersion', 'sdk_version') or p.sdk_version,
                    "DllName": _get(plugin_obj, 'DllName', default=None),
                    "Dependencies": deps,
                    "Download": zip_url,
                    "LastUpdated": p.created_at.isoformat() if getattr(p, 'created_at', None) else None
                })
            else:
                # Fallback: construct from DB fields (previous behavior)
                tag_name = None
                if p.tags and len(p.tags) > 0:
                    try:
                        tag_name = p.tags[0].tag
                    except Exception:
                        tag_name = None

                affiliation = {
                    "Name": tag_name or "",
                    "BackgroundHex": p.background_color or "#111827",
                    "ForegroundHex": "#FFFFFF",
                    "Icon": "",
                    "PluginId": p.plugin_id
                }

                deps = []
                for d in (p.dependencies or []):
                    deps.append({"Id": d.dep_id, "Need": d.need})

                results.append({
                    "Id": p.plugin_id or str(p.id),
                    "Name": p.name,
                    "Version": p.version,
                    "Description": p.description,
                    "Authors": p.authors,
                    "WebUri": p.web_uri,
                    "Logo": p.logo,
                    "PluginManage": None,
                    "AffiliationTag": affiliation,
                    "SdkVersion": p.sdk_version,
                    "DllName": None,
                    "Dependencies": deps,
                    "Download": zip_url,
                    "LastUpdated": p.created_at.isoformat() if getattr(p, 'created_at', None) else None
                })

        grouped = {}
        for r in results:
            pid = r.get('Id') or r.get('id') or ""
            if pid not in grouped:
                grouped[pid] = []
            grouped[pid].append(r)

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
            "items": grouped
        }
    except Exception as e:
        logger.exception("Failed to fetch store plugins")
        raise HTTPException(status_code=500, detail="Failed to fetch plugins for store preview")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8100)