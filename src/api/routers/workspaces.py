"""Workspaces API routes."""
from fastapi import APIRouter
from fastapi import HTTPException
from typing import List
from src.api.schemas import WorkspaceCreate, WorkspaceInfo
from src.pipeline.retriever import (get_or_create_collection, list_workspaces, list_files_in_workspace, delete_workspace)

router = APIRouter(tags=["workspaces"])


@router.post("/api/workspaces", response_model=WorkspaceInfo, status_code=201)
async def create_workspace(body: WorkspaceCreate):
    try:
        get_or_create_collection(body.name)
        return WorkspaceInfo(name=body.name, file_count=0)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo workspace: {str(e)}")


@router.get("/api/workspaces", response_model=List[WorkspaceInfo])
async def get_workspaces():
    try:
        names = list_workspaces()
        return [WorkspaceInfo(name=n, file_count=len(list_files_in_workspace(n))) for n in names]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/workspaces/{workspace_name}", status_code=204)
async def remove_workspace(workspace_name: str):
    try:
        delete_workspace(workspace_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/workspaces/{workspace_name}/files", response_model=List[str])
async def get_workspace_files(workspace_name: str):
    try:
        return list_files_in_workspace(workspace_name)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Không tìm thấy workspace")
