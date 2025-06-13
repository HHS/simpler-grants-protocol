import os
from typing import Any

from fastapi import APIRouter, HTTPException

from transform.transformer import CATransformer

router = APIRouter(prefix="/api/v1", tags=["grants"])

# Get the absolute path for our data file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, "data", "ca_grants_sample.json")


@router.get("/grants", response_model=list[dict[str, Any]])
async def get_grants():
    """
    Get all grant opportunity data transformed from CA Grant Portoal format to
    CommonGrants Protocol format.
    """
    try:
        # Transform the data
        opportunities = CATransformer.from_file(DATA_FILE)
        return opportunities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
