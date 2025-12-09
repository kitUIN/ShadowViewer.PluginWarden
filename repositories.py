
from math import ceil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session


from auth import get_current_user
from models import Author, Release, Repository, get_db, write_webhook_log_with_db
from res_model import *


router = APIRouter(prefix="/repositories", tags=["Repositories"])



@router.get("/installed_exists", tags=["Repositories"])
async def installed_exists(
    db: Session = Depends(get_db),
    current_user: Author = Depends(get_current_user)
):
    """
    检查数据库中是否存在与当前用户关联且已安装的仓库
    Returns: {"installed_repo_exists": bool}
    """
    installed_repo_exists = db.query(Repository).filter(Repository.author_id == current_user.id, Repository.installed == True).first() is not None
    return {"installed_repo_exists": installed_repo_exists}


@router.get("/search", response_model=List[RepositoryBasicModel], tags=["Search"])
async def search_repositories(
    q: str = Query(..., description="搜索关键词"),
    db: Session = Depends(get_db),
    current_user: Author = Depends(get_current_user)
):
    """
    搜索仓库
    """
    search_term = f"%{q}%"
    base_q = db.query(Repository).filter(
        Repository.name.like(search_term) | Repository.full_name.like(search_term)
    )
    if not getattr(current_user, "is_admin", False):
        base_q = base_q.filter(Repository.author_id == current_user.id)
    repositories = base_q.all()
    
    result = []
    for repo in repositories:
        release_count = db.query(Release).filter(Release.repository_id == repo.id).count()
        repo_model = RepositoryBasicModel(
            id=repo.id,
            name=repo.name,
            full_name=repo.full_name,
            html_url=repo.html_url,
            release_count=release_count,
            author=repo.author
        )
        result.append(repo_model)
    
    return result



@router.get("/", response_model=PaginatedResponse[RepositoryBasicModel], tags=["Repositories"]) 
async def get_repositories(
    page: int = Query(1, ge=1, description="页码（从1开始）"),
    limit: int = Query(10, ge=1, le=1000, description="每页条数"),
    db: Session = Depends(get_db),
    current_user: Author = Depends(get_current_user)
):
    """
    分页获取仓库的基本信息列表
    """
    base_q = db.query(Repository)
    if not getattr(current_user, "is_admin", False):
        base_q = base_q.filter(Repository.author_id == current_user.id)

    total = base_q.count()
    skip = (page - 1) * limit
    pages = ceil(total / limit) if total else 1
    repositories = base_q.offset(skip).limit(limit).all()

    items = []
    for repo in repositories: 
        repo_model = RepositoryBasicModel(
            id=repo.id,
            name=repo.name,
            watched=repo.watched,
            full_name=repo.full_name,
            html_url=repo.html_url,
            releases=repo.releases,
            author=repo.author
        )
        items.append(repo_model)

    return PaginatedResponse[RepositoryBasicModel](
        total=total,
        page=page,
        limit=limit,
        pages=pages,
        items=items
    )


@router.get("/{repo_id}", response_model=RepositoryModel, tags=["Repositories"])
async def get_repository(repo_id: int, db: Session = Depends(get_db), current_user: Author = Depends(get_current_user)):
    """
    获取特定仓库的详细信息，包括所有发布版本
    """
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    # 非管理员只能访问属于自己的仓库
    if not getattr(current_user, "is_admin", False) and repo.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return RepositoryModel(
            id=repo.id,
            name=repo.name,
            watched=repo.watched,
            full_name=repo.full_name,
            html_url=repo.html_url,
            releases=repo.releases,
            author=repo.author
        )


class WatchedUpdate(BaseModel):
    watched: bool


@router.patch("/{repo_id}/watched", response_model=RepositoryBasicModel, tags=["Repositories"])
async def update_repo_watched(
    repo_id: int,
    payload: WatchedUpdate,
    db: Session = Depends(get_db),
    current_user: Author = Depends(get_current_user)
):
    """
    Update the `watched` flag for a repository. Only the repository owner or an admin can modify this flag.
    """
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Permission: only admin or owner may modify
    if not getattr(current_user, "is_admin", False) and repo.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    repo.watched = bool(payload.watched)
    db.add(repo)
    write_webhook_log_with_db(db, repository_id=repo.id,
                              author_id=current_user.id, event="",action="",
                              payload=f"设置仓库 {repo.full_name} 插件可见状态为 {repo.watched}")
    db.commit()
    db.refresh(repo)

    return RepositoryBasicModel(
        id=repo.id,
        name=repo.name,
        full_name=repo.full_name,
        html_url=repo.html_url,
        watched=repo.watched,
        releases=repo.releases,
        author=repo.author
    )