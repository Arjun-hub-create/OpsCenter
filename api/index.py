import os
import sys

# Add backend directory to sys.path so it can find main, database, etc.
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from main import app
