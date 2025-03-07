"""CommonGrants API implementation."""

from fastapi import FastAPI

from common_grants.routes import opportunity_router

app = FastAPI(
    title="CommonGrants API",
    description="An implementation of the CommonGrants API specification",
    version="0.1.0",
)
app.include_router(opportunity_router)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "Hello World"}
