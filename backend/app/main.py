from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes import auth, chat, profile, connections, extras

# Friendly names for validation fields
FIELD_LABELS = {
    "username": "Username",
    "email": "Email",
    "password": "Password",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="AI Listener - Emotional Support Platform",
    description="A safe, calming digital space for emotional support",
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Convert Pydantic validation errors into user-friendly messages."""
    messages = []
    for err in exc.errors():
        field = err.get("loc", [])[-1] if err.get("loc") else "input"
        label = FIELD_LABELS.get(field, field)
        err_type = err.get("type", "")
        msg = err.get("msg", "")

        if "email" in str(field).lower() and ("not a valid" in msg or "value_error" in err_type):
            messages.append("Please enter a valid email address")
        elif err_type == "string_too_short" or "at least" in msg:
            ctx = err.get("ctx", {})
            min_len = ctx.get("min_length", "")
            messages.append(f"{label} must be at least {min_len} characters" if min_len else f"{label} is too short")
        elif err_type == "missing" or "required" in msg.lower():
            messages.append(f"{label} is required")
        elif "string_type" in err_type:
            messages.append(f"{label} must be text")
        else:
            messages.append(f"{label}: {msg}")

    detail = messages[0] if len(messages) == 1 else " | ".join(messages)
    return JSONResponse(status_code=422, content={"detail": detail})


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(profile.router)
app.include_router(connections.router)
app.include_router(extras.router)


@app.get("/")
async def root():
    return {"message": "AI Listener API is running", "version": "1.0.0"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
