from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# WAL + NORMAL: readers don't block the writer, and commits append to the WAL
# instead of fsync-ing on every transaction — the quota-deduction commit on the
# request path is the hot spot this relieves. journal_mode persists in the file;
# synchronous/busy_timeout are per-connection so we set them on every connect.
@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragmas(dbapi_conn, _record):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA synchronous=NORMAL")
    cur.execute("PRAGMA busy_timeout=5000")
    cur.close()


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session

