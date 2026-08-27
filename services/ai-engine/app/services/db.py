from __future__ import annotations

from functools import lru_cache

import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    """Devuelve el engine de SQLAlchemy. Singleton — el pool de conexiones se crea una sola vez."""
    settings = get_settings()
    return create_engine(settings.database_url, pool_pre_ping=True)


def read_sql(query: str) -> pd.DataFrame:
    engine = get_engine()
    with engine.connect() as connection:
        return pd.read_sql(query, connection)
