"""California Grant Opportunity API - Example."""

from fastapi import FastAPI

from routers import grants

app = FastAPI(
    title="CA Grant Opportunity API - Example",
    description="An implementation of the CommonGrants API specification",
    version="0.1.0",
)

app.include_router(grants.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
