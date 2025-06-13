"""
Router module for handling grant-related endpoints.

This module provides endpoints for accessing and transforming grant opportunity data
from the California Grant Portal format to the CommonGrants Protocol format.
"""

from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from transform.transformer import CATransformer

router = APIRouter(prefix="/common-grants/opportunities", tags=["Opportunities"])

# Get the absolute path for our data file
BASE_DIR = Path(__file__).parent.parent
DATA_FILE = BASE_DIR / "data" / "ca_grants_sample.json"


@router.get(
    "",
    summary="List opportunities",
    description="Get a list of opportunities.",
)
async def get_grants() -> list[dict[str, Any]]:
    """
    Get all grant opportunities.

    Transforms grant opportunity data from CA Grant Portal format to
    CommonGrants Protocol format.

    Returns:
        List[dict[str, Any]]: List of transformed grant opportunities.

    Raises:
        HTTPException: If there is an error transforming the data.

    """
    try:
        return CATransformer.from_file(DATA_FILE)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error") from e
