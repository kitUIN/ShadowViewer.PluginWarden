import json
from loguru import logger
import requests
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey, Text, BigInteger, text
from sqlalchemy.orm import relationship, sessionmaker,declarative_base,Session
import os
from datetime import datetime, timezone, timedelta

def get_local_time(time_str) -> datetime:
    # 原始 UTC 时间
    dt_utc = datetime.strptime(time_str, '%Y-%m-%dT%H:%M:%SZ')
    dt_utc = dt_utc.replace(tzinfo=timezone.utc)

    # 转换为北京时间 (UTC+8)
    dt_local = dt_utc.astimezone(timezone(timedelta(hours=8)))
    return dt_local

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
    # 是否在插件商店中可见（用于控制插件是否对外展示）
    visible = Column(Boolean, default=True, nullable=False)
    
    # 与Repository的关系
    repository = relationship("Repository", back_populates="releases")
    # 与Asset的关系
    assets = relationship("Asset", back_populates="release", cascade="all, delete-orphan")
    # 与Author的关系
    author = relationship("Author")
    # 与Plugin的一对一关系（每个 Release 对应一个 plugin.json）
    plugin = relationship("Plugin", back_populates="release", uselist=False, cascade="all, delete-orphan")
    
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
    # 反向关系：Author 可以有多个 webhook 日志
    webhook_logs = relationship("WebhookLog", back_populates="author", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Author(login='{self.login}', id={self.id})>"


class Plugin(Base):
    __tablename__ = 'plugins'

    id = Column(Integer, primary_key=True)
    plugin_id = Column(String(255), unique=True, nullable=True)
    release_id = Column(Integer, ForeignKey('releases.id'), unique=True)
    repository_id = Column(Integer, ForeignKey('repositories.id'), nullable=True)

    # 常用字段
    name = Column(String(255), nullable=True)
    version = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    authors = Column(String(255), nullable=True)
    web_uri = Column(String(255), nullable=True)
    logo = Column(String(255), nullable=True)
    sdk_version = Column(String(100), nullable=True)

    # 复杂字段以 JSON 文本存储
    # 关系字段：依赖和标签（一对多）
    background_color = Column(String(50), nullable=True)
    dependencies = relationship("Dependency", back_populates="plugin", cascade="all, delete-orphan")
    tags = relationship("PluginTag", back_populates="plugin", cascade="all, delete-orphan")

    raw_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    # 关系
    release = relationship("Release", back_populates="plugin")
    repository = relationship("Repository")

    def __repr__(self):
        return f"<Plugin(plugin_id='{self.plugin_id}', name='{self.name}', version='{self.version}')>"


class Dependency(Base):
    __tablename__ = 'dependencies'

    id = Column(Integer, primary_key=True)
    plugin_id = Column(Integer, ForeignKey('plugins.id'))
    dep_id = Column(String(255), nullable=False)
    need = Column(String(100), nullable=True)

    plugin = relationship("Plugin", back_populates="dependencies")

    def __repr__(self):
        return f"<Dependency(dep_id='{self.dep_id}', need='{self.need}')>"


class PluginTag(Base):
    __tablename__ = 'plugin_tags'

    id = Column(Integer, primary_key=True)
    plugin_id = Column(Integer, ForeignKey('plugins.id'))
    tag = Column(String(100), nullable=False)

    plugin = relationship("Plugin", back_populates="tags")

    def __repr__(self):
        return f"<PluginTag(tag='{self.tag}')>"


class WebhookLog(Base):
    __tablename__ = 'webhook_logs'

    id = Column(Integer, primary_key=True)
    author_id = Column(Integer, ForeignKey('authors.id'), nullable=True)
    repository_id = Column(Integer, ForeignKey('repositories.id'), nullable=True)
    event = Column(String(100), nullable=False)
    action = Column(String(100), nullable=True)
    payload = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    level = Column(Integer, default=0)
    # 关系
    author = relationship("Author", back_populates="webhook_logs")
    repository = relationship("Repository")

    def __repr__(self):
        return f"<WebhookLog(event='{self.event}', action='{self.action}', author_id={self.author_id})>"

# 创建或获取Author
def get_or_create_author(session:Session, author_data, access_token: str = None, token_scopes: str = None, mark_admin: bool = False):
    author = session.query(Author).filter_by(id=author_data['id']).first()
    if not author:
        author = Author(
            id=author_data['id'],
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
        author.token_updated_at = datetime.now()
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


def process_asset(session: Session, release: Release, asset_data: dict):
    """Create or update an Asset record and handle plugin.json if present.

    This unifies logic used for both new releases and existing releases.
    """
    # Handle plugin.json specially (download and populate Plugin)
    if asset_data.get('name') == 'plugin.json' and asset_data.get('browser_download_url'):
        plugin_text = plugin_json_download(asset_data['browser_download_url'])
        if plugin_text:
            plugin_text = plugin_text.replace("ms-plugin://", f"https://raw.githubusercontent.com/{release.repository.full_name}/{release.tag_name}/")
            try:
                plugin_data = json.loads(plugin_text)
            except Exception:
                plugin_data = None

            if plugin_data:
                plugin_obj = session.query(Plugin).filter_by(release_id=release.id).first()
                if not plugin_obj:
                    plugin_obj = Plugin(release_id=release.id)
                    # 关联到发布对应的仓库
                    plugin_obj.repository_id = release.repository_id
                    session.add(plugin_obj)
                else:
                    # 确保 repository_id 与 release 的 repository 保持一致
                    plugin_obj.repository_id = release.repository_id

                plugin_obj.plugin_id = plugin_data.get('Id')
                plugin_obj.name = plugin_data.get('Name') or plugin_data.get('name')
                plugin_obj.version = plugin_data.get('Version')
                plugin_obj.description = plugin_data.get('Description')
                plugin_obj.authors = plugin_data.get('Authors')
                plugin_obj.web_uri = plugin_data.get('WebUri')
                plugin_obj.logo = plugin_data.get('Logo')
                plugin_obj.sdk_version = plugin_data.get('SdkVersion')

                deps = plugin_data.get('Dependencies', []) or []
                plugin_obj.dependencies = []
                for d in deps:
                    dep_id = d.get('Id') or d.get('id')
                    need = d.get('Need') or d.get('need')
                    if dep_id:
                        plugin_obj.dependencies.append(Dependency(dep_id=dep_id, need=need))

                ps = plugin_data.get('PluginStore') or {}
                tags = ps.get('Tag', []) or []
                plugin_obj.tags = []
                for t in tags:
                    plugin_obj.tags.append(PluginTag(tag=t))

                plugin_obj.background_color = ps.get('BackgroundColor')
                plugin_obj.raw_json = plugin_text

    # Find existing asset by github_id
    asset = session.query(Asset).filter_by(
        release_id=release.id,
        name=asset_data.get('name'),
        ).first()
    if not asset:
        uploader = None
        if 'uploader' in asset_data and asset_data['uploader']:
            uploader = get_or_create_author(session, asset_data['uploader'])

        created_at = None
        updated_at = None
        try:
            if asset_data.get('created_at'):
                created_at = get_local_time(asset_data['created_at'])
        except Exception:
            created_at = None
        try:
            if asset_data.get('updated_at'):
                updated_at = get_local_time(asset_data['updated_at'])
        except Exception:
            updated_at = None

        asset = Asset(
            github_id=asset_data['id'],
            release_id=release.id,
            uploader_id=uploader.id if uploader else None,
            name=asset_data.get('name'),
            label=asset_data.get('label'),
            content_type=asset_data.get('content_type'),
            state=asset_data.get('state'),
            size=asset_data.get('size'),
            download_count=asset_data.get('download_count'),
            created_at=created_at,
            updated_at=updated_at,
            browser_download_url=asset_data.get('browser_download_url')
        )
        session.add(asset)
    else:
        # update existing asset fields
        asset.name = asset_data.get('name')
        asset.label = asset_data.get('label')
        asset.content_type = asset_data.get('content_type')
        asset.state = asset_data.get('state')
        asset.size = asset_data.get('size')
        asset.download_count = asset_data.get('download_count')
        asset.browser_download_url = asset_data.get('browser_download_url')
        try:
            if asset_data.get('updated_at'):
                asset.updated_at = get_local_time(asset_data['updated_at'])
        except Exception:
            pass

    return asset

# 将GitHub release数据保存到数据库
def save_releases_to_db(event:str,action:str, full_name:str, releases_data:list):
    with get_session() as session:
        repo = session.query(Repository).filter_by(full_name=full_name).first()
        if not repo:
            # 获取仓库信息
            repo_url = f'https://api.github.com/repos/{full_name}'
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
            release = session.query(Release).filter_by(
                repository_id=repo.id,
                tag_name=release_data['tag_name']
                ).first()
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
                    created_at=get_local_time(release_data['created_at']),
                    published_at=get_local_time(release_data['published_at']) if release_data['published_at'] else None,
                    html_url=release_data['html_url'],
                    tarball_url=release_data['tarball_url'],
                    zipball_url=release_data['zipball_url']
                )
                session.add(release)
                session.flush()
                
                # 处理assets
                for asset_data in release_data['assets']:
                    process_asset(session, release, asset_data)
            else:
                # 更新已存在的release
                release.github_id=release_data['id']
                release.tag_name = release_data['tag_name']
                release.name = release_data['name']
                release.body = release_data['body']
                release.draft = release_data['draft']
                release.prerelease = release_data['prerelease']
                if author:
                    release.author_id = author.id
                
                # 更新assets
                for asset_data in release_data['assets']:
                    process_asset(session, release, asset_data)

            if action == "edited":
                action_str = "编辑"
            elif action == "published" or action == "released":
                action_str = "发布"
            elif action == "created":
                action_str = "创建"
            elif action == "deleted":
                action_str = "删除"
            else:
                action_str = action
            write_webhook_log_with_db(session, repository_id=repo.id,
                                    author_id=author.id if author else None,
                                    event=event,
                                    action=action,
                                    payload=f"仓库 {full_name} {action_str}版本 {release_data['tag_name']}", level=1)
        session.commit()


def write_webhook_log_with_db(db: Session, repository_id,author_id,event,action,payload,level=0):
    try:
        log = WebhookLog(
            author_id=author_id,
            repository_id=repository_id,
            event=event,
            action=action,
            payload=payload,
            level=level
        )
        db.add(log)
    except Exception as e:
        logger.error(f"Failed to write webhook log for {event}: {e}")

def write_webhook_log(repository_id,author_id,event,action,payload,level=0):
    try:
        with get_session() as db:
            log = WebhookLog(
                author_id=author_id,
                repository_id=repository_id,
                event=event,
                action=action,
                payload=payload,
                level=level
            )
            db.add(log)
            db.commit()
    except Exception as e:
        logger.error(f"Failed to write webhook log for {event}: {e}")

Base.metadata.create_all(engine)


if __name__ == '__main__':
    save_releases_to_db("kitUIN","ShadowViewer.Plugin.Bika")