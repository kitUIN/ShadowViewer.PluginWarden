import json
import os
import time
from sqlalchemy.orm import Session
import requests
from github import Github, Auth
from github.GithubException import GithubException
from config import settings
from loguru import logger

from models import Repository, get_session, save_releases_to_db, Author, get_or_create_author, WebhookLog, write_webhook_log_with_db

g = Github(
    auth=Auth.AppAuth(settings.app_id,
                      settings.app_private_key
                      ).get_installation_auth(settings.app_installation_id))

source_branch = "main"


def any_plugin(raw_plugin_json, plugin_json):
    mew_plugin_json = []
    flag = False
    for plugin in raw_plugin_json:
        if plugin["Id"] == plugin_json["Id"]:
            mew_plugin_json.append(plugin_json)
            flag = True
        else:
            mew_plugin_json.append(plugin)
    if not flag:
        mew_plugin_json.append(plugin_json)
    return flag, mew_plugin_json


def get_pr_file(plugin_json_url, assets):
    resp = requests.get(plugin_json_url)
    resp.raise_for_status()
    plugin_json = resp.json()
    plugin_json["Assets"] = assets
    return plugin_json


def create_pr(assets):
    plugin_json_url = None
    logo_url = None
    logo_name = None
    new_assets = []
    for asset in assets:
        if asset["content_type"].startswith("image/"):
            logo_url = asset["browser_download_url"]
            logo_name = asset["name"]
        elif asset["name"] == "plugin.json":
            plugin_json_url = asset["browser_download_url"]
        else:
            new_assets.append({
                "id": asset["id"],
                "name": asset["name"],
                "content_type": asset["content_type"],
                "size": asset["size"],
                "created_at": asset["created_at"],
                "updated_at": asset["updated_at"],
                "browser_download_url": asset["browser_download_url"],
            })
    if plugin_json_url is None:
        logger.warning("No plugin json file found, skip")
        return
    new_branch = str(int(time.time()))
    logger.info(f"[{new_branch}]Creating new branch")
    repo = g.get_repo(settings.repo_name)
    plugin_file = repo.get_contents("plugin.json")
    raw_plugin_json = json.loads(plugin_file.decoded_content.decode("utf-8"))
    plugin_json = get_pr_file(plugin_json_url, new_assets)
    plugin_id = plugin_json["Id"]
    plugin_version = plugin_json["Version"]
    source_ref = repo.get_git_ref(f"heads/{source_branch}")
    new_branch_ref = repo.create_git_ref(ref=f"refs/heads/{new_branch}", sha=source_ref.object.sha)
    if logo_url:
        logo_flag = False
        logo_path = f"{plugin_id}/{logo_name}"
        logo_data = {
            "path": logo_path,
            "message": f"{'Update' if logo_flag else 'Create'} Plugin Logo: {plugin_id} v{plugin_version}",
            "content": requests.get(logo_url).content,
        }
        try:
            logo_file_content = repo.get_contents(logo_path)
            logo_flag = True
        except GithubException:
            pass
        except Exception as e:
            logger.error(e)

        if logo_flag:
            repo.update_file(**logo_data,
                             sha=logo_file_content.sha,
                             branch=new_branch)
        else:
            repo.create_file(**logo_data, branch=new_branch)
        logger.info(f"[{new_branch}]Creating Logo")
        plugin_json[
            "Logo"] = f"https://raw.githubusercontent.com/{settings.repo_name}/refs/heads/main/{logo_path}"
    flag, mew_plugin_json = any_plugin(raw_plugin_json, plugin_json)
    commit_message = f"{'Update' if flag else 'Create'} Plugin: {plugin_id} v{plugin_version}"

    repo.update_file("plugin.json", commit_message,
                     json.dumps(mew_plugin_json, indent=4, ensure_ascii=False),
                     sha=plugin_file.sha,
                     branch=new_branch)

    logger.info(f"[{new_branch}]Update Plugin json")
    pr_body = "..."
    pr = repo.create_pull(
        title=commit_message,
        body=pr_body,
        head=new_branch,
        base=source_branch
    )
    logger.info(f"[{new_branch}]Create Pr")
    pr.merge()
    logger.info(f"[{new_branch}]Merge Pr")
    new_branch_ref.delete()

def webhook_release(payload:dict, event:str):
    full = payload["repository"]["full_name"]
    action = payload.get("action")
    save_releases_to_db(event,action, full, [payload["release"]])
    # 如果仓库被监听，则触发 create_pr
    try:
        with get_session() as db:
            repo = db.query(Repository).filter(Repository.full_name == full).first()
            if repo and getattr(repo, 'watched', False):
                try:
                    assets = payload["release"].get("assets", [])
                    create_pr(assets)
                except Exception as e:
                    logger.error(f"create_pr failed: {e}")
    except Exception as e:
        logger.error(f"Error checking repository watched status: {e}")

    return "success"

def webhook_install(payload:dict, event:str):
    sender = payload.get("sender")
    author = None
    with get_session() as db:
        if sender:
            try:
                author = get_or_create_author(db, sender)
            except Exception as e:
                logger.error(f"Failed to get_or_create author for installation account: {e}")
        try:
            action = payload.get("action")
            if event == "installation_repositories":
                add_repos = payload.get("repositories_added", []) or []
                for r in add_repos:
                    try:
                        full = r.get("full_name")
                        repo = db.query(Repository).filter(Repository.full_name == full).first()
                        if not repo:
                            repo = Repository(
                                id=r.get("id"),
                                name=r.get("name"),
                                full_name=r.get("full_name"),
                                installed=True,
                                author_id=author.id if author else None
                            )
                            db.add(repo)
                            db.flush()
                        else:
                            repo.installed = True
                            if author:
                                repo.author_id = author.id
                        write_webhook_log_with_db(db, repository_id=repo.id,
                                        author_id=author.id if author else None,
                                        event=event,
                                        action=action,
                                        payload=f"安装仓库: {repo.full_name}", level=3)
                    except Exception as e:
                        logger.error(f"Failed to upsert repository {r}: {e}")

                remove_repos = payload.get("repositories_removed", []) or []
                for r in remove_repos:
                    try:
                        full = r.get("full_name")
                        repo = db.query(Repository).filter(Repository.full_name == full).first()
                        if repo:
                            repo.installed = False
                        write_webhook_log_with_db(db, repository_id=repo.id,
                                        author_id=author.id if author else None,
                                        event=event,
                                        action=action,
                                        payload=f"取消安装仓库: {repo.full_name}", level=1)
                    except Exception as e:
                        logger.error(f"Failed to mark repository {r} as uninstalled: {e}")
                db.commit()
            else:         
                if action == "created":
                    repos = payload.get("repositories", []) or []
                    for r in repos:
                        try:
                            full = r.get("full_name") or f"{r.get('owner', {}).get('login')}/{r.get('name')}"
                            repo = db.query(Repository).filter(Repository.full_name == full).first()
                            if not repo:
                                repo = Repository(
                                    id=r.get("id"),
                                    name=r.get("name"),
                                    full_name=r.get("full_name"),
                                    installed=True,
                                    author_id=author.id if author else None
                                )
                                db.add(repo)
                                db.flush()
                            else:
                                repo.installed = True
                                # 如果有 installation 对应的 author，确保仓库记录与其绑定
                                if author:
                                    repo.author_id = author.id
                            write_webhook_log_with_db(db, repository_id=repo.id,
                                        author_id=author.id if author else None,
                                        event=event,
                                        action=action,
                                        payload=f"安装仓库: {repo.full_name}", level=3)
                        except Exception as e:
                            logger.error(f"Failed to upsert repository {r}: {e}")

                        db.commit()
                    return "installation processed"
                elif action == "deleted":
                    repos = payload.get("repositories", []) or []
                    logger.info(f"installation.deleted with {len(repos)} repositories")
                    for r in repos:
                        try:
                            full = r.get("full_name") or f"{r.get('owner', {}).get('login')}/{r.get('name')}"
                            repo = db.query(Repository).filter(Repository.full_name == full).first()
                            if repo:
                                repo.installed = False
                            write_webhook_log_with_db(db, repository_id=repo.id,
                                        author_id=author.id if author else None,
                                        event=event,
                                        action=action,
                                        payload=f"取消安装仓库: {repo.full_name}", level=1)
                        except Exception as e:
                            logger.error(f"Failed to mark repository {r} as uninstalled: {e}")
                    db.commit()
                    return "installation deleted processed"
            
        except Exception as e:
            logger.error(f"Error processing installation event: {e}")
            return "error"
