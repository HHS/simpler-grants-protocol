"""California Grant Opportunity API - Example."""

from fastapi import FastAPI, status
from fastapi.responses import RedirectResponse

from ca_common_grants.routers import opportunities

app = FastAPI(
    title="CA Grant Opportunity API - Example",
    description="API for getting California Grant Data via CommonGrants Protocol",
    version="0.1.0",
)

app.include_router(opportunities.router)


@app.get("/", tags=["docs"], name="Redirect to docs")
async def root() -> RedirectResponse:
    """Redirects the user to the API docs."""
    return RedirectResponse(
        "/docs",
        status_code=status.HTTP_301_MOVED_PERMANENTLY,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
