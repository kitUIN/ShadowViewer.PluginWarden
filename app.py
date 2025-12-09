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
       return webhook_release(payload) 
        
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

@app.get("/api/assets/{asset_id}", response_model=AssetModel, tags=["Assets"])
async def get_asset(asset_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    获取特定资源文件的详细信息
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8100)