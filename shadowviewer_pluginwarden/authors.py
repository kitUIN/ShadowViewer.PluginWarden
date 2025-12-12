
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session


from auth import get_admin, get_current_user
from models import Author, get_db
from res_model import AuthorModel


router = APIRouter(prefix="/authors", tags=["Author"])

@router.get("/me", response_model=AuthorModel, tags=["Authors"])
def me(current_user: Author = Depends(get_current_user)):
    """获取当前登录用户的信息"""
    return current_user


@router.get("/{github_id}", response_model=AuthorModel, tags=["Authors"])
async def get_author(github_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_admin)):
    """获取特定作者的详细信息（使用 GitHub ID）"""
    author = db.query(Author).filter(Author.id == github_id).first()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    return author



@router.get("/", response_model=List[AuthorModel], tags=["Authors"])
async def get_authors(
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_admin)
):
    """
    获取所有作者信息
    """
    authors = db.query(Author).offset(skip).limit(limit).all()
    return authors