from typing import Optional
from urllib.parse import urlencode

import requests
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse

from config import settings
from models import get_session, get_or_create_author, Author, Repository

router = APIRouter(prefix="/auth", tags=["Auth"])

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_API = "https://api.github.com/user"


@router.get("/login")
def login(request: Request):
    """Redirect user to GitHub OAuth authorize page."""
    params = {
        "client_id": settings.app_client_id,
        "redirect_uri":settings.app_redirect_uri,
        "scope": "read:user",
        "allow_signup": "false",
    }
    url = GITHUB_AUTHORIZE_URL + "?" + urlencode(params)
    return RedirectResponse(url)


@router.get("/callback", name="auth_callback")
def callback(code: Optional[str] = None):
    """Exchange code for access token and set it as an HttpOnly cookie, and persist author/token."""
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")

    data = {
        "client_id": settings.app_client_id,
        "client_secret": settings.app_client_secrets,
        "code": code,
    }
    headers = {"Accept": "application/json"}
    token_resp = requests.post(GITHUB_ACCESS_TOKEN_URL, data=data, headers=headers)
    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange code for token")
    token_json = token_resp.json()
    access_token = token_json.get("access_token")
    scope = token_json.get("scope")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token returned")

    # verify user with token
    user_resp = requests.get(GITHUB_USER_API, headers={"Authorization": f"token {access_token}", "Accept": "application/json"})
    if user_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch user with access token")
    user_json = user_resp.json()

    # persist author and token
    admin_list = [s.strip().lower() for s in settings.admin_github_logins.split(',') if s.strip()]
    mark_admin = user_json.get('login', '').lower() in admin_list
    with get_session() as session:
        author = get_or_create_author(session, user_json, access_token=access_token, token_scopes=scope, mark_admin=mark_admin)
        session.commit()
    resp = RedirectResponse(url="/")
    # In production, set secure=True and samesite adjustments
    resp.set_cookie(key="access_token", value=access_token, httponly=True, secure=False)
    return resp


@router.get("/logout")
def logout(request: Request):
    """Clear access token cookie and redirect to home."""
    resp = RedirectResponse(url="/")
    resp.delete_cookie(key="access_token")
    return resp


def get_current_user(request: Request):
    """Dependency: validate access token (cookie or Authorization header), persist it to Author, and return Author DB instance.

    Raises 401 if missing/invalid. Returns SQLAlchemy `Author` instance on success.
    """
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
    else:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized: missing token")
    # 直接在数据库中匹配持久化的 token，避免每次请求都调用 GitHub
    with get_session() as session:
        author = session.query(Author).filter(Author.access_token == token).first()
        if not author:
            raise HTTPException(status_code=401, detail="Unauthorized: token not recognized")
        # refresh to ensure latest fields
        session.refresh(author)
        return author


def get_admin(request: Request):
    """Dependency: get current user and verify admin status.

    Raises 403 if not admin. Returns SQLAlchemy `Author` instance on success.
    """
    author = get_current_user(request)
    if not author.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden: admin access required")
    return author