
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict
from typing import Generic, List, TypeVar  

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    total: int
    page: int
    limit: int
    pages: int
    items: List[T]

class AssetModel(BaseModel):
    id: int
    github_id: int
    name: str
    content_type: str
    state: str
    size: int
    download_count: int
    created_at: datetime
    updated_at: datetime
    browser_download_url: str
    model_config = ConfigDict(from_attributes=True)

class AuthorModel(BaseModel):
    id: int
    login: str
    avatar_url: str
    html_url: str
    type: str
    model_config = ConfigDict(from_attributes=True)
    
class ReleaseModel(BaseModel):
    id: int
    github_id: int
    tag_name: str
    name: str
    body: Optional[str] = None
    draft: bool
    prerelease: bool
    created_at: datetime
    published_at: Optional[datetime] = None
    html_url: str
    tarball_url: str
    zipball_url: str
    visible: bool = True
    assets: List[AssetModel] = []
    author: Optional[AuthorModel] = None
    model_config = ConfigDict(from_attributes=True)
    


class RepositoryBasicModel(BaseModel):
    id: int
    name: str
    full_name: str
    html_url: str
    watched: bool = False
    releases: List[ReleaseModel] = []
    author: Optional[AuthorModel] = None
    model_config = ConfigDict(from_attributes=True)

class RepositoryModel(RepositoryBasicModel): 
    releases: List[ReleaseModel] = []
    model_config = ConfigDict(from_attributes=True)


class WebhookLogModel(BaseModel):
    id: int
    author: Optional[AuthorModel] = None
    repository: Optional[RepositoryBasicModel] = None
    event: str
    action: Optional[str] = None
    payload: Optional[str] = None
    created_at: datetime
    level: int = 0
    model_config = ConfigDict(from_attributes=True)


class PluginDependencyModel(BaseModel):
    Id: str
    Need: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class AffiliationTagModel(BaseModel):
    Name: str
    BackgroundHex: Optional[str] = "#111827"
    ForegroundHex: Optional[str] = "#FFFFFF"
    Icon: Optional[str] = ""
    PluginId: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class ReleaseAssetsModel(BaseModel):
    PluginJson: Optional[str] = None
    ZipPackage: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class PluginModel(BaseModel):
    Id: Optional[str]
    Name: Optional[str]
    Version: Optional[str]
    Description: Optional[str]
    Authors: Optional[str]
    WebUri: Optional[str]
    Logo: Optional[str]
    PluginManage: Optional[Dict] = None
    AffiliationTag: AffiliationTagModel
    SdkVersion: Optional[str]
    DllName: Optional[str] = None
    Dependencies: List[PluginDependencyModel] = []
    ReleaseAssets: Optional[ReleaseAssetsModel] = None
    LastUpdated: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)