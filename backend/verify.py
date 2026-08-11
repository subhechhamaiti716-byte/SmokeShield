import sys
sys.path.insert(0, '.')
from app.main import app
print("Backend OK - all routers loaded successfully")
print("Routes:", [r.path for r in app.routes if hasattr(r, 'path')])
