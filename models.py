import json
from loguru import logger
import requests
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey, Text, BigInteger, text
from sqlalchemy.orm import relationship, sessionmaker,declarative_base,Session
from datetime import datetime
import os

# 创建SQLAlchemy基类
Base = declarative_base()

db_file = "db.sqlite"
engine = create_engine(f'sqlite:///{db_file}')


get_session = sessionmaker(bind=engine)

# 依赖函数，用于获取数据库会话
def get_db():
    db = get_session()
    try:
        yield db
    finally:
        db.close()
# 定义数据库模型
class Repository(Base):
    __tablename__ = 'repositories'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    full_name = Column(String(200), nullable=False, unique=True)
    
    installed = Column(Boolean, default=False, nullable=False)
    watched = Column(Boolean, default=False, nullable=False)
    # 关联仓库所属的Author（例如GitHub仓库所有者）
    author_id = Column(Integer, ForeignKey('authors.id'), nullable=True)
    author = relationship("Author", back_populates="repositories")
    # 与Release的关系
    releases = relationship("Release", back_populates="repository", cascade="all, delete-orphan")
    
    @property
    def html_url(self):
        return f"https://github.com/{self.full_name}"

    def __repr__(self):
        return f"<Repository(name='{self.name}', full_name='{self.full_name}')>"

class Release(Base):
    __tablename__ = 'releases'
    
    id = Column(Integer, primary_key=True)
    github_id = Column(Integer, unique=True)
    repository_id = Column(Integer, ForeignKey('repositories.id'))
    author_id = Column(Integer, ForeignKey('authors.id'), nullable=True)
    tag_name = Column(String(100))
    name = Column(String(255))
    body = Column(Text)
    draft = Column(Boolean, default=False)
    prerelease = Column(Boolean, default=False)
    created_at = Column(DateTime)
    published_at = Column(DateTime)
    html_url = Column(String(255))
    tarball_url = Column(String(255))
    zipball_url = Column(String(255))
    
    # 与Repository的关系
    repository = relationship("Repository", back_populates="releases")
    # 与Asset的关系
    assets = relationship("Asset", back_populates="release", cascade="all, delete-orphan")
    # 与Author的关系
    author = relationship("Author")
    
    def __repr__(self):
        return f"<Release(tag_name='{self.tag_name}', name='{self.name}')>"

class Asset(Base):
    __tablename__ = 'assets'
    
    id = Column(Integer, primary_key=True)
    github_id = Column(Integer, unique=True)
    release_id = Column(Integer, ForeignKey('releases.id'))
    uploader_id = Column(Integer, ForeignKey('authors.id'), nullable=True)
    name = Column(String(255))
    label = Column(String(255), nullable=True)
    content_type = Column(String(100))
    state = Column(String(50))
    size = Column(BigInteger)
    download_count = Column(Integer)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    browser_download_url = Column(String(255))
    
    # 与Release的关系
    release = relationship("Release", back_populates="assets")
    # 与Uploader(Author)的关系
    uploader = relationship("Author")
    
    def __repr__(self):
        return f"<Asset(name='{self.name}', download_count={self.download_count})>"

