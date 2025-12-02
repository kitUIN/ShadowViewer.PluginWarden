import json
from math import ceil
from typing import List
from fastapi import Depends, FastAPI, Query, Request, HTTPException
from fastapi_swagger import patch_fastapi
from loguru import logger
import hashlib
import hmac

import uvicorn
from models import get_db, Session,Repository,Author,Asset,Release, save_releases_to_db
from github_utils import create_pr, webhook_install, webhook_release
from res_model import *
from auth import  router as auth_router, get_current_user
from authors import  router  as authors_router

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



@app.post("/api/webhook")
async def github_webhook(request: Request):
    # 验证请求来源 (可选)
    event = request.headers.get("X-GitHub-Event")
    logger.info(f"Received event: {event}")
    payload = await request.json()

    # 处理 GitHub App 安装创建事件：将仓库信息存入数据库
    if event == "installation":
        return webhook_install(payload)

    # 现有：处理 release 事件
    elif event == "release":
       return webhook_release(payload) 
        
    return "skip"

@app.get("/", name="root")
async def root():
    return {"message": "GitHub App is running!"}

@app.get("/api/")
async def health_check():
    return {"message": "GitHub App is running!"}



@app.get("/api/repositories", response_model=PaginatedResponse[RepositoryBasicModel], tags=["Repositories"]) 
async def get_repositories(
    page: int = Query(1, ge=1, description="页码（从1开始）"),
    limit: int = Query(10, ge=1, le=1000, description="每页条数"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    分页获取仓库的基本信息列表
    """
    total = db.query(Repository).count()
    skip = (page - 1) * limit
    pages = ceil(total / limit) if total else 1
    repositories = db.query(Repository).offset(skip).limit(limit).all()

    items = []
    for repo in repositories: 
        releases = [t for t, in db.query(Release).filter(Release.repository_id == repo.id).values(Release.tag_name)]
        print(releases)
        repo_model = RepositoryBasicModel(
            id=repo.id,
            name=repo.name,
            full_name=repo.full_name,
            html_url=repo.html_url,
            releases=releases, 
        )
        items.append(repo_model)

    return PaginatedResponse[RepositoryBasicModel](
        total=total,
        page=page,
        limit=limit,
        pages=pages,
        items=items
    )

@app.get("/api/repositories/{repo_id}", response_model=RepositoryModel, tags=["Repositories"])
async def get_repository(repo_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    获取特定仓库的详细信息，包括所有发布版本
    """
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return RepositoryModel(
            id=repo.id,
            name=repo.name,
            full_name=repo.full_name,
            html_url=repo.html_url,
            releases=repo.releases, 
        )

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

@app.get("/api/assets/{asset_id}", response_model=AssetModel, tags=["Assets"])
async def get_asset(asset_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    获取特定资源文件的详细信息
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@app.get("/api/search/repositories", response_model=List[RepositoryBasicModel], tags=["Search"])
async def search_repositories(
    q: str = Query(..., description="搜索关键词"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    搜索仓库
    """
    search_term = f"%{q}%"
    repositories = db.query(Repository).filter(
        Repository.name.like(search_term) | Repository.full_name.like(search_term)
    ).all()
    
    result = []
    for repo in repositories:
        release_count = db.query(Release).filter(Release.repository_id == repo.id).count()
        repo_model = RepositoryBasicModel(
            id=repo.id,
            name=repo.name,
            full_name=repo.full_name,
            html_url=repo.html_url,
            release_count=release_count
        )
        result.append(repo_model)
    
    return result
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8100)