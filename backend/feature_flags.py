"""
Feature flags for LLMscope v1.0.0 development.
Allows gradual rollout of new features without breaking v0.2.x compatibility.
"""

import os
from typing import Dict, Any


class FeatureFlags:
    """Centralized feature flag management"""
    
    def __init__(self):
        self._flags = {
            # Phase 0: P0 fixes
            'ENHANCED_TELEMETRY': self._get_bool('FEATURE_ENHANCED_TELEMETRY', False),
            'COPILOT_COGNITIVE_LOAD': self._get_bool('FEATURE_COPILOT_COGNITIVE_LOAD', False),
            'CASE_REPORTS': self._get_bool('FEATURE_CASE_REPORTS', False),
            'ZOOMED_CHART': self._get_bool('FEATURE_ZOOMED_CHART', False),
            
            # Phase 1: Security & Performance
            'CONNECTION_POOLING': self._get_bool('FEATURE_CONNECTION_POOLING', False),
            'RATE_LIMITING': self._get_bool('FEATURE_RATE_LIMITING', False),
            'PYDANTIC_VALIDATION': self._get_bool('FEATURE_PYDANTIC_VALIDATION', False),
            
            # Phase 2: Core features
            'NELSON_R4_R8': self._get_bool('FEATURE_NELSON_R4_R8', False),
            'PROMETHEUS_METRICS': self._get_bool('FEATURE_PROMETHEUS_METRICS', False),
            'WEBHOOKS': self._get_bool('FEATURE_WEBHOOKS', False),
            'CUSTOM_ALERT_CONFIG': self._get_bool('FEATURE_CUSTOM_ALERT_CONFIG', False),
            
            # Phase 3: Frontend
            'WEBSOCKET_DASHBOARD': self._get_bool('FEATURE_WEBSOCKET_DASHBOARD', False),
            'DARK_MODE': self._get_bool('FEATURE_DARK_MODE', False),
            'EXPORT_CONTROLS': self._get_bool('FEATURE_EXPORT_CONTROLS', False),
            
            # Phase 4: Advanced
            'MULTI_MODEL': self._get_bool('FEATURE_MULTI_MODEL', False),
            'HISTORICAL_TRENDS': self._get_bool('FEATURE_HISTORICAL_TRENDS', False),
        }
    
    def _get_bool(self, key: str, default: bool) -> bool:
        """Get boolean value from environment variable"""
        value = os.getenv(key, str(default)).lower()
        return value in ('true', '1', 'yes', 'on')
    
    def is_enabled(self, flag: str) -> bool:
        """Check if a feature flag is enabled"""
        return self._flags.get(flag, False)
    
    def get_all(self) -> Dict[str, Any]:
        """Get all feature flags"""
        return self._flags.copy()
    
    def enable(self, flag: str):
        """Enable a feature flag (for testing)"""
        if flag in self._flags:
            self._flags[flag] = True
    
    def disable(self, flag: str):
        """Disable a feature flag (for testing)"""
        if flag in self._flags:
            self._flags[flag] = False


# Global instance
FLAGS = FeatureFlags()


def is_feature_enabled(flag: str) -> bool:
    """
    Check if a feature is enabled.
    
    Usage:
        from backend.feature_flags import is_feature_enabled
        
        if is_feature_enabled('NELSON_R4_R8'):
            # Use new Nelson Rules implementation
            pass
        else:
            # Use legacy implementation
            pass
    """
    return FLAGS.is_enabled(flag)
