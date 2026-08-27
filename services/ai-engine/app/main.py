from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.api.predictions import router as predictions_router
from app.core.config import get_settings
from app.ml_models.predictor import DemandForecaster, PriceOptimizer
from app.ml_models.registry import get_registry

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    get_registry().load_all()
    PriceOptimizer()
    DemandForecaster()
    yield


app = FastAPI(
    title=settings.app_name,
    description="Microservicio de predicciones y análisis para el sistema NM.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    # En producción este servicio vive en red interna: el gateway NestJS lo llama
    # server-to-server y CORS no aplica. Solo es relevante en desarrollo local
    # para Swagger UI. Configurar CORS_ORIGINS en .env para cada entorno.
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["X-API-Key", "Content-Type"],
)

app.include_router(predictions_router)


def custom_openapi() -> dict[str, Any]:
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    schema["components"]["securitySchemes"] = {
        "ApiKeyAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
        }
    }
    schema["security"] = [{"ApiKeyAuth": []}]
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi  # type: ignore[method-assign]


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str | int | bool]:
    registry = get_registry()
    return {
        "status": "ok",
        "message": "Motor de IA encendido",
        "environment": settings.environment,
        "demand_models_loaded": registry.demand_model_count,
        "price_model_loaded": registry.has_price_model,
    }
