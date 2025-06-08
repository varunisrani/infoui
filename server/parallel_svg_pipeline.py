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

# Directory for parallel pipeline outputs
PARALLEL_OUTPUTS_DIR = os.path.join(IMAGES_DIR, 'parallel')
os.makedirs(PARALLEL_OUTPUTS_DIR, exist_ok=True)

# Instantiate a GPT client for chat completions
chat_client = OpenAI()

def process_ocr_svg(image_data):
    """Extract text with OCR, then use GPT-4.1-mini to format into SVG."""
    # Decode image and run OCR
    img = Image.open(BytesIO(image_data))
    ocr_data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    elements = []
    # Filter settings
    MIN_CONFIDENCE = 60  # ignore any OCR result below this confidence
    for i, txt in enumerate(ocr_data.get('text', [])):
        # Skip low-confidence or empty results
        try:
            conf = float(ocr_data['conf'][i])
        except:
            conf = 0.0
        if conf < MIN_CONFIDENCE:
            continue
        text = txt.strip()
        if not text:
            continue
        # Filter out stray single-character results
        if len(text) < 2:
            continue
        x, y, w, h = (
            ocr_data['left'][i],
            ocr_data['top'][i],
            ocr_data['width'][i],
            ocr_data['height'][i]
        )
        cx, cy = x + w // 2, y + h // 2
        pixel = img.getpixel((cx, cy))
        if isinstance(pixel, tuple) and len(pixel) >= 3:
            fill = f"#{pixel[0]:02x}{pixel[1]:02x}{pixel[2]:02x}"
        else:
            fill = '#000000'
        elements.append({
            'text': text,
            'x': x,
            'y': y + h,
            'font_size': h,
            'fill': fill
        })
    # Canvas dimensions
    width, height = img.size
    view_box = f"0 0 {width} {height}"
    # Build prompt for GPT
    import json
    system_msg = (
        "You are a precise SVG code generator. "
        "Given canvas width, height, viewBox, and a JSON array of text elements "
        "(with fields 'text', 'x', 'y', 'font_size', and 'fill'), output only a valid SVG string starting with the correct <svg> tag "
        "and one <text> element per item, using each 'text' value exactly as provided (no changes). "
        "Do not include explanations, comments, or extra markup."
    )
    user_msg = (
        f"Canvas width={width}, height={height}, viewBox={view_box}. "
        f"Text elements JSON: {json.dumps(elements)}"
    )
    response = chat_client.chat.completions.create(
        model='gpt-4.1-mini',
        messages=[{'role':'system','content':system_msg},{'role':'user','content':user_msg}],
        temperature=0
    )
    svg_code = response.choices[0].message.content.strip()
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

    # Convert the edited PNG to SVG using png_to_svg_converter
    output_svg_path = png_to_svg_converter.convert_png_to_svg(edited_png_path)

    # Read the generated SVG content
    with open(output_svg_path, 'r') as f:
        clean_svg_code = f.read()

    # Cleanup the temporary input file
    os.remove(temp_input_path)

    # Return clean SVG code and paths
    return clean_svg_code, output_svg_path, edited_png_path

def combine_svgs(text_svg_code, traced_svg_code):
    """Combine text SVG and traced SVG using GPT-4 for intelligent merging"""
    
    logger.info('Stage 8.1: Starting SVG combination process')
    start_time = datetime.now()
    
    # Log sizes for debugging
    text_svg_size = len(text_svg_code)
    traced_svg_size = len(traced_svg_code)
    logger.info(f'Stage 8.2: Input sizes - Text SVG: {text_svg_size} bytes, Traced SVG: {traced_svg_size} bytes')
    
    system_msg = (
        "You are an SVG expert that combines two SVGs into one cohesive SVG. "
        "The first SVG contains text elements, and the second SVG contains traced paths. "
        "Combine them while:\n"
        "1. Preserving all paths from the traced SVG\n"
        "2. Adding all text elements from the text SVG\n"
        "3. Using the larger of the two viewBox/dimensions\n"
        "4. Maintaining proper SVG structure and namespaces\n"
        "Output only the combined SVG code with no explanation."
    )
    
    user_msg = (
        f"Text SVG:\n{text_svg_code}\n\n"
        f"Traced SVG:\n{traced_svg_code}\n\n"
        "Please combine these SVGs into one, maintaining all visual elements from both."
    )
    
    logger.info('Stage 8.3: Preparing OpenAI API request')
    gpt_start_time = datetime.now()
    
    try:
        # Configure request parameters
        request_params = {
            'model': 'gpt-4.1-nano',
            'messages': [
                {'role': 'system', 'content': system_msg},
                {'role': 'user', 'content': user_msg}
            ],
            'temperature': 1,
            'max_tokens': 23000,  # Ensure enough tokens for SVG response
            'n': 1,  # Number of completions
            'stream': False,  # Don't stream the response
            'presence_penalty': 0,
            'frequency_penalty': 0
        }
        
        logger.info('Stage 8.4: Sending request to OpenAI API')
        response = chat_client.chat.completions.create(**request_params)
        
        gpt_duration = (datetime.now() - gpt_start_time).total_seconds()
        logger.info(f'Stage 8.5: OpenAI API response received in {gpt_duration:.2f} seconds')
        
        # Extract and validate response
        if not response.choices or len(response.choices) == 0:
            raise ValueError("No completion choices returned from OpenAI")
            
        combined_svg = response.choices[0].message.content.strip()
        combined_size = len(combined_svg)
        logger.info(f'Stage 8.6: Combined SVG size: {combined_size} bytes')
        
        # Validate SVG structure
        if not combined_svg.startswith('<?xml') and not combined_svg.startswith('<svg'):
            logger.warning('Stage 8.7: Warning - Combined SVG may not have proper XML/SVG header')
            
        # Check for minimum content
        if combined_size < (text_svg_size + traced_svg_size) * 0.5:
            logger.warning(f'Stage 8.8: Warning - Combined SVG size ({combined_size}) is unusually small compared to inputs')
        
        total_duration = (datetime.now() - start_time).total_seconds()
        logger.info(f'Stage 8.9: SVG combination completed in {total_duration:.2f} seconds total')
        
        return combined_svg
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f'Stage 8.X: Error during SVG combination: {error_msg}')
        if 'rate_limit' in error_msg.lower():
            logger.error('Stage 8.X: Rate limit exceeded - Consider implementing retry logic')
        elif 'token' in error_msg.lower():
            logger.error('Stage 8.X: Token-related error - Check API key or token limits')
        elif 'timeout' in error_msg.lower():
            logger.error('Stage 8.X: Request timed out - Consider increasing timeout or reducing input size')
        raise

@app.route('/api/generate-parallel-svg', methods=['POST'])
def generate_parallel_svg():
    """Pipeline: Stages 1-6 image gen, then parallel Stage 7: OCR+SVG and Clean SVG generation"""
    data = request.json or {}
    user_input = data.get('prompt', '')
    skip_enhancement = data.get('skip_enhancement', False)

    if not user_input:
        return jsonify({'error': 'No prompt provided'}), 400

    logger.info('=== PARALLEL SVG PIPELINE START ===')

    # Stage 1: Vector Suitability Check
    logger.info('Stage 1: Vector Suitability Check')
    vector_suitability = check_vector_suitability(user_input)
    if vector_suitability.get('not_suitable', False):
        return jsonify({
            'error': 'Not suitable for SVG',
            'guidance': vector_suitability.get('guidance'),
            'stage': 1
        }), 400

    # Stage 2: Design Planning
    logger.info('Stage 2: Design Planning')
    design_plan = plan_design(user_input)

    # Stage 3: Design Knowledge Generation
    logger.info('Stage 3: Design Knowledge Generation')
    design_knowledge = generate_design_knowledge(design_plan, user_input)

    # Prepare context for enhancements
    design_context = f"""Design Plan:\n{design_plan}\n\nDesign Knowledge and Best Practices:\n{design_knowledge}\n\nOriginal Request:\n{user_input}"""

    # Stage 4 & 5: Prompt Enhancements
    if skip_enhancement:
        enhanced_prompt = user_input
    else:
        logger.info('Stage 4: Pre-Enhancement')
        pre = pre_enhance_prompt(design_context)
        logger.info('Stage 5: Technical Enhancement')
        enhanced_prompt = enhance_prompt_with_chat(pre)

    # Stage 6: Image Generation via GPT-Image
    logger.info('Stage 6: Image Generation via GPT-Image')
    image_base64, image_filename = generate_image_with_gpt(enhanced_prompt)
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
    logger.info('Stage 8: Combining SVGs with GPT-4')
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