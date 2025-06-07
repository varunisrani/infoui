import os
import sys
import json
import requests
import pytest
from PIL import Image, ImageChops

# Add server directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'server')))
import app

# Endpoint URL (assumes server is running locally on port 5001)
API_URL = os.getenv('API_URL', 'http://localhost:5001/api/generate-svg')

# Load golden test cases
with open(os.path.abspath(os.path.join(os.path.dirname(__file__), 'golden.json')), 'r', encoding='utf-8') as f:
    golden = json.load(f)

@ pytest.mark.parametrize('case', golden)
def test_regression_case(case):
    # Call the SVG generation endpoint
    response = requests.post(API_URL, json={'prompt': case['prompt']})
    assert response.status_code == 200, f"API error: {response.text}"
    data = response.json()
    svg_code = data.get('svg_code', '')

    # Verify text element count
    text_count = svg_code.count('<text')
    assert text_count >= case['expected_texts'], (
        f"Expected at least {case['expected_texts']} <text> elements, got {text_count}"
    )

    # Verify path element count
    path_count = svg_code.count('<path')
    assert path_count <= case['max_paths'], (
        f"Expected at most {case['max_paths']} <path> elements, got {path_count}"
    )

    # Generate PNG from SVG for visual diff
    svg_filename, png_filename = app.convert_svg_to_png(svg_code)
    test_png_path = os.path.abspath(os.path.join('server', 'static', 'images', png_filename))
    golden_png_path = os.path.abspath(os.path.join(os.path.dirname(__file__), case['golden_image']))

    test_img = Image.open(test_png_path).convert('RGB')
    golden_img = Image.open(golden_png_path).convert('RGB')
    diff_img = ImageChops.difference(test_img, golden_img)

    # Count non-zero (different) pixels
    diff_pixels = sum(1 for px in diff_img.getdata() if px != (0, 0, 0))
    assert diff_pixels <= case.get('max_diff_pixels', 100), (
        f"Image diff too high ({diff_pixels} pixels > {case.get('max_diff_pixels')} allowed)"
    ) 