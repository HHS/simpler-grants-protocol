"""California Grant Opportunity API - Example."""

from fastapi import FastAPI

from routers import grants

app = FastAPI(
    title="CA Grant Opportunity API - Example",
    description="API for getting California Grant Data via CommonGrants Protocol",
    version="0.1.0",
)

app.include_router(grants.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
