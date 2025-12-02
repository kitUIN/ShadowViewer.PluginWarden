
from math import ceil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from requests import Session


from auth import get_admin, get_current_user
from models import Author, Release, Repository, get_db
from res_model import *


router = APIRouter(prefix="/repositories", tags=["Repositories"])



@router.get("/", response_model=PaginatedResponse[RepositoryBasicModel], tags=["Repositories"]) 
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

@router.get("/{repo_id}", response_model=RepositoryModel, tags=["Repositories"])
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

@router.get("/search", response_model=List[RepositoryBasicModel], tags=["Search"])
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