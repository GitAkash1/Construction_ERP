import os
import sys

# Ensure backend directory is on Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from backend.config.wsgi import application

app = application
