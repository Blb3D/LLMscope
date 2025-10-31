@app.get("/api/feature-flags")
async def get_feature_flags(_: bool = Depends(verify_api_key)):
    """Get enabled feature flags for frontend conditional rendering."""
    try:
        from feature_flags import FLAGS
        
        return {
            "enhanced_telemetry": FLAGS.is_enabled("ENHANCED_TELEMETRY"),
            "copilot_cognitive_load": FLAGS.is_enabled("COPILOT_COGNITIVE_LOAD"),
            "case_reports": FLAGS.is_enabled("CASE_REPORTS"),
            "zoomed_chart": FLAGS.is_enabled("ZOOMED_CHART"),
            "websocket_dashboard": FLAGS.is_enabled("WEBSOCKET_DASHBOARD"),
            "dark_mode": FLAGS.is_enabled("DARK_MODE"),
            "export_controls": FLAGS.is_enabled("EXPORT_CONTROLS"),
        }
    except Exception as e:
        # If feature flags module not found, return all disabled
        return {
            "enhanced_telemetry": False,
            "copilot_cognitive_load": False,
            "case_reports": False,
            "zoomed_chart": False,
            "websocket_dashboard": False,
            "dark_mode": False,
            "export_controls": False,
        }
