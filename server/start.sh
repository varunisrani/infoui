#!/bin/bash

# Find the Python executable (try python3 first, then python)
if command -v python3 &>/dev/null; then
    PYTHON=python3
elif command -v python &>/dev/null; then
    PYTHON=python
else
    echo "Error: Python is not installed or not in PATH"
    exit 1
fi

echo "Using Python: $($PYTHON --version)"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
else
    echo "Creating virtual environment..."
    $PYTHON -m venv venv
    source venv/bin/activate
    echo "Upgrading pip..."
    $PYTHON -m pip install --upgrade pip
    echo "Installing requirements..."
    $PYTHON -m pip install -r requirements.txt
fi

# Start the server
echo "Starting the AI SVG Generator server..."
$PYTHON app.py 