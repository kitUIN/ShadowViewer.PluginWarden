from math import ceil
from typing import List
from fastapi import APIRouter, Query, Depends
from models import Plugin, get_db

from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from res_model import PaginatedResponse, PluginModel

router = APIRouter(prefix="/store", tags=["Store"])
 

@router.get("/plugins", response_model=PaginatedResponse[PluginModel], tags=["Store"])
async def get_store_plugins(page: int = Query(1, ge=1), limit: int = Query(30, ge=1, le=200), db: Session = Depends(get_db)):
    # 子查询：每个 plugin_id 的最新版本
    latest_version_subq = (
        db.query(
            Plugin.plugin_id.label("plugin_id"),
            func.max(Plugin.version).label("latest_version")
        ).group_by(
            Plugin.plugin_id
        ).subquery()
    )

    # 主查询：只取最新版本的 Plugin
    query = (
        db.query(
            Plugin,
            func.group_concat(Plugin.version).label("versions")
        ).join(
            latest_version_subq,
            (Plugin.plugin_id == latest_version_subq.c.plugin_id)
            & (Plugin.version == latest_version_subq.c.latest_version)
        ).order_by(desc(Plugin.id))
    )

    total = query.count()
    skip = (page - 1) * limit
    pages = ceil(total / limit) if total else 1
    # 分页
    plugins = query.offset(skip).limit(limit).all()

    # 将查询结果 (Plugin, versions) 映射为 PluginModel
    results: List[PluginModel] = []
    for row in plugins:
        # row 结构： (Plugin, versions)
        plugin_obj: Plugin = row[0]
        versions_concat = row[1]
        versions_list = versions_concat.split(',') if versions_concat else []
        # 依赖
        dependencies = []
        for d in (plugin_obj.dependencies or []):
            dependencies.append({"Id": d.dep_id, "Need": d.need})

        last_updated = None
        try:
            if plugin_obj.created_at:
                last_updated = plugin_obj.created_at.isoformat()
        except Exception:
            last_updated = None
        zip_url = None
        try:
            rel = plugin_obj.release
            if rel and rel.assets:
                for a in rel.assets:
                    if a.name and a.name.lower().endswith('.sdow'):
                        zip_url = a.browser_download_url
                        break
        except Exception:
            zip_url = None
        tags = [i.tag for i in plugin_obj.tags] if plugin_obj.tags else []
        pm = PluginModel(
            Id=plugin_obj.plugin_id,
            Name=plugin_obj.name,
            Version=plugin_obj.version,
            Versions=versions_list,
            Tags=tags,
            Description=plugin_obj.description,
            Authors=plugin_obj.authors,
            WebUri=plugin_obj.web_uri,
            Logo=plugin_obj.logo,
            SdkVersion=plugin_obj.sdk_version,
            Dependencies=dependencies,
            DownloadUrl=zip_url,
            LastUpdated=last_updated,
        )
        results.append(pm)

    return PaginatedResponse[PluginModel](
        total=total,
        pages=pages,
        page=page,
        limit=limit,
        items=results
    )

