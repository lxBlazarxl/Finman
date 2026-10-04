import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.deps import get_current_user
from app.api.v1.auth import router as auth_router
from app.api.v1.household import router as household_router
from app.api.v1.accounts import router as accounts_router
from app.api.v1.balances import router as balances_router
from app.api.v1.transactions import router as transactions_router
from app.api.v1.analytics import router as analytics_router
from app.core.config import settings
from app.core.database import engine
from app.models.base import Base


async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router, prefix=settings.API_V1_STR)
    app.include_router(household_router, prefix=settings.API_V1_STR)
    app.include_router(accounts_router, prefix=settings.API_V1_STR)
    app.include_router(balances_router, prefix=settings.API_V1_STR)
    app.include_router(transactions_router, prefix=settings.API_V1_STR)
    app.include_router(analytics_router, prefix=settings.API_V1_STR)

    @app.get("/health")
    def health() -> dict:
        return {"status": "healthy", "service": "finman"}

    dist_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

    if os.path.isdir(dist_dir):
        assets_dir = os.path.join(dist_dir, "assets")
        if os.path.isdir(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa(full_path: str):
            if full_path.startswith(("api", "docs", "redoc", "openapi.json", "health")):
                raise HTTPException(status_code=404, detail="Not Found")
            file_path = os.path.join(dist_dir, full_path)
            if os.path.isfile(file_path):
                return FileResponse(file_path)
            return FileResponse(os.path.join(dist_dir, "index.html"))
    else:
        @app.get("/")
        def root() -> dict:
            return {"message": "Welcome to FinMan API", "docs": "/docs"}

    return app


app = create_app()
