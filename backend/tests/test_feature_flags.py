"""Tests for feature flags system"""

import os
import pytest
from backend.feature_flags import FeatureFlags, is_feature_enabled


def test_feature_flags_default_disabled():
    """All feature flags should be disabled by default"""
    flags = FeatureFlags()
    all_flags = flags.get_all()
    
    assert all(not value for value in all_flags.values()), \
        "All flags should be disabled by default"


def test_feature_flag_enabled_via_env(monkeypatch):
    """Feature flags can be enabled via environment variables"""
    monkeypatch.setenv('FEATURE_NELSON_R4_R8', 'true')
    
    flags = FeatureFlags()
    assert flags.is_enabled('NELSON_R4_R8'), \
        "Flag should be enabled when env var is set"


def test_feature_flag_various_true_values(monkeypatch):
    """Test various true values for environment variables"""
    true_values = ['true', 'True', '1', 'yes', 'YES', 'on', 'ON']
    
    for value in true_values:
        monkeypatch.setenv('FEATURE_ENHANCED_TELEMETRY', value)
        flags = FeatureFlags()
        assert flags.is_enabled('ENHANCED_TELEMETRY'), \
            f"Flag should be enabled for value: {value}"


def test_feature_flag_false_values(monkeypatch):
    """Test various false values for environment variables"""
    false_values = ['false', 'False', '0', 'no', 'NO', 'off', 'OFF']
    
    for value in false_values:
        monkeypatch.setenv('FEATURE_ENHANCED_TELEMETRY', value)
        flags = FeatureFlags()
        assert not flags.is_enabled('ENHANCED_TELEMETRY'), \
            f"Flag should be disabled for value: {value}"


def test_is_feature_enabled_function():
    """Test global is_feature_enabled function"""
    # Should be disabled by default
    assert not is_feature_enabled('WEBSOCKET_DASHBOARD')


def test_enable_disable_methods():
    """Test enable/disable methods for testing"""
    flags = FeatureFlags()
    
    # Initially disabled
    assert not flags.is_enabled('DARK_MODE')
    
    # Enable
    flags.enable('DARK_MODE')
    assert flags.is_enabled('DARK_MODE')
    
    # Disable
    flags.disable('DARK_MODE')
    assert not flags.is_enabled('DARK_MODE')


def test_unknown_flag_returns_false():
    """Unknown flags should return False"""
    flags = FeatureFlags()
    assert not flags.is_enabled('UNKNOWN_FLAG')


def test_all_phase_0_flags_defined():
    """Ensure all Phase 0 (P0) flags are defined"""
    flags = FeatureFlags()
    all_flags = flags.get_all()
    
    phase_0_flags = [
        'ENHANCED_TELEMETRY',
        'COPILOT_COGNITIVE_LOAD',
        'CASE_REPORTS',
        'ZOOMED_CHART'
    ]
    
    for flag in phase_0_flags:
        assert flag in all_flags, f"Phase 0 flag {flag} should be defined"


def test_all_phase_1_flags_defined():
    """Ensure all Phase 1 flags are defined"""
    flags = FeatureFlags()
    all_flags = flags.get_all()
    
    phase_1_flags = [
        'CONNECTION_POOLING',
        'RATE_LIMITING',
        'PYDANTIC_VALIDATION'
    ]
    
    for flag in phase_1_flags:
        assert flag in all_flags, f"Phase 1 flag {flag} should be defined"


def test_all_phase_2_flags_defined():
    """Ensure all Phase 2 flags are defined"""
    flags = FeatureFlags()
    all_flags = flags.get_all()
    
    phase_2_flags = [
        'NELSON_R4_R8',
        'PROMETHEUS_METRICS',
        'WEBHOOKS',
        'CUSTOM_ALERT_CONFIG'
    ]
    
    for flag in phase_2_flags:
        assert flag in all_flags, f"Phase 2 flag {flag} should be defined"
