"""
Centralized logging configuration for En-Dash API
"""

import sys
import logging
import logging.config
from pathlib import Path
from typing import Dict, Any

from app.core.config import settings


def setup_logging() -> None:
    """Configure application logging based on settings"""
    
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Choose configuration based on format preference
    if settings.LOG_FORMAT == "json":
        config = get_json_logging_config()
    else:
        config = get_text_logging_config()
    
    logging.config.dictConfig(config)
    
    # Log startup message
    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured - Level: {settings.LOG_LEVEL}, Format: {settings.LOG_FORMAT}")


def get_text_logging_config() -> Dict[str, Any]:
    """Get text-based logging configuration"""
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "detailed": {
                "format": "{asctime} | {levelname:8} | {name:20} | {message}",
                "style": "{",
                "datefmt": "%Y-%m-%d %H:%M:%S"
            },
            "simple": {
                "format": "{levelname:8} | {name:15} | {message}",
                "style": "{",
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": settings.LOG_LEVEL,
                "formatter": "simple" if settings.DEBUG else "detailed",
                "stream": sys.stdout
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "INFO",
                "formatter": "detailed",
                "filename": "logs/en-dash.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5
            },
            "error_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "ERROR",
                "formatter": "detailed",
                "filename": "logs/errors.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 3
            }
        },
        "loggers": {
            # Root logger
            "": {
                "level": settings.LOG_LEVEL,
                "handlers": ["console"] if settings.DEBUG else ["console", "file", "error_file"]
            },
            # FastAPI specific
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            },
            "uvicorn.error": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            },
            "uvicorn.access": {
                "level": "INFO" if settings.DEBUG else "WARNING",
                "handlers": ["console"],
                "propagate": False
            },
            # Docker client
            "docker": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False
            },
            # Our application
            "app": {
                "level": settings.LOG_LEVEL,
                "handlers": ["console"] if settings.DEBUG else ["console", "file"],
                "propagate": False
            }
        }
    }


def get_json_logging_config() -> Dict[str, Any]:
    """Get JSON-based logging configuration (better for production)"""
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                "format": "%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d"
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": settings.LOG_LEVEL,
                "formatter": "json",
                "stream": sys.stdout
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "INFO",
                "formatter": "json",
                "filename": "logs/en-dash.jsonl",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5
            }
        },
        "loggers": {
            "": {
                "level": settings.LOG_LEVEL,
                "handlers": ["console"] if settings.DEBUG else ["console", "file"]
            },
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            },
            "app": {
                "level": settings.LOG_LEVEL,
                "handlers": ["console"] if settings.DEBUG else ["console", "file"],
                "propagate": False
            }
        }
    }


class ContextualLogger:
    """Logger with contextual information for request tracking"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
    
    def info(self, message: str, **context):
        self._log("info", message, context)
    
    def error(self, message: str, **context):
        self._log("error", message, context)
    
    def warning(self, message: str, **context):
        self._log("warning", message, context)
    
    def debug(self, message: str, **context):
        self._log("debug", message, context)
    
    def _log(self, level: str, message: str, context: Dict[str, Any]):
        if context:
            extra_msg = " | ".join([f"{k}={v}" for k, v in context.items()])
            message = f"{message} | {extra_msg}"
        
        getattr(self.logger, level)(message)


def get_logger(name: str) -> ContextualLogger:
    """Get a contextual logger instance"""
    return ContextualLogger(name)