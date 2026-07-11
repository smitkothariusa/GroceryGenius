# backend/app/services/logging_config.py
import logging
import os
from contextvars import ContextVar

# Set per-request by the middleware in app.main; empty outside a request.
request_id_var: ContextVar[str] = ContextVar("request_id", default="")

LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s [req=%(request_id)s] %(message)s"


class RequestIdFilter(logging.Filter):
    """Inject the current request id into every record so the formatter can use it."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def setup_logging() -> None:
    """
    Configure the root logger once: single-line structured format to stdout
    (Render captures stdout), level from LOG_LEVEL env (default INFO).
    Idempotent so uvicorn reload / test re-imports don't stack handlers.
    """
    root = logging.getLogger()
    if any(getattr(h, "_grocerygenius", False) for h in root.handlers):
        return

    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(LOG_FORMAT))
    handler.addFilter(RequestIdFilter())
    handler._grocerygenius = True  # marker for idempotency
    root.addHandler(handler)

    level = os.getenv("LOG_LEVEL", "INFO").upper()
    root.setLevel(level if level in logging._nameToLevel else "INFO")
