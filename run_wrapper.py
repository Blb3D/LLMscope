import os

if os.environ.get("LLMSCOPE_DEV") == "1":
    print("[DEV MODE] Running from Python sources...")
    from Web import app as app_module
else:
    try:
        from Web import app as app_module
    except ImportError as e:
        raise SystemExit("Error: app not found. Ensure build is compiled.\n" + str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app_module.app, host="127.0.0.1", port=5000)
