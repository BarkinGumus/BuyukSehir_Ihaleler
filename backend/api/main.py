from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import tenders

app = FastAPI(title="Büyükşehir İhaleler API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(tenders.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
