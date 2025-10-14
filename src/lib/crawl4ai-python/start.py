#!/usr/bin/env python3
"""
Startup script for Crawl4AI Python service
"""

import subprocess
import sys
import os
import time
import requests

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import fastapi
        import uvicorn
        import crawl4ai
        print("✅ All dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        return False

def install_dependencies():
    """Install required dependencies"""
    print("📦 Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def start_service():
    """Start the FastAPI service"""
    print("🚀 Starting Crawl4AI service...")
    try:
        subprocess.run([sys.executable, "main.py"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start service: {e}")
        return False
    except KeyboardInterrupt:
        print("\n🛑 Service stopped by user")
        return True

def main():
    """Main function"""
    print("🤖 Crawl4AI Service Startup")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not os.path.exists("main.py"):
        print("❌ main.py not found. Please run this script from the crawl4ai-python directory")
        sys.exit(1)
    
    # Check dependencies
    if not check_dependencies():
        print("📦 Installing missing dependencies...")
        if not install_dependencies():
            print("❌ Failed to install dependencies. Please install manually:")
            print("   pip install -r requirements.txt")
            sys.exit(1)
    
    # Start service
    start_service()

if __name__ == "__main__":
    main()