class Author(Base):
    __tablename__ = 'authors'
    
    id = Column(Integer, primary_key=True)
    github_id = Column(Integer, unique=True)
    login = Column(String(100), nullable=False)
    avatar_url = Column(String(255))
    html_url = Column(String(255))
    type = Column(String(50))
    # OAuth token and metadata
    access_token = Column(Text, nullable=True)
    token_updated_at = Column(DateTime, nullable=True)
    token_scopes = Column(String(255), nullable=True)
    # Use Author to manage permissions
    is_admin = Column(Boolean, default=False, nullable=False)
    # 反向关系：一个Author可以有多个Repository
    repositories = relationship("Repository", back_populates="author", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Author(login='{self.login}', github_id={self.github_id})>"

# 创建或获取Author
def get_or_create_author(session:Session, author_data, access_token: str = None, token_scopes: str = None, mark_admin: bool = False):
    author = session.query(Author).filter_by(github_id=author_data['id']).first()
    if not author:
        author = Author(
            github_id=author_data['id'],
            login=author_data.get('login'),
            avatar_url=author_data.get('avatar_url'),
            html_url=author_data.get('html_url'),
            type=author_data.get('type')
        )
        session.add(author)
        session.flush()

    # Update token info if provided
    if access_token:
        author.access_token = access_token
        author.token_updated_at = datetime.utcnow()
    if token_scopes:
        author.token_scopes = token_scopes
    if mark_admin:
        author.is_admin = True

    session.flush()
    return author


# 获取GitHub仓库的releases
def fetch_github_releases(repo_owner, repo_name, token=None):
    headers = {}
    if token:
        headers['Authorization'] = f'token {token}'
    
    url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/releases'
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error fetching releases: {response.status_code}")
        return []


def plugin_json_exists(release_data):
    for asset_data in release_data['assets']:
        if asset_data['name'] == "plugin.json":
            return True
    return False

def plugin_json_download(browser_download_url):
    headers = {}
    # if token:
    #     headers['Authorization'] = f'token {token}'
     
    response = requests.get(browser_download_url, headers=headers)
    if response.status_code == 200:
        return response.text
    else:
        print(f"Error fetching {browser_download_url}: {response.status_code}")
        return None

# 将GitHub release数据保存到数据库
def save_releases_to_db(repo_owner, repo_name, releases_data=None):
    if releases_data is None:
        releases_data = fetch_github_releases(repo_owner,repo_name)
    with get_session() as session:
        repo = session.query(Repository).filter_by(full_name=f"{repo_owner}/{repo_name}").first()
        if not repo:
            # 获取仓库信息
            repo_url = f'https://api.github.com/repos/{repo_owner}/{repo_name}'
            repo_response = requests.get(repo_url)
            if repo_response.status_code == 200:
                repo_data = repo_response.json()
                repo = Repository(
                    id=repo_data['id'],
                    name=repo_data['name'],
                    full_name=repo_data['full_name'],
                )
                session.add(repo)
                session.flush()
            else:
                print(f"Error fetching repository info: {repo_response.status_code}")
                return
        
        for release_data in releases_data:
            if not plugin_json_exists(release_data):
                continue
            author = None
            if 'author' in release_data and release_data['author']:
                author = get_or_create_author(session, release_data['author'])
            
            # 检查release是否已存在
            release = session.query(Release).filter_by(github_id=release_data['id']).first()
            if not release:
                # 创建新release
                release = Release(
                    github_id=release_data['id'],
                    repository_id=repo.id,
                    author_id=author.id if author else None,
                    tag_name=release_data['tag_name'],
                    name=release_data['name'],
                    body=release_data['body'],
                    draft=release_data['draft'],
                    prerelease=release_data['prerelease'],
                    created_at=datetime.strptime(release_data['created_at'], '%Y-%m-%dT%H:%M:%SZ'),
                    published_at=datetime.strptime(release_data['published_at'], '%Y-%m-%dT%H:%M:%SZ') if release_data['published_at'] else None,
                    html_url=release_data['html_url'],
                    tarball_url=release_data['tarball_url'],
                    zipball_url=release_data['zipball_url']
                )
                session.add(release)
                session.flush()
                
                # 处理assets
                for asset_data in release_data['assets']:
                    # 处理asset上传者信息
                    uploader = None
                    if 'uploader' in asset_data and asset_data['uploader']:
                        uploader = get_or_create_author(session, asset_data['uploader'])
                    
                    asset = Asset(
                        github_id=asset_data['id'],
                        release_id=release.id,
                        uploader_id=uploader.id if uploader else None,
                        name=asset_data['name'],
                        label=asset_data['label'],
                        content_type=asset_data['content_type'],
                        state=asset_data['state'],
                        size=asset_data['size'],
                        download_count=asset_data['download_count'],
                        created_at=datetime.strptime(asset_data['created_at'], '%Y-%m-%dT%H:%M:%SZ'),
                        updated_at=datetime.strptime(asset_data['updated_at'], '%Y-%m-%dT%H:%M:%SZ'),
                        browser_download_url=asset_data['browser_download_url']
                    )
                    session.add(asset)
            else:
                # 更新已存在的release
                release.tag_name = release_data['tag_name']
                release.name = release_data['name']
                release.body = release_data['body']
                release.draft = release_data['draft']
                release.prerelease = release_data['prerelease']
                if author:
                    release.author_id = author.id
                
                # 更新assets
                for asset_data in release_data['assets']:
                    asset = session.query(Asset).filter_by(github_id=asset_data['id']).first()
                    if not asset:
                        # 处理asset上传者信息
                        uploader = None
                        if 'uploader' in asset_data and asset_data['uploader']:
                            uploader = get_or_create_author(session, asset_data['uploader'])
                        
                        # 创建新asset
                        asset = Asset(
                            github_id=asset_data['id'],
                            release_id=release.id,
                            uploader_id=uploader.id if uploader else None,
                            name=asset_data['name'],
                            label=asset_data['label'],
                            content_type=asset_data['content_type'],
                            state=asset_data['state'],
                            size=asset_data['size'],
                            download_count=asset_data['download_count'],
                            created_at=datetime.strptime(asset_data['created_at'], '%Y-%m-%dT%H:%M:%SZ'),
                            updated_at=datetime.strptime(asset_data['updated_at'], '%Y-%m-%dT%H:%M:%SZ'),
                            browser_download_url=asset_data['browser_download_url']
                        )
                        session.add(asset)
                    else:
                        # 更新已存在的asset
                        asset.name = asset_data['name']
                        asset.label = asset_data['label']
                        asset.state = asset_data['state']
                        asset.download_count = asset_data['download_count']
                        asset.updated_at = datetime.strptime(asset_data['updated_at'], '%Y-%m-%dT%H:%M:%SZ')

        session.commit()


Base.metadata.create_all(engine)


if __name__ == '__main__':
    save_releases_to_db("kitUIN","ShadowViewer.Plugin.Bika")