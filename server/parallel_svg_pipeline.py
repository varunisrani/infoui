from flask import request, jsonify
from concurrent.futures import ThreadPoolExecutor
import base64
from io import BytesIO
from PIL import Image
import pytesseract
import os
import uuid
from datetime import datetime
import vtracer
from app import (
    app,
    check_vector_suitability,
    plan_design,
    generate_design_knowledge,
    pre_enhance_prompt,
    enhance_prompt_with_chat,
    generate_image_with_gpt,
    save_svg,
    logger,
    IMAGES_DIR
)
import numpy as np
import remove_text_simple
import png_to_svg_converter
from openai import OpenAI
import requests
import re

# Directory for parallel pipeline outputs
PARALLEL_OUTPUTS_DIR = os.path.join(IMAGES_DIR, 'parallel')
os.makedirs(PARALLEL_OUTPUTS_DIR, exist_ok=True)

# Instantiate a GPT client for chat completions
chat_client = OpenAI()

def process_ocr_svg(image_data):
    """Generate a text-only SVG using GPT-4.1-mini by passing the image directly to the chat API."""
    # Base64-encode the PNG image
    img_b64 = base64.b64encode(image_data).decode('utf-8')
    # Build prompts matching app.py's generate_svg_from_image style
    system_prompt = """You are an expert SVG code generator. Your task is to create precise, clean, and optimized SVG code that exactly matches the provided image. Follow these guidelines:
1. Create SVG with dimensions 1080x1080 pixels
2. Ensure perfect positioning and alignment of all elements
3. Use appropriate viewBox and preserveAspectRatio attributes
4. Implement proper layering of elements
5. Optimize paths and shapes for better performance
6. Use semantic grouping (<g>) for related elements
7. Include necessary font definitions and styles
8. Ensure text elements are properly positioned and styled
9. Implement gradients, patterns, or filters if present in the image
10. Use precise color values matching the image exactly

Focus on producing production-ready, clean SVG code that renders identically to the input image.
Return ONLY the SVG code without any explanations or comments."""
    user_content = [
        {"type": "text", "text": "Generate an SVG that contains only text elements exactly as seen in the image."},
        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}}
    ]
    # Call Chat Completions API directly to support image_url message
    payload = {
        "model": "gpt-4.1-mini",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "temperature": 1,
        "max_tokens": 2000
    }
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY_SVG')}"
    }
    response = requests.post(url, headers=headers, json=payload)
    data = response.json()
    if response.status_code != 200:
        logger.error(f"Error generating text SVG: {data}")
        raise Exception("Text SVG generation failed")
    content = data["choices"][0]["message"]["content"]
    # Extract the SVG
    match = re.search(r'<svg.*?</svg>', content, re.DOTALL)
    svg_code = match.group(0) if match else content.strip()
    # Save and return
    svg_filename = save_svg(svg_code, prefix='text_svg')
    return svg_code, svg_filename

def process_clean_svg(image_data):
    """Process text removal and convert to clean SVG"""
    # Save the original image bytes to a temporary PNG file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    temp_input_path = f"temp_input_{timestamp}_{uuid.uuid4()}.png"
    with open(temp_input_path, "wb") as f:
        f.write(image_data)

    # Remove text from the image using remove_text_simple
    edited_png_path = remove_text_simple.remove_text(temp_input_path)

    # Convert the edited PNG to SVG using vtracer with optimized settings
    output_svg_path = os.path.join(IMAGES_DIR, f"clean_{timestamp}_{uuid.uuid4().hex[:8]}.svg")
    vtracer.convert_image_to_svg_py(
        edited_png_path,
        output_svg_path,
        colormode='color',
        hierarchical='stacked',
        mode='spline',
        filter_speckle=4,
        color_precision=6,
        layer_difference=16,
        corner_threshold=60,
        length_threshold=4.0,
        max_iterations=10,
        splice_threshold=45,
        path_precision=3
    )

    # Read the generated SVG content
    with open(output_svg_path, 'r') as f:
        clean_svg_code = f.read()

    # Cleanup the temporary input file
    os.remove(temp_input_path)

    # Return clean SVG code and paths
    return clean_svg_code, output_svg_path, edited_png_path

def combine_svgs(text_svg_code, traced_svg_code):
    """Combine text and path SVGs using GPT-4o-mini to produce a unified SVG."""
    import time
    logger.info('Stage 8: Combining SVGs using HTTP API')
    logger.info('Stage 8.1: Starting SVG combination process')
    text_size = len(text_svg_code.encode('utf-8')) if isinstance(text_svg_code, str) else len(text_svg_code)
    path_size = len(traced_svg_code.encode('utf-8')) if isinstance(traced_svg_code, str) else len(traced_svg_code)
    logger.info(f'Stage 8.2: Input sizes - Text SVG: {text_size} bytes, Traced SVG: {path_size} bytes')
    logger.info('Stage 8.3: Preparing HTTP API request')
    system_prompt = """You are an expert SVG code combiner. Given two complete SVG strings -- one containing vector paths and the other containing text elements and style definitions -- generate a single valid SVG. Ensure the combined SVG uses the correct namespaces and viewBox, places paths behind text, preserves all attributes verbatim, and includes the entire <style> block from the Text-only SVG verbatim at the top of the combined SVG. Return only the final SVG code without comments or extra markup."""
    user_msg = f"Path-only SVG:\n{traced_svg_code}\n\nText-only SVG:\n{text_svg_code}"
    messages = [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': user_msg}
    ]
    # Prepare HTTP request
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f"Bearer {os.getenv('OPENAI_API_KEY')}"
    }
    payload = {
        'model': 'gpt-4o-mini',
        'messages': messages,
        'temperature': 0
    }
    start_time = time.time()
    logger.info('Stage 8.4: Sending HTTP request to OpenAI API')
    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    api_response_time = time.time() - start_time
    logger.info(f'Stage 8.5: HTTP response received in {api_response_time:.2f} seconds')
    if resp.status_code != 200:
        logger.error(f'Stage 8 ERROR: {resp.status_code} - {resp.text}')
        raise Exception("HTTP combine_svgs API call failed")
    data = resp.json()
    combined_svg = data['choices'][0]['message']['content'].strip()
    combined_size = len(combined_svg.encode('utf-8'))
    logger.info(f'Stage 8.6: Combined SVG size: {combined_size} bytes')
    total_time = time.time() - start_time
    logger.info(f'Stage 8.9: SVG combination completed in {total_time:.2f} seconds total')
    return combined_svg

@app.route('/api/generate-parallel-svg', methods=['POST'])
def generate_parallel_svg():
    """Pipeline: Stages 1-6 image gen, then parallel Stage 7: OCR+SVG and Clean SVG generation"""
    data = request.json or {}
    user_input = data.get('prompt', '')
    skip_enhancement = data.get('skip_enhancement', False)

    if not user_input:
        return jsonify({'error': 'No prompt provided'}), 400

    logger.info('=== PARALLEL SVG PIPELINE START ===')

    # Stage 2: Design Planning
    logger.info('Stage 2: Design Planning')
    design_plan = plan_design(user_input)

    # Stage 3: Design Knowledge Generation
    logger.info('Stage 3: Design Knowledge Generation')
    design_knowledge = generate_design_knowledge(design_plan, user_input)

    # Prepare context for enhancements
    design_context = f"""Design Plan:\n{design_plan}\n\nDesign Knowledge and Best Practices:\n{design_knowledge}\n\nOriginal Request:\n{user_input}"""

    # Stages 4 & 5 skipped: Prompt Enhancements removed
    # Build an improved image prompt using design context and quality guidelines
    image_prompt = (
        f"{design_context}\n\n"
        "Generate a high-resolution, full-color poster or logo with a cohesive color theme, "
        "well-defined background, visual hierarchy, and professional composition. "
        "Use vibrant yet balanced colors, add depth with shadows or overlays, and ensure a clear focal point."
    )
    # Stage 6: Image Generation via GPT-Image using enhanced prompt
    logger.info('Stage 6: Image Generation via GPT-Image with enhanced prompt')
    logger.debug(f'Image prompt: {image_prompt}')
    image_base64, image_filename = generate_image_with_gpt(image_prompt)
    image_data = base64.b64decode(image_base64)

    # Stage 7: Parallel Processing
    logger.info('Stage 7: Parallel Processing - OCR+SVG and Clean SVG')
    with ThreadPoolExecutor(max_workers=2) as executor:
        # Submit both tasks
        ocr_future = executor.submit(process_ocr_svg, image_data)
        clean_future = executor.submit(process_clean_svg, image_data)
        
        # Get results
        text_svg_code, text_svg_path = ocr_future.result()
        clean_svg_code, clean_svg_path, edited_png_path = clean_future.result()

    # Stage 8: Combine SVGs
    logger.info('Stage 8: Combining SVGs using HTTP API')
    combined_svg_code = combine_svgs(text_svg_code, clean_svg_code)
    combined_svg_filename = f"combined_svg_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.svg"
    combined_svg_path = os.path.join(IMAGES_DIR, combined_svg_filename)
    with open(combined_svg_path, 'w') as f:
        f.write(combined_svg_code)

    # Create a session subfolder and move outputs there
    session_folder = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
    output_folder = os.path.join(PARALLEL_OUTPUTS_DIR, session_folder)
    os.makedirs(output_folder, exist_ok=True)

    # Base URL for parallel outputs
    base_url = '/static/images/parallel'

    # Move generated image into session folder
    src_image = os.path.join(IMAGES_DIR, image_filename)
    dst_image = os.path.join(output_folder, image_filename)
    os.rename(src_image, dst_image)

    # Move text SVG into session folder
    src_text_svg = os.path.join(IMAGES_DIR, text_svg_path)
    dst_text_svg = os.path.join(output_folder, text_svg_path)
    os.rename(src_text_svg, dst_text_svg)

    # Move cleaned SVG into session folder
    if not os.path.isabs(clean_svg_path):
        src_clean_svg = os.path.join(os.getcwd(), clean_svg_path)
    else:
        src_clean_svg = clean_svg_path
    dst_clean_svg = os.path.join(output_folder, os.path.basename(clean_svg_path))
    os.rename(src_clean_svg, dst_clean_svg)

    # Move combined SVG into session folder
    src_combined_svg = combined_svg_path
    dst_combined_svg = os.path.join(output_folder, combined_svg_filename)
    os.rename(src_combined_svg, dst_combined_svg)

    # Move cleaned PNG (converter input) into session folder
    src_edited_png = edited_png_path if os.path.isabs(edited_png_path) else edited_png_path
    dst_edited_png = os.path.join(output_folder, os.path.basename(edited_png_path))
    os.rename(src_edited_png, dst_edited_png)
    edited_png_url = f"{base_url}/{session_folder}/{os.path.basename(edited_png_path)}"

    # Construct URLs for client access
    image_url = f"{base_url}/{session_folder}/{image_filename}"
    text_svg_url = f"{base_url}/{session_folder}/{text_svg_path}"
    clean_svg_url = f"{base_url}/{session_folder}/{os.path.basename(clean_svg_path)}"
    combined_svg_url = f"{base_url}/{session_folder}/{combined_svg_filename}"

    return jsonify({
        'original_prompt': user_input,
        'image_url': image_url,
        'edited_png': {
            'path': f"parallel/{session_folder}/{os.path.basename(edited_png_path)}",
            'url': edited_png_url
        },
        'text_svg': {
            'code': text_svg_code,
            'path': f"parallel/{session_folder}/{text_svg_path}"
        },
        'clean_svg': {
            'code': clean_svg_code,
            'path': f"parallel/{session_folder}/{os.path.basename(clean_svg_path)}"
        },
        'combined_svg': {
            'code': combined_svg_code,
            'path': f"parallel/{session_folder}/{combined_svg_filename}",
            'url': combined_svg_url
        },
        'stage': 8
    })

if __name__ == '__main__':
    # Run standalone on port 5004
    app.run(host='127.0.0.1', port=5004, debug=True) 