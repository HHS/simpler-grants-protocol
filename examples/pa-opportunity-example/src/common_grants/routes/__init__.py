"""
FastAPI routes for the CommonGrants API.

These routes implement the endpoints defined in the CommonGrants API specification.
"""

__all__ = ["opportunity_router"]

from common_grants.routes.opportunities import opportunity_router
