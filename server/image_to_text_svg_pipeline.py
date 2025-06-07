from flask import request, jsonify
from app import (
    app,
    check_vector_suitability,
    plan_design,
    generate_design_knowledge,
    pre_enhance_prompt,
    enhance_prompt_with_chat,
    generate_image_with_gpt,
    save_svg,
    logger
)
import base64
from io import BytesIO
from PIL import Image
import pytesseract

@app.route('/api/generate-text-svg', methods=['POST'])
def generate_image_text_svg():
    """Pipeline: Stages 1–6 image gen, then Stage 7: text OCR & SVG generation"""
    data = request.json or {}
    user_input = data.get('prompt', '')
    skip_enhancement = data.get('skip_enhancement', False)

    if not user_input:
        return jsonify({'error': 'No prompt provided'}), 400

    logger.info('=== IMAGE→TEXT→SVG PIPELINE START ===')

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

    # Stage 7: OCR and SVG generation
    logger.info('Stage 7: OCR and SVG Generation')
    image_data = base64.b64decode(image_base64)
    image = Image.open(BytesIO(image_data))
    # Extract text bounding boxes
    ocr_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    elements = []
    for i, txt in enumerate(ocr_data.get('text', [])):
        text = txt.strip()
        if not text:
            continue
        x = ocr_data['left'][i]
        y = ocr_data['top'][i]
        w = ocr_data['width'][i]
        h = ocr_data['height'][i]
        # sample color at center
        cx = x + w // 2
        cy = y + h // 2
        color_pixel = image.getpixel((cx, cy))
        color = ('#%02x%02x%02x' % color_pixel) if isinstance(color_pixel, tuple) else '#000000'
        font_size = h
        # y+h to adjust baseline
        elements.append(
            f'<text x="{x}" y="{y + h}" fill="{color}" '
            f'font-size="{font_size}" font-family="sans-serif">{text}</text>'
        )
    width, height = image.size
    svg_code = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">{"".join(elements)}</svg>'
    )
    # Save SVG
    svg_filename = save_svg(svg_code, prefix='text_svg')

    return jsonify({
        'original_prompt': user_input,
        'image_url': f'/static/images/{image_filename}',
        'svg_code': svg_code,
        'svg_path': svg_filename,
        'stage': 7
    })

if __name__ == '__main__':
    # Run standalone on port 5003
    app.run(host='127.0.0.1', port=5003, debug=True) 