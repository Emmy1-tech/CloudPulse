"""Configuration safety defaults."""

from app.config import Settings


def test_debug_is_disabled_by_default():
    settings = Settings(_env_file=None)

    assert settings.debug is False
