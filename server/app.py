from flask import Flask, request, jsonify, send_from_directory
import os
import requests
import json
import logging
from flask_cors import CORS
import re
import base64
from io import BytesIO
import cairosvg
from PIL import Image, ImageDraw, ImageFont
import openai
import uuid
from datetime import datetime
from dotenv import load_dotenv
import vtracer  # Add vtracer import

# Load environment variables
load_dotenv()

# Configure OpenAI API
OPENAI_CHAT_ENDPOINT = "https://api.openai.com/v1/chat/completions"
OPENAI_API_KEY_ENHANCER = os.getenv('OPENAI_API_KEY')

# Model configurations
PLANNER_MODEL = "gpt-4.1-mini"
DESIGN_KNOWLEDGE_MODEL = "gpt-4.1-mini"
PRE_ENHANCER_MODEL = "gpt-4.1-mini"
PROMPT_ENHANCER_MODEL = "gpt-4.1-mini"
GPT_IMAGE_MODEL = "gpt-image-1"
SVG_GENERATOR_MODEL = "gpt-4.1-mini"
CHAT_ASSISTANT_MODEL = "gpt-4.1-mini"

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Configure paths
IMAGES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'images')
os.makedirs(IMAGES_DIR, exist_ok=True)

# Configure CORS with specific settings
CORS(app, 
     origins=[
         'http://localhost:3000', 
         'http://localhost:3001',
         'http://127.0.0.1:3000', 
         'http://127.0.0.1:3001',
         'https://pppp-351z.onrender.com',
         'https://infoui.vercel.app',
         'https://infoui.vercel.app/'
     ],
     methods=['GET', 'POST', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'],
     supports_credentials=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Directory setup
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
IMAGES_DIR = os.path.join(STATIC_DIR, 'images')
os.makedirs(IMAGES_DIR, exist_ok=True)

# API keys
OPENAI_API_KEY_SVG = os.getenv('OPENAI_API_KEY_SVG')

if not OPENAI_API_KEY_ENHANCER or not OPENAI_API_KEY_SVG:
    raise ValueError("OpenAI API keys must be set in environment variables")

# OpenAI client setup
openai.api_key = OPENAI_API_KEY_SVG

# OpenAI API Endpoints
OPENAI_API_BASE = "https://api.openai.com/v1"
OPENAI_CHAT_ENDPOINT = f"{OPENAI_API_BASE}/chat/completions"

def check_vector_suitability(user_input):
    """Check if the prompt is suitable for SVG vector graphics"""
    logger.info(f"Checking vector suitability for: {user_input[:100]}...")
    
    url = OPENAI_CHAT_ENDPOINT
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY_ENHANCER}"
    }

    payload = {
        "model": PLANNER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": """You are a vector graphics expert. Your task is to determine if a design request is suitable for SVG vector graphics.

Guidelines for SVG suitability:
1. Ideal for logos, icons, illustrations, typography, and geometric designs
2. Good for flat or minimalist designs
3. Suitable for designs with clear shapes and paths
4. Works well with text and typography
5. Perfect for scalable graphics without loss of quality

Not suitable for:
1. Photorealistic images
2. Complex textures and gradients
3. Designs requiring many minute details
4. Photographs or photo manipulations
5. Complex 3D renderings

Provide guidance if the request isn't suitable."""
            },
            {
                "role": "user",
                "content": user_input
            }
        ],
        "temperature": 0.7,
        "max_tokens": 500
    }

    response = requests.post(url, headers=headers, json=payload)
    response_data = response.json()

    if response.status_code != 200:
        logger.error(f"Vector suitability check error: {response_data}")
        return {"not_suitable": False}  # Default to allowing if check fails

    analysis = response_data["choices"][0]["message"]["content"].lower()
    not_suitable = "not suitable" in analysis or "unsuitable" in analysis
    
    return {
        "not_suitable": not_suitable,
        "guidance": response_data["choices"][0]["message"]["content"] if not_suitable else None
    }

def plan_design(user_input):
    """Plan the design approach based on user input"""
    logger.info(f"Planning design for: {user_input[:100]}...")
    
    url = OPENAI_CHAT_ENDPOINT
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY_ENHANCER}"
    }

    payload = {
        "model": PLANNER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": """You are a design planner. Create a structured plan for the design request.

Your plan should include:
1. Design Goals
   - Main purpose
   - Target audience
   - Key message/emotion

2. Design Elements
   - Layout structure
   - Key components
   - Typography needs
   - Color scheme approach
   - Visual hierarchy

3. Technical Considerations
   - SVG optimization requirements
   - Responsive design needs
   - Browser compatibility
   - Performance considerations

4. Implementation Strategy
   - Component breakdown
   - Order of creation
   - Special effects/animations
   - Testing requirements

Be specific and practical. Focus on actionable details."""
            },
            {
                "role": "user",
                "content": user_input
            }
        ],
        "temperature": 0.7,
        "max_tokens": 1000
    }

    response = requests.post(url, headers=headers, json=payload)
    response_data = response.json()

    if response.status_code != 200:
        logger.error(f"Design planning error: {response_data}")
        return "Error in design planning"

    return response_data["choices"][0]["message"]["content"]

def generate_design_knowledge(design_plan, user_input):
    """Generate specific design knowledge based on the plan and user input"""
    logger.info("Generating design knowledge...")
    
    url = OPENAI_CHAT_ENDPOINT
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY_ENHANCER}"
    }

    payload = {
        "model": DESIGN_KNOWLEDGE_MODEL,
        "messages": [
            {
                "role": "system",
                "content": """You are a design knowledge expert. Based on the design plan and user request, provide specific design knowledge and best practices.

Include:
1. Typography
   - Font recommendations
   - Size hierarchies
   - Spacing guidelines

2. Color Theory
   - Color palette suggestions
   - Contrast requirements
   - Accessibility considerations

3. Layout Principles
   - Grid systems
   - Alignment rules
   - White space usage

4. SVG Best Practices
   - Element organization
   - Optimization techniques
   - Animation possibilities

5. Technical Guidelines
   - Viewport settings
   - Responsive design approaches
   - Browser compatibility considerations

Be specific and provide actionable insights."""
            },
            {
                "role": "user",
                "content": f"Design Plan:\n{design_plan}\n\nUser Request:\n{user_input}"
            }
        ],
        "temperature": 0.7,
        "max_tokens": 1500
    }

    response = requests.post(url, headers=headers, json=payload)
    response_data = response.json()

    if response.status_code != 200:
        logger.error(f"Design knowledge generation error: {response_data}")
        return "Error in generating design knowledge"

    return response_data["choices"][0]["message"]["content"]

def pre_enhance_prompt(user_input):
    """Initial enhancement of user query using standard GPT-4o mini"""
    logger.info(f"Pre-enhancing prompt: {user_input[:100]}...")
    
    url = OPENAI_CHAT_ENDPOINT
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY_ENHANCER}"
    }

    payload = {
        "model": PRE_ENHANCER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": """You are an expert design prompt enhancer. Your task is to take a user's design request and enhance it with specific details about:

1. Layout and Composition
   - Overall structure
   - Element positioning
   - Balance and hierarchy
   - Whitespace usage

2. Typography
   - Font styles and families
   - Text sizes and weights
   - Text alignment and spacing
   - Font combinations

3. Colors
   - Color scheme
   - Background colors
   - Text colors
   - Element colors
   - Color relationships

4. Visual Elements
   - Shapes and forms
   - Lines and borders
   - Icons and symbols
   - Decorative elements

5. Technical Requirements
   - SVG-specific considerations
   - Responsive design needs
   - Browser compatibility
   - Accessibility requirements

Convert the user's request into a detailed, technical design specification that maintains their original intent while adding necessary details for SVG creation.

Focus on vector-friendly design elements and avoid non-SVG compatible features."""
            },
            {
                "role": "user",
                "content": user_input
            }
        ],
        "temperature": 0.7,
        "max_tokens": 1500
    }

    logger.info(f"Calling OpenAI Chat API for initial prompt enhancement with model: {PRE_ENHANCER_MODEL}")
    response = requests.post(url, headers=headers, json=payload)
    response_data = response.json()

    if response.status_code != 200:
        logger.error(f"OpenAI API error: {response_data}")
        logger.error(f"Response status code: {response.status_code}")
        logger.error(f"Response headers: {response.headers}")
        raise Exception(f"OpenAI API error: {response_data.get('error', {}).get('message', 'Unknown error')}")

    enhanced_prompt = response_data["choices"][0]["message"]["content"]
    logger.info(f"Successfully enhanced prompt. Result: {enhanced_prompt[:100]}...")
    return enhanced_prompt

def enhance_prompt_with_chat(user_input):
    """Enhance user prompt using Chat Completions API"""
    url = OPENAI_CHAT_ENDPOINT
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY_ENHANCER}"
    }

    payload = {
        "model": PROMPT_ENHANCER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": """You are an advanced SVG design prompt optimizer. Your role is to take a pre-enhanced design prompt and optimize it for SVG generation by ensuring:

1. Vector Optimization
   - Emphasize vector-friendly elements
   - Specify paths and shapes clearly
   - Define gradients and patterns appropriately
   - Optimize for SVG capabilities

2. Technical Precision
   - Exact dimensions and positions
   - Precise color values (HEX/RGB)
   - Font specifications with fallbacks
   - SVG viewport settings

3. Component Organization
   - Layering structure
   - Group definitions
   - Element IDs and classes
   - Reusable components

4. Performance Considerations
   - Optimize paths
   - Minimize complexity
   - Efficient use of groups
   - Browser compatibility

5. Accessibility and Responsiveness
   - ARIA labels
   - Semantic structure
   - Responsive scaling
   - Cross-browser support

Add these requirements to ensure proper SVG generation:
- Center alignment for all SVG elements
- Meaningful and clean SVG code
- Proper color contrast and visibility
- Font loading via both link and @font-face
- Proper alignment and visual balance

The final prompt should be highly detailed and technically precise while maintaining the original design intent."""
            },
            {
                "role": "user",
                "content": user_input
            }
        ],
        "temperature": 0.7,
        "max_tokens": 2000
    }

    logger.info(f"Calling OpenAI Chat API for prompt enhancement with model: {PROMPT_ENHANCER_MODEL}")
    response = requests.post(url, headers=headers, json=payload)
    response_data = response.json()

    if response.status_code != 200:
        logger.error(f"OpenAI API error: {response_data}")
        raise Exception(f"OpenAI API error: {response_data.get('error', {}).get('message', 'Unknown error')}")

    return response_data["choices"][0]["message"]["content"]

def generate_image_with_gpt(enhanced_prompt):
    """Generate image using GPT Image-1 model"""
    try:
        logger.info("Generating image with GPT Image-1")
        response = openai.images.generate(
            model=GPT_IMAGE_MODEL,
            prompt=enhanced_prompt,
            size="1024x1024",
            quality="low"
        )
        
        # Get base64 image data from the response
        # The response structure changed in newer versions of the API
        image_base64 = response.data[0].b64_json if hasattr(response.data[0], 'b64_json') else response.data[0].url
        
        # Save the generated image
        filename = save_image(image_base64, prefix="gpt_image")
        
        logger.info("Image generated and saved successfully with GPT Image-1")
        return image_base64, filename
    except Exception as e:
        logger.error(f"Error generating image with GPT Image-1: {str(e)}")
        raise

def combine_svg_elements(vectorized_svg, text_elements):
    """Combine vectorized elements with text elements"""
    logger.info("Combining SVG elements...")
    
    try:
        # Extract the SVG viewBox and dimensions
        viewbox_match = re.search(r'viewBox=[\'"]([^\'"]*)[\'"]', vectorized_svg)
        width_match = re.search(r'width=[\'"]([^\'"]*)[\'"]', vectorized_svg)
        height_match = re.search(r'height=[\'"]([^\'"]*)[\'"]', vectorized_svg)
        
        viewbox = viewbox_match.group(1) if viewbox_match else "0 0 1080 1080"
        width = width_match.group(1) if width_match else "1080"
        height = height_match.group(1) if height_match else "1080"
        
        # Extract the SVG content without the wrapper
        svg_content = re.search(r'<svg[^>]*>(.*?)</svg>', vectorized_svg, re.DOTALL)
        if not svg_content:
            logger.warning("Could not extract SVG content, returning original")
            return vectorized_svg
            
        inner_content = svg_content.group(1)
        
        # Create new SVG with precise positioning for both elements
        combined_svg = f'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'
        combined_svg += f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="{viewbox}" width="{width}" height="{height}" style="enable-background:new 0 0 {width} {height};">\n'
        combined_svg += '  <defs>\n'
        combined_svg += '    <style type="text/css">\n'
        combined_svg += '      @import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap");\n'
        combined_svg += '      @import url("https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap");\n'
        combined_svg += '      @import url("https://fonts.googleapis.com/css2?family=Georgia:ital@0;1&display=swap");\n'
        combined_svg += '      @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap");\n'
        combined_svg += '      @import url("https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap");\n'
        combined_svg += '      .text-content { font-family: inherit; }\n'
        combined_svg += '    </style>\n'
        combined_svg += '  </defs>\n'
        combined_svg += '  <!-- Vectorized elements -->\n'
        combined_svg += f'  <g id="vectorized-content">\n    {inner_content}\n  </g>\n'
        combined_svg += '  <!-- Text elements with precise positioning -->\n'
        combined_svg += f'  <g id="text-content" class="text-content">\n    {text_elements}\n  </g>\n'
        combined_svg += '</svg>'
        
        # Verify the combined SVG contains both vectorized and text elements
        has_vector = "vectorized-content" in combined_svg
        has_text = "text-content" in combined_svg and "<text" in text_elements
        
        if has_vector and has_text:
            logger.info("Successfully combined SVG elements with vectorized content and text elements")
        elif has_vector:
            logger.info("Combined SVG contains vectorized content but no text elements")
        elif has_text:
            logger.info("Combined SVG contains text elements but no vectorized content")
        else:
            logger.warning("Combined SVG may be missing both vectorized content and text elements")
        
        return combined_svg
        
    except Exception as e:
        logger.error(f"Error combining SVG elements: {str(e)}")
        logger.warning("Returning original vectorized SVG")
        return vectorized_svg

def extract_text_from_prompt(prompt):
    """Extract text elements that need to be generated separately"""
    logger.info("Extracting text elements from prompt...")
    
    url = OPENAI_CHAT_ENDPOINT
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY_ENHANCER}"
    }

    payload = {
        "model": PLANNER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": """You are a design text analyzer. Your task is to:
1. Identify all text elements that should be in the design
2. For each text element, specify:
   - The actual text content
   - Suggested font style/family
   - Approximate size (small, medium, large)
   - Position (top, bottom, center, etc.)
   - Any special styling (bold, italic, etc.)
   - Color suggestions

Return the analysis in a structured JSON format."""
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.7,
        "max_tokens": 1000,
        "response_format": { "type": "json_object" }
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response_data = response.json()
        return response_data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"Error extracting text elements: {str(e)}")
        return None

def analyze_image_for_text(image_path):
    """
    Analyze the image to identify text regions and their properties.
    Returns a list of text regions with their properties.
    """
    try:
        messages = [
            {"role": "system", "content": """You are an expert at analyzing images and identifying text elements. 
            Your task is to extract all text elements from the image with extremely precise measurements and properties.
            
            For each text element you find, provide:
            
            1. The exact text content (transcribe it exactly as it appears)
            2. Position (precise x, y coordinates of the top-left corner in pixels)
            3. Width and height of the text region (exact dimensions in pixels)
            4. Color (precise hex format, e.g. #000000 for black)
            5. Font size (precise size in pixels)
            6. Font weight (normal, bold, etc.)
            7. Font style (regular, italic, etc.)
            8. Alignment (left, center, right)
            9. Font family (your best guess at the font family)
            10. Text type (title, subtitle, body, quote, name, button, etc.)
            
            Be extremely precise with measurements and positioning - this is critical as text will be placed 
            exactly according to these coordinates in an SVG. Pay attention to:
            
            - The exact x,y coordinates (should be pixel-perfect)
            - The width and height (should be exact pixels)
            - Differentiating between separate text elements (don't combine text that should be separate)
            - The exact color of the text (provide accurate hex values)
            
            Return your analysis as a JSON array where each object represents one text element with all the properties above.
            Format: [{"text": "...", "x": 123, "y": 45, "width": 100, "height": 30, "color": "#000000", "font_size": 16, "font_weight": "normal", "font_style": "normal", "alignment": "left", "font_family": "Arial", "text_type": "body"}, {...}]
            """
            },
            {"role": "user", "content": f"Analyze this image and identify all text elements with their exact properties. Ensure measurements are extremely precise."}
        ]
        
        # Use vision API to analyze the image
        logger.info("Analyzing image for text using vision API...")
        response_json_str = chat_with_vision(messages, image_path)
        
        try:
            # The response is already a JSON string, so parse it directly
            content = response_json_str
            
            # Extract JSON array from the response
            json_match = re.search(r'\[\s*\{.*\}\s*\]', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                text_regions = json.loads(json_str)
            else:
                # Try to find any JSON object in the response
                try:
                    # Try to parse the entire content as JSON
                    json_obj = json.loads(content)
                    
                    # Check if it's an array
                    if isinstance(json_obj, list):
                        text_regions = json_obj
                    # Check if it's a wrapper object with regions field
                    elif isinstance(json_obj, dict):
                        if any(k for k in json_obj.keys() if 'text' in k.lower() or 'region' in k.lower()):
                            text_regions = json_obj.get('regions', []) or json_obj.get('text_regions', []) or []
                        elif 'results' in json_obj:
                            text_regions = json_obj.get('results', [])
                        else:
                            # Single region
                            text_regions = [json_obj]
                    else:
                        logger.warning("Unexpected JSON structure, using empty list")
                        text_regions = []
                except json.JSONDecodeError:
                    logger.warning("Failed to parse JSON from response, attempting to extract structured data")
                    
                    # Try to extract structured data from text
                    pattern = r'Text: "(.*?)"\s*Position: \((\d+),\s*(\d+)\)\s*Dimensions: (\d+)x(\d+)\s*Color: (#[0-9A-Fa-f]{6})'
                    matches = re.findall(pattern, content, re.DOTALL)
                    
                    text_regions = []
                    for match in matches:
                        text_regions.append({
                            "text": match[0],
                            "x": int(match[1]),
                            "y": int(match[2]),
                            "width": int(match[3]),
                            "height": int(match[4]),
                            "color": match[5],
                            "font_size": 16,  # Default
                            "font_weight": "normal",
                            "font_style": "normal",
                            "alignment": "left",
                            "font_family": "Arial",
                            "text_type": "body"
                        })
                    
                    if not text_regions:
                        logger.error("Could not extract structured text data")
                        text_regions = []
        except Exception as e:
            logger.error(f"Error parsing text regions: {str(e)}")
            text_regions = []
        
        # Validate and clean up text regions
        valid_regions = []
        for region in text_regions:
            # Ensure all required fields are present with appropriate types
            if not isinstance(region, dict):
                continue
                
            if "text" not in region or not region["text"]:
                continue
                
            # Ensure numeric values are actually numbers
            for field in ["x", "y", "width", "height", "font_size"]:
                if field in region:
                    try:
                        region[field] = float(region[field])
                    except (ValueError, TypeError):
                        region[field] = 0
                else:
                    # Default values if missing
                    if field == "font_size":
                        region[field] = 16
                    else:
                        region[field] = 0
            
            # Ensure color is a valid hex code
            if "color" not in region or not isinstance(region["color"], str) or not region["color"].startswith("#"):
                region["color"] = "#000000"  # Default to black
                
            # Ensure other text properties are present
            if "font_weight" not in region:
                region["font_weight"] = "normal"
            if "font_style" not in region:
                region["font_style"] = "normal"
            if "alignment" not in region:
                region["alignment"] = "left"
            if "font_family" not in region:
                region["font_family"] = "Arial"
            if "text_type" not in region:
                region["text_type"] = "body"
                
            valid_regions.append(region)
            
        logger.info(f"Found {len(valid_regions)} valid text regions")
        for i, region in enumerate(valid_regions):
            logger.info(f"Text region {i+1}: '{region['text']}' at ({region['x']}, {region['y']}) with size {region['width']}x{region['height']}, color {region['color']}")
        
        return valid_regions
        
    except Exception as e:
        logger.error(f"Error in analyze_image_for_text: {str(e)}")
        return []

def chat_with_vision(messages, image_path):
    """
    Call GPT-4.1-mini to analyze the image.
    Returns a JSON string containing the analysis results.
    """
    try:
        # Read and encode the image
        with open(image_path, 'rb') as image_file:
            image_data = image_file.read()
            base64_image = base64.b64encode(image_data).decode('utf-8')
        
        # Prepare the messages with the image
        messages_with_image = messages.copy()
        messages_with_image[1]["content"] = [
            {
                "type": "text",
                "text": messages[1]["content"]
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{base64_image}"
                }
            }
        ]
        
        # Use the existing OpenAI configuration
        url = OPENAI_CHAT_ENDPOINT
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY_ENHANCER}"
        }
        
        payload = {
            "model": "gpt-4.1-mini",  # Use the mini model as specified
            "messages": messages_with_image,
            "temperature": 0.7,
            "max_tokens": 4000,
            "response_format": { "type": "json_object" }  # Request JSON response
        }
        
        logger.info(f"Calling OpenAI API for vision analysis with model: gpt-4.1-mini")
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            # Extract content from the response
            content = result["choices"][0]["message"]["content"]
            
            # Ensure the content is valid JSON
            try:
                # Try to parse it as JSON to validate
                json_obj = json.loads(content)
                
                # Check if the JSON object already has text regions in the expected format
                if isinstance(json_obj, list):
                    # If it's already a list, return as is
                    return json.dumps(json_obj)
                elif isinstance(json_obj, dict):
                    # If it's a dictionary, check for text regions
                    if any(k for k in json_obj.keys() if 'text' in k.lower() or 'region' in k.lower() or 'result' in k.lower()):
                        # It has a proper structure, return as is
                        return content
                    else:
                        # It's a dictionary but doesn't have text regions, wrap it as a single region
                        # This handles the case where the model returns a single text region instead of an array
                        if "text" in json_obj:
                            return json.dumps([json_obj])
                        else:
                            # No text found in the image
                            return '{"text_regions": []}'
                else:
                    # Invalid JSON structure, return empty array
                    logger.warning("Invalid JSON structure from vision API")
                    return '{"text_regions": []}'
            except json.JSONDecodeError:
                # If not valid JSON, create a valid JSON structure
                logger.warning("Response was not valid JSON, returning empty array")
                return '{"text_regions": []}'
        else:
            logger.error(f"Error from OpenAI API: {response.text}")
            return '{"text_regions": []}'
            
    except Exception as e:
        logger.error(f"Error in vision analysis: {str(e)}")
        return '{"text_regions": []}'

def create_text_mask(image_path, text_regions):
    """
    Create a mask for text regions to exclude them from vectorization.
    """
    try:
        # Open the original image
        with Image.open(image_path) as img:
            # Create a new mask image with the same size
            mask = Image.new('L', img.size, 255)  # White background
            
            # For each text region, create a black rectangle with padding
            for region in text_regions:
                x = region.get('x', 0)
                y = region.get('y', 0)
                width = region.get('width', 100)  # Default width if not provided
                height = region.get('height', 30)  # Default height if not provided
                
                # Add padding around text area
                padding = 5
                x_start = max(0, int(x - padding))
                y_start = max(0, int(y - padding))
                x_end = min(img.size[0], int(x + width + padding))
                y_end = min(img.size[1], int(y + height + padding))
                
                # Draw black rectangle for text area
                for i in range(x_start, x_end):
                    for j in range(y_start, y_end):
                        mask.putpixel((i, j), 0)
            
            # Save the mask
            mask_path = image_path.replace('.png', '_mask.png')
            mask.save(mask_path)
            return mask_path
            
    except Exception as e:
        logger.error(f"Error creating text mask: {str(e)}")
        return None

def prepare_image_for_vectorization(image_path, text_regions):
    """
    Prepare image for vectorization by masking text regions.
    """
    try:
        # Open the original image
        with Image.open(image_path) as img:
            # Create a copy of the image for processing
            prepared_img = img.copy()
            draw = ImageDraw.Draw(prepared_img)
            
            # Get dominant background color around text areas for proper fill
            background_colors = []
            for region in text_regions:
                x = float(region.get('x', 0))
                y = float(region.get('y', 0))
                width = float(region.get('width', 100))
                height = float(region.get('height', 30))
                
                # Sample more points around the text region for better color estimation
                border_points = []
                padding = 2
                
                # Sample points above and below the text region
                for i in range(max(0, int(x - padding)), min(img.width, int(x + width + padding)), 2):
                    if y > padding:
                        border_points.append((i, max(0, int(y - padding))))
                    if y + height + padding < img.height:
                        border_points.append((i, min(img.height - 1, int(y + height + padding))))
                
                # Sample points to the left and right of the text region
                for j in range(max(0, int(y - padding)), min(img.height, int(y + height + padding)), 2):
                    if x > padding:
                        border_points.append((max(0, int(x - padding)), j))
                    if x + width + padding < img.width:
                        border_points.append((min(img.width - 1, int(x + width + padding)), j))
                
                # Sample colors
                colors = []
                for point in border_points:
                    if 0 <= point[0] < img.width and 0 <= point[1] < img.height:
                        colors.append(img.getpixel(point))
                
                # Get average color (simple average, could be improved)
                if colors:
                    if len(colors[0]) >= 3:  # Check if we have RGB or RGBA
                        avg_r = sum(c[0] for c in colors) // len(colors)
                        avg_g = sum(c[1] for c in colors) // len(colors)
                        avg_b = sum(c[2] for c in colors) // len(colors)
                        if len(colors[0]) == 4:  # RGBA
                            avg_a = sum(c[3] for c in colors) // len(colors)
                            background_colors.append((avg_r, avg_g, avg_b, avg_a))
                        else:  # RGB
                            background_colors.append((avg_r, avg_g, avg_b))
            
            # Use most common background color or white if none found
            if background_colors:
                # Count occurrences of each color
                color_counts = {}
                for color in background_colors:
                    color_counts[color] = color_counts.get(color, 0) + 1
                
                # Find most common color
                bg_color = max(color_counts.items(), key=lambda x: x[1])[0]
            else:
                bg_color = (255, 255, 255)  # Default to white
            
            # Fill text regions with background color with exact coordinates
            for region in text_regions:
                x = float(region.get('x', 0))
                y = float(region.get('y', 0))
                width = float(region.get('width', 100))
                height = float(region.get('height', 30))
                
                # Use precise coordinates with minimal padding
                padding = 2  # Minimal padding
                x_start = max(0, int(x - padding))
                y_start = max(0, int(y - padding))
                x_end = min(img.width, int(x + width + padding))
                y_end = min(img.height, int(y + height + padding))
                
                # Fill rectangle with background color - use exact coordinates
                draw.rectangle([x_start, y_start, x_end, y_end], fill=bg_color)
                
                # Log the masked region with precise coordinates
                logger.info(f"Masked text region: '{region.get('text', '')}' at ({x_start}, {y_start}, {x_end}, {y_end})")
            
            # Save the prepared image
            prepared_image_path = image_path.replace('.png', '_prepared.png')
            prepared_img.save(prepared_image_path)
            return prepared_image_path
            
    except Exception as e:
        logger.error(f"Error preparing image for vectorization: {str(e)}")
        return image_path  # Return original path if preparation fails

def remove_text_from_image(image_base64, text_regions):
    """Remove text from an image using GPT Image-1 edit endpoint"""
    try:
        logger.info("Removing text from image using GPT Image-1 edit")
        
        # Decode base64 and create a temporary image
        image_data = base64.b64decode(image_base64)
        temp_image_path = os.path.join(IMAGES_DIR, f"temp_{uuid.uuid4()}.png")
        with open(temp_image_path, 'wb') as f:
            f.write(image_data)
        
        # Open the original image to get its dimensions
        with Image.open(temp_image_path) as img:
            img_width, img_height = img.size
            
            # Create mask image with RGBA mode - transparent background
            # For OpenAI's edit endpoint, transparent areas (alpha=0) are NOT edited
            # Opaque areas (alpha=255) ARE edited
            mask = Image.new('RGBA', img.size, (0, 0, 0, 0))  # Fully transparent (areas NOT to edit)
            draw = ImageDraw.Draw(mask)
            
            # Make text regions opaque in the mask (areas TO edit)
            for region in text_regions:
                x = float(region.get('x', 0))
                y = float(region.get('y', 0))
                width = float(region.get('width', 100))
                height = float(region.get('height', 30))
                
                # Add minimal padding to ensure all text is covered
                padding = 2
                x_start = max(0, int(x - padding))
                y_start = max(0, int(y - padding))
                x_end = min(img_width, int(x + width + padding))
                y_end = min(img_height, int(y + height + padding))
                
                # Draw black rectangle with full opacity (alpha=255) for areas to be edited
                draw.rectangle([x_start, y_start, x_end, y_end], fill=(0, 0, 0, 255))
                
                logger.info(f"Masked text region in edit mask: '{region.get('text', '')}' at ({x_start}, {y_start}, {x_end}, {y_end})")
            
            # Save the mask image for debugging
            mask_path = os.path.join(IMAGES_DIR, f"mask_{uuid.uuid4()}.png")
            mask.save(mask_path)
            logger.info(f"Created mask image at: {mask_path}")
        
        # Important: Craft a prompt that specifically instructs to remove text and leave the space empty
        prompt = "Remove all text from this image. Do NOT fill in the text areas with background or any other content. Just make the text invisible while keeping the exact space where the text was completely empty and transparent. Do not add any new text or elements."
        
        # Open the image and mask files for the API
        with open(temp_image_path, "rb") as image_file, open(mask_path, "rb") as mask_file:
            try:
                logger.info("Calling OpenAI edit API with mask")
                response = openai.images.edit(
                    model=GPT_IMAGE_MODEL,
                    image=image_file,
                    mask=mask_file,
                    prompt=prompt,
                    n=1,
                    size="1024x1024"
                )
                
                # Get edited image URL or base64
                edited_image = response.data[0].b64_json if hasattr(response.data[0], 'b64_json') else response.data[0].url
                
                # If we got a URL instead of base64, download the image
                if not hasattr(response.data[0], 'b64_json') and edited_image.startswith('http'):
                    logger.info("Downloading image from URL")
                    img_response = requests.get(edited_image)
                    if img_response.status_code == 200:
                        edited_image = base64.b64encode(img_response.content).decode('utf-8')
                    else:
                        logger.error(f"Failed to download image: {img_response.status_code}")
                        return image_base64  # Return original if download fails
                
                logger.info("Successfully removed text from image using edit API")
                
                # Save the edited image for debugging
                edited_image_path = os.path.join(IMAGES_DIR, f"text_removed_debug_{uuid.uuid4()}.png")
                with open(edited_image_path, 'wb') as f:
                    f.write(base64.b64decode(edited_image))
                logger.info(f"Saved text-removed debug image to {edited_image_path}")
                
            except Exception as e:
                logger.error(f"Error in OpenAI edit API call: {str(e)}")
                logger.info("Falling back to original image")
                edited_image = image_base64
        
        # Clean up temporary files
        try:
            os.remove(temp_image_path)
            os.remove(mask_path)
        except Exception as e:
            logger.error(f"Error removing temporary files: {str(e)}")
        
        return edited_image
        
    except Exception as e:
        logger.error(f"Error removing text from image: {str(e)}")
        # Return original image if text removal fails
        return image_base64

def generate_svg_from_image(image_base64, enhanced_prompt):
    """
    Convert image to SVG using a comprehensive workflow:
    
    1. Generate image using GPT Image-1 (done in an earlier step)
    2. Extract text from the image using GPT Vision API
    3. Remove text from the image using GPT Image-1's edit functionality
       (while keeping the text spaces empty)
    4. Vectorize the text-free image using vtracer/Bitracer
    5. Generate SVG text elements with the exact position, size, and styling 
       from the extracted text
    6. Combine the vectorized image and text SVG elements
    
    This workflow ensures that text is properly extracted and preserved while
    the rest of the image is vectorized for crisp, scalable graphics.
    """
    logger.info("Converting image to SVG...")
    
    try:
        # Decode base64 and save temporary image
        image_data = base64.b64decode(image_base64)
        temp_image_path = os.path.join(IMAGES_DIR, f"temp_{uuid.uuid4()}.png")
        with open(temp_image_path, 'wb') as f:
            f.write(image_data)
        
        # Step 1: Analyze image for text regions
        logger.info("Step 1: Analyzing image to extract text regions...")
        text_regions = analyze_image_for_text(temp_image_path)
        logger.info(f"Found {len(text_regions)} text regions")
        
        # Debug: Save a copy of the image with text regions highlighted
        if text_regions:
            try:
                with Image.open(temp_image_path) as img:
                    debug_img = img.copy()
                    draw = ImageDraw.Draw(debug_img)
                    for region in text_regions:
                        x = float(region.get('x', 0))
                        y = float(region.get('y', 0))
                        width = float(region.get('width', 100))
                        height = float(region.get('height', 30))
                        # Draw rectangle around text region
                        draw.rectangle([x, y, x + width, y + height], outline=(255, 0, 0), width=2)
                    debug_image_path = os.path.join(IMAGES_DIR, f"debug_text_regions_{uuid.uuid4()}.png")
                    debug_img.save(debug_image_path)
                    logger.info(f"Saved debug image with text regions highlighted: {debug_image_path}")
            except Exception as e:
                logger.error(f"Error creating debug image: {str(e)}")
        
        # Get image dimensions for SVG viewport
        try:
            with Image.open(temp_image_path) as img:
                img_width, img_height = img.size
        except Exception as e:
            logger.error(f"Error getting image dimensions: {str(e)}")
            img_width, img_height = 1024, 1024  # Default size
        
        try:
            # Step 2: If text regions found, use GPT Image-1 to remove text
            if text_regions:
                logger.info("Step 2: Removing text from image using GPT Image-1 edit functionality...")
                text_removed_image_base64 = remove_text_from_image(image_base64, text_regions)
                
                # Save the text-removed image temporarily
                text_removed_image_data = base64.b64decode(text_removed_image_base64)
                text_removed_image_path = os.path.join(IMAGES_DIR, f"text_removed_{uuid.uuid4()}.png")
                with open(text_removed_image_path, 'wb') as f:
                    f.write(text_removed_image_data)
                logger.info(f"Saved text-removed image: {text_removed_image_path}")
                
                # Input image for vectorization is the text-removed image
                input_image_path = text_removed_image_path
            else:
                # No text found, use original image
                logger.info("No text regions found, using original image for vectorization")
                input_image_path = temp_image_path
            
            # Step 3: Create output path for SVG
            temp_svg_path = os.path.join(IMAGES_DIR, f"temp_{uuid.uuid4()}.svg")
            
            # Step 4: Convert image to SVG using vtracer (Bitracer)
            logger.info("Step 3: Vectorizing text-free image using vtracer (Bitracer)...")
            try:
                vtracer.convert_image_to_svg_py(
                    input_image_path,
                    temp_svg_path,
                    colormode='color',
                    hierarchical='stacked',
                    mode='spline',
                    corner_threshold=60,
                    length_threshold=4.0,
                    max_iterations=10,
                    splice_threshold=45,
                    filter_speckle=4,
                    path_precision=8
                )
                logger.info(f"Successfully vectorized image to SVG: {temp_svg_path}")
            except Exception as e:
                logger.error(f"Error in vtracer vectorization: {str(e)}")
                raise
            
            # Read the generated SVG for elements
            with open(temp_svg_path, 'r') as f:
                vectorized_svg = f.read()
            
            # Step 5: Generate SVG text elements using the analyzed text regions
            if text_regions:
                logger.info("Step 4: Generating SVG text elements preserving font size, position, and color...")
                text_elements = generate_svg_text_elements_from_regions(text_regions)
                
                if text_elements:
                    # Step 6: Combine vectorized image with text elements
                    logger.info("Step 5: Combining vectorized image and text SVG elements...")
                    final_svg = combine_svg_elements(vectorized_svg, text_elements)
                    logger.info("Successfully combined vectorized SVG with text elements")
                else:
                    logger.warning("No text elements were generated, using vectorized SVG without text")
                    final_svg = vectorized_svg
            else:
                logger.info("No text elements to add, using vectorized SVG as final result")
                final_svg = vectorized_svg
            
            # Clean up temporary files
            logger.info("Cleaning up temporary files...")
            os.remove(temp_image_path)
            if 'text_removed_image_path' in locals() and os.path.exists(text_removed_image_path):
                os.remove(text_removed_image_path)
            os.remove(temp_svg_path)
            
            return final_svg
            
        except Exception as e:
            logger.error(f"Error in SVG generation: {str(e)}")
            # Clean up temporary files in case of error
            for path in [temp_image_path]:
                if path and os.path.exists(path):
                    os.remove(path)
            if 'text_removed_image_path' in locals() and os.path.exists(text_removed_image_path):
                os.remove(text_removed_image_path)
            if 'temp_svg_path' in locals() and os.path.exists(temp_svg_path):
                os.remove(temp_svg_path)
            raise
            
    except Exception as e:
        logger.error(f"Error in SVG generation process: {str(e)}")
        raise

def generate_svg_text_elements_from_regions(text_regions):
    """
    Generate SVG text elements from the analyzed text regions with precise positioning.
    """
    svg_elements = []
    
    # Default font families for different types of text
    default_fonts = {
        'title': "'Montserrat', sans-serif",
        'subtitle': "'Montserrat', sans-serif",
        'heading': "'Montserrat', sans-serif",
        'body': "'Open Sans', sans-serif",
        'name': "'Montserrat', sans-serif",
        'job_title': "'Open Sans', sans-serif",
        'quote': "'Georgia', serif",
        'button': "'Open Sans', sans-serif",
        'label': "'Open Sans', sans-serif"
    }
    
    for i, region in enumerate(text_regions):
        try:
            text = region.get('text', '')
            if not text:
                continue
                
            # Get exact positioning attributes from the region
            x = region.get('x', 0)
            y = region.get('y', 0)
            
            # Determine text type based on position, size, or content
            text_type = region.get('text_type', '')
            if not text_type:
                # Try to determine text type if not provided
                if i == 0 and len(text) < 50:  # First short text might be a title or name
                    text_type = 'title' if text.isupper() else 'name'
                elif i == 1 and len(text) < 50:  # Second short text might be a subtitle or job title
                    text_type = 'subtitle' if len(text) > 20 else 'job_title'
                elif '"' in text or '"' in text or '"' in text:  # Text with quotes is likely a testimonial
                    text_type = 'quote'
                else:
                    text_type = 'body'  # Default to body text
            
            # Get styling from the region or use defaults based on text type
            font_size = region.get('font_size', 16)
            font_weight = region.get('font_weight', 'normal')
            font_style = region.get('font_style', 'normal')
            font_family = region.get('font_family', default_fonts.get(text_type, default_fonts['body']))
            color = region.get('color', '#000000')
            
            # Calculate precise y position based on font metrics
            # For most fonts, the baseline is roughly 0.8 * font_size from the top
            baseline_offset = font_size * 0.8
            y_adjusted = y + baseline_offset
            
            # Determine text anchor based on alignment
            alignment = region.get('alignment', 'left')
            text_anchor = get_text_anchor(alignment)
            
            # For center or right alignment, adjust x position
            if text_anchor == "middle":  # center alignment
                x_adjusted = x + (float(region.get('width', 0)) / 2)
            elif text_anchor == "end":  # right alignment
                x_adjusted = x + float(region.get('width', 0))
            else:  # left alignment
                x_adjusted = x
            
            # Create the SVG text element with precise positioning
            text_element = f"""<text
                x="{x_adjusted}"
                y="{y_adjusted}"
                font-family="{font_family}"
                font-size="{font_size}px"
                font-weight="{font_weight}"
                font-style="{font_style}"
                fill="{color}"
                text-anchor="{text_anchor}"
                dominant-baseline="auto"
                data-original-x="{x}"
                data-original-y="{y}"
                data-original-width="{region.get('width', 0)}"
                data-original-height="{region.get('height', 0)}"
                data-text-type="{text_type}">
                {text}
            </text>"""
            
            svg_elements.append(text_element)
            logger.info(f"Created SVG text element for '{text[:20]}{'...' if len(text) > 20 else ''}' at position ({x_adjusted}, {y_adjusted})")
            
        except Exception as e:
            logger.error(f"Error generating SVG text element: {str(e)}")
            continue
    
    return '\n'.join(svg_elements)

def get_text_anchor(alignment):
    """Convert alignment to SVG text-anchor value"""
    return {
        'left': 'start',
        'center': 'middle',
        'right': 'end'
    }.get(alignment.lower(), 'start')

def clean_svg_code_original(svg_code):
    """Original clean and validate SVG code function"""
    try:
        from xml.dom.minidom import parseString
        from xml.parsers.expat import ExpatError
        
        # Parse and clean the SVG
        try:
            doc = parseString(svg_code)
            
            # Get the SVG element
            svg_element = doc.documentElement
            
            # Ensure viewBox exists (minimal changes from original)
            if not svg_element.hasAttribute('viewBox'):
                svg_element.setAttribute('viewBox', '0 0 1080 1080')
            
            # Convert back to string with pretty printing
            cleaned_svg = doc.toxml()
            logger.info("SVG cleaned successfully")
            return cleaned_svg
            
        except ExpatError:
            logger.error("Failed to parse SVG, returning original")
            return svg_code
            
    except Exception as error:
        logger.error(f"Error cleaning SVG: {str(error)}")
        return svg_code

def save_image(image_data, prefix="img", format="PNG"):
    """Save image data to file and return the filename"""
    try:
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"{prefix}_{timestamp}_{unique_id}.{format.lower()}"
        filepath = os.path.join(IMAGES_DIR, filename)

        # Handle base64 string
        if isinstance(image_data, str):
            try:
                # Try to decode base64
                image_bytes = base64.b64decode(image_data)
            except Exception as e:
                logger.error(f"Error decoding base64: {str(e)}")
                raise
        else:
            # Assume it's already bytes
            image_bytes = image_data

        # Convert bytes to image and save
        try:
            image = Image.open(BytesIO(image_bytes))
            image.save(filepath, format=format)
            logger.info(f"Image saved successfully: {filename}")
            return filename
        except Exception as e:
            logger.error(f"Error saving image file: {str(e)}")
            raise

    except Exception as e:
        logger.error(f"Error in save_image: {str(e)}")
        raise

def save_svg(svg_code, prefix="svg"):
    """Save SVG code to file and return the filename"""
    try:
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"{prefix}_{timestamp}_{unique_id}.svg"
        filepath = os.path.join(IMAGES_DIR, filename)

        # Save SVG code to file
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(svg_code)
        
        logger.info(f"SVG saved successfully: {filename}")
        return filename
    except Exception as e:
        logger.error(f"Error saving SVG: {str(e)}")
        raise

def convert_svg_to_png(svg_code):
    """Convert SVG code to PNG and save both files"""
    try:
        # Save SVG file
        svg_filename = save_svg(svg_code)
        
        # Convert to PNG using cairosvg
        png_data = cairosvg.svg2png(bytestring=svg_code.encode('utf-8'))
        
        # Save PNG file
        png_filename = save_image(
            base64.b64encode(png_data).decode('utf-8'),
            prefix="converted_svg",
            format="PNG"
        )
        
        return svg_filename, png_filename
    except Exception as e:
        logger.error(f"Error in SVG to PNG conversion: {str(e)}")
        raise

@app.route('/static/images/<path:filename>')
def serve_image(filename):
    """Serve images from the images directory"""
    return send_from_directory(IMAGES_DIR, filename)

@app.route('/api/generate-svg', methods=['POST'])
def generate_svg():
    """Universal SVG generator endpoint for any design request"""
    try:
        data = request.json
        user_input = data.get('prompt', '')
        skip_enhancement = data.get('skip_enhancement', False)

        if not user_input:
            return jsonify({"error": "No prompt provided"}), 400

        logger.info("="*80)
        logger.info(f"Starting new design request: {user_input}")
        logger.info("="*80)

        # Stage 1: Check if prompt is suitable for SVG vector graphics
        logger.info("\n[STAGE 1: Vector Suitability Check]")
        logger.info("-"*50)
        logger.info("Checking if design is suitable for SVG format...")
        vector_suitability = check_vector_suitability(user_input)
        logger.info("Vector suitability check complete")
        logger.info(f"Result: {'Suitable' if not vector_suitability.get('not_suitable', False) else 'Not Suitable'}")
        
        if vector_suitability.get('not_suitable', False):
            logger.warning("Design request not suitable for SVG format")
            return jsonify({
                "error": "Not suitable for SVG",
                "guidance": vector_suitability.get('guidance', "Your request may not be ideal for SVG vector graphics. Please consider a simpler, more graphic design oriented request."),
                "progress_stage": "vector_suitability",
                "progress": 10
            }), 400
        
        # Stage 2: Planning Phase - Create structured design plan
        logger.info("\n[STAGE 2: Planning Phase]")
        logger.info("-"*50)
        logger.info("Creating structured design plan...")
        logger.info(f"Using model: {PLANNER_MODEL}")
        design_plan = plan_design(user_input)
        logger.info("\nDesign Plan Generated:")
        for line in design_plan.split('\n')[:10]:  # Log first 10 lines of plan
            logger.info(f"  {line}")
        logger.info("  ...")
        
        # Stage 3: Design Knowledge Generation - Gather design best practices
        logger.info("\n[STAGE 3: Design Knowledge Generation]")
        logger.info("-"*50)
        logger.info("Gathering design knowledge and best practices...")
        logger.info(f"Using model: {DESIGN_KNOWLEDGE_MODEL}")
        design_knowledge = generate_design_knowledge(design_plan, user_input)
        logger.info("\nDesign Knowledge Generated:")
        for line in design_knowledge.split('\n')[:10]:  # Log first 10 lines of knowledge
            logger.info(f"  {line}")
        logger.info("  ...")
        
        # Combine design plan and knowledge for enhanced prompts
        logger.info("\nCombining design plan and knowledge...")
        design_context = f"""Design Plan:
{design_plan}

Design Knowledge and Best Practices:
{design_knowledge}

Original Request:
{user_input}"""
        logger.info("Design context preparation complete")
        
        if skip_enhancement:
            logger.info("\n[STAGES 4-5: Enhancement Phases SKIPPED]")
            logger.info("-"*50)
            logger.info("Using original prompt without enhancement")
            prompt_to_use = user_input
            pre_enhanced_prompt = user_input
            enhanced_prompt = user_input
        else:
            # Stage 4: Pre-enhance the prompt with AI planning and design knowledge
            logger.info("\n[STAGE 4: Pre-enhancement Phase]")
            logger.info("-"*50)
            logger.info("Pre-enhancing prompt with design context...")
            logger.info(f"Using model: {PRE_ENHANCER_MODEL}")
            pre_enhanced_prompt = pre_enhance_prompt(design_context)
            logger.info("\nPre-enhanced Prompt Generated:")
            for line in pre_enhanced_prompt.split('\n')[:10]:
                logger.info(f"  {line}")
            logger.info("  ...")

            # Stage 5: Further enhance the prompt with technical specifications
            logger.info("\n[STAGE 5: Prompt Enhancement Phase]")
            logger.info("-"*50)
            logger.info("Enhancing prompt with technical specifications...")
            logger.info(f"Using model: {PROMPT_ENHANCER_MODEL}")
            enhanced_prompt = enhance_prompt_with_chat(pre_enhanced_prompt)
            logger.info("\nFinal Enhanced Prompt:")
            for line in enhanced_prompt.split('\n')[:10]:
                logger.info(f"  {line}")
            logger.info("  ...")
            
            prompt_to_use = enhanced_prompt

        # Stage 6: Generate image using GPT Image-1
        logger.info("\n[STAGE 6: Image Generation Phase]")
        logger.info("-"*50)
        logger.info("Generating initial image with GPT Image-1...")
        gpt_image_base64, gpt_image_filename = generate_image_with_gpt(prompt_to_use)
        logger.info("Image successfully generated with GPT Image-1")

        # Stage 7: Process image to create SVG
        logger.info("\n[STAGE 7: SVG Generation Phase]")
        logger.info("-"*50)
        logger.info("Processing image for SVG generation with text extraction and vectorization...")
        svg_code = generate_svg_from_image(gpt_image_base64, prompt_to_use)
        logger.info("SVG code successfully generated")
        
        # Save the SVG
        svg_filename = save_svg(svg_code, prefix="svg")
        logger.info(f"SVG saved to {svg_filename}")

        return jsonify({
            "original_prompt": user_input,
            "pre_enhanced_prompt": pre_enhanced_prompt,
            "enhanced_prompt": enhanced_prompt,
            "gpt_image_base64": gpt_image_base64,
            "gpt_image_url": f"/static/images/{gpt_image_filename}",
            "svg_code": svg_code,
            "svg_path": svg_filename,
            "stages": {
                "vector_suitability": {
                    "completed": True,
                    "suitable": True
                },
                "design_plan": {
                    "completed": True,
                    "content": design_plan if 'design_plan' in locals() else ""
                },
                "design_knowledge": {
                    "completed": True, 
                    "content": design_knowledge if 'design_knowledge' in locals() else ""
                },
                "pre_enhancement": {
                    "completed": True,
                    "skipped": skip_enhancement,
                    "content": pre_enhanced_prompt
                },
                "prompt_enhancement": {
                    "completed": True,
                    "skipped": skip_enhancement,
                    "content": enhanced_prompt
                },
                "image_generation": {
                    "completed": True, 
                    "image_url": f"/static/images/{gpt_image_filename}"
                },
                "svg_generation": {
                    "completed": True, 
                    "svg_path": svg_filename,
                    "process": "text extraction, text removal, vectorization, and text SVG generation"
                }
            },
            "progress": 100
        })

    except Exception as e:
        logger.error(f"Error in generate_svg: {str(e)}")
        return jsonify({"error": str(e)}), 500

def chat_with_ai_about_design(messages, current_svg=None):
    """Enhanced conversational AI that can discuss and modify designs"""
    logger.info("Starting conversational AI interaction")
    
    url = OPENAI_CHAT_ENDPOINT
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY_ENHANCER}"
    }

    # Create system prompt that includes SVG knowledge
    system_prompt = """You are an expert AI design assistant with deep knowledge of SVG creation and manipulation. You can:

1. Create new designs from scratch
2. Explain existing SVG designs in detail
3. Modify existing designs based on user feedback
4. Provide design suggestions and improvements
5. Discuss design principles, colors, typography, and layout

When discussing SVGs, you understand:
- SVG elements like <rect>, <circle>, <path>, <text>, <g>
- Attributes like fill, stroke, viewBox, transform
- Design principles like color theory, typography, layout
- How to make designs accessible and responsive

Guidelines:
- Be conversational and helpful
- Explain technical concepts in simple terms
- Ask clarifying questions when needed
- Provide specific suggestions for improvements
- When modifying designs, explain what changes you're making and why

Current context: You are helping a user with their design project."""

    if current_svg:
        system_prompt += f"\n\nCurrent SVG design context:\n```svg\n{current_svg}\n```\n\nYou can reference and modify this design based on user requests."

    # Prepare messages for the AI
    ai_messages = [{"role": "system", "content": system_prompt}]
    
    # Add conversation history (limit to last 10 messages to manage context)
    conversation_messages = messages[-10:] if len(messages) > 10 else messages
    
    for msg in conversation_messages:
        if msg["role"] in ["user", "assistant"]:
            # Clean SVG code blocks from previous messages to avoid clutter
            content = msg["content"]
            if "```svg" in content and msg["role"] == "assistant":
                # Keep only the explanation part, not the SVG code
                parts = content.split("```svg")
                if len(parts) > 1:
                    explanation = parts[0].strip()
                    if explanation:
                        content = explanation
                    else:
                        content = "I provided a design based on your request."
            
            ai_messages.append({
                "role": msg["role"],
                "content": content
            })

    try:
        # Use OpenAI client directly instead of raw API calls
        client = openai.OpenAI(api_key=OPENAI_API_KEY_ENHANCER)
        response = client.chat.completions.create(
            model=CHAT_ASSISTANT_MODEL,
            messages=ai_messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        # Extract the response content safely
        if response and response.choices and len(response.choices) > 0:
            ai_response = response.choices[0].message.content
            logger.info(f"AI response generated: {ai_response[:100]}...")
            return ai_response
        else:
            logger.error("Empty or invalid response from OpenAI")
            return "I apologize, but I'm having trouble generating a response. Could you please rephrase your request?"
            
    except Exception as e:
        logger.error(f"Error in chat_with_ai_about_design: {str(e)}")
        return "I apologize, but I encountered an error while processing your request. Please try again."

def modify_svg_with_ai(original_svg, modification_request):
    """Use AI to modify an existing SVG based on user request"""
    logger.info(f"Modifying SVG with request: {modification_request}")
    
    url = OPENAI_CHAT_ENDPOINT
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY_SVG}"
    }

    system_prompt = """You are an expert SVG modifier. Given an original SVG and a modification request, create a new SVG that incorporates the requested changes.

Rules:
1. Maintain the overall structure and quality of the original design
2. Make only the requested modifications
3. Ensure the SVG is valid and well-formed
4. Keep the viewBox and dimensions appropriate
5. Maintain good design principles
6. Return ONLY the modified SVG code, no explanations

The SVG should be production-ready and properly formatted."""

    payload = {
        "model": SVG_GENERATOR_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": f"Original SVG:\n```svg\n{original_svg}\n```\n\nModification request: {modification_request}\n\nPlease provide the modified SVG:"
            }
        ],
        "temperature": 0.3,
        "max_tokens": 2000
    }

    logger.info("Calling AI for SVG modification")
    response = requests.post(url, headers=headers, json=payload)
    response_data = response.json()

    if response.status_code != 200:
        logger.error(f"SVG modification error: {response_data}")
        return None

    modified_content = response_data["choices"][0]["message"]["content"]
    
    # Extract SVG code
    svg_pattern = r'<svg.*?<\/svg>'
    svg_matches = re.search(svg_pattern, modified_content, re.DOTALL)
    
    if svg_matches:
        logger.info("Successfully modified SVG")
        return svg_matches.group(0)
    
    logger.warning("Could not extract modified SVG, returning original")
    return original_svg

@app.route('/api/chat-assistant', methods=['POST'])
def chat_assistant():
    try:
        data = request.json
        messages = data.get('messages', [])
        
        logger.info("="*80)
        logger.info("CHAT ASSISTANT REQUEST")
        logger.info("="*80)
        logger.info(f"Chat history length: {len(messages)}")
        logger.info(f"Last message: {messages[-1] if messages else 'No messages'}")
        
        if not messages:
            logger.warning("No messages provided in request")
            return jsonify({"error": "No messages provided"}), 400

        # Get the latest user message
        latest_message = messages[-1]["content"].lower() if messages else ""
        
        # Analyze request type
        logger.info("\n[Request Analysis]")
        logger.info("-"*50)
        
        # Check request type
        is_create_request = any(keyword in latest_message for keyword in [
            "create", "design", "generate", "make", "draw", "poster", "build"
        ]) and not any(word in latest_message for word in ["edit", "update", "modify", "change"])

        is_modify_request = any(word in latest_message for word in ["edit", "update", "modify", "change", "adjust"]) and any(keyword in latest_message for keyword in ["design", "poster", "color", "text", "font", "size"])

        logger.info(f"Request type: {'Creation' if is_create_request else 'Modification' if is_modify_request else 'Conversation'}")
        logger.info(f"User message: {latest_message}")

        # Find existing SVG if any
        current_svg = None
        for msg in reversed(messages):
            if msg.get("role") == "assistant" and "```svg" in msg.get("content", ""):
                svg_start = msg["content"].find("```svg") + 6
                svg_end = msg["content"].find("```", svg_start)
                if svg_end > svg_start:
                    current_svg = msg["content"][svg_start:svg_end].strip()
                    logger.info("Found existing SVG in conversation")
                    break

        if is_create_request:
            logger.info("\n[Starting New Design Creation]")
            logger.info("-"*50)
            
            try:
                # Stage 1: Planning Phase
                logger.info("\n[STAGE 1: Planning Phase]")
                logger.info("-"*50)
                logger.info("Creating structured design plan...")
                logger.info(f"Using model: {PLANNER_MODEL}")
                design_plan = plan_design(latest_message)
                logger.info("\nDesign Plan Generated:")
                for line in design_plan.split('\n')[:10]:
                    logger.info(f"  {line}")
                logger.info("  ...")

                # Stage 2: Design Knowledge Generation
                logger.info("\n[STAGE 2: Design Knowledge Generation]")
                logger.info("-"*50)
                logger.info("Gathering design knowledge and best practices...")
                logger.info(f"Using model: {DESIGN_KNOWLEDGE_MODEL}")
                design_knowledge = generate_design_knowledge(design_plan, latest_message)
                logger.info("\nDesign Knowledge Generated:")
                for line in design_knowledge.split('\n')[:10]:
                    logger.info(f"  {line}")
                logger.info("  ...")

                # Stage 3: Pre-enhancement
                logger.info("\n[STAGE 3: Pre-enhancement Phase]")
                logger.info("-"*50)
                logger.info("Pre-enhancing prompt with design context...")
                logger.info(f"Using model: {PRE_ENHANCER_MODEL}")
                design_context = f"""Design Plan:\n{design_plan}\n\nDesign Knowledge:\n{design_knowledge}\n\nOriginal Request:\n{latest_message}"""
                pre_enhanced = pre_enhance_prompt(design_context)
                logger.info("\nPre-enhanced Prompt:")
                for line in pre_enhanced.split('\n')[:10]:
                    logger.info(f"  {line}")
                logger.info("  ...")

                # Stage 4: Final Enhancement
                logger.info("\n[STAGE 4: Final Enhancement Phase]")
                logger.info("-"*50)
                logger.info("Enhancing prompt with technical specifications...")
                logger.info(f"Using model: {PROMPT_ENHANCER_MODEL}")
                enhanced_prompt = enhance_prompt_with_chat(pre_enhanced)
                logger.info("\nEnhanced Prompt Generated:")
                for line in enhanced_prompt.split('\n')[:10]:
                    logger.info(f"  {line}")
                logger.info("  ...")
                
                # Stage 5: Image Generation
                logger.info("\n[STAGE 5: Image Generation]")
                logger.info("-"*50)
                logger.info("Generating initial design image...")
                logger.info(f"Using model: {GPT_IMAGE_MODEL}")
                image_base64, image_filename = generate_image_with_gpt(enhanced_prompt)
                logger.info(f"Image generated and saved as: {image_filename}")
                
                # Stage 6: SVG Generation
                logger.info("\n[STAGE 6: SVG Generation]")
                logger.info("-"*50)
                logger.info("Converting design to SVG format...")
                logger.info(f"Using model: {SVG_GENERATOR_MODEL}")
                svg_code = generate_svg_from_image(image_base64, enhanced_prompt)
                svg_filename = save_svg(svg_code, prefix="assistant_svg")
                logger.info(f"SVG generated and saved as: {svg_filename}")
                
                # Stage 7: Design Explanation
                logger.info("\n[STAGE 7: Design Explanation]")
                logger.info("-"*50)
                logger.info("Generating design explanation...")
                logger.info(f"Using model: {CHAT_ASSISTANT_MODEL}")
                
                explanation_prompt = f"I've created a design for the user. Here's the SVG code:\n\n```svg\n{svg_code}\n```\n\nPlease explain this design to the user in a friendly, conversational way. Describe the elements, colors, layout, and how it addresses their request."
                
                temp_messages = messages + [{"role": "user", "content": explanation_prompt}]
                ai_explanation = chat_with_ai_about_design(temp_messages, svg_code)
                
                logger.info("\nExplanation Generated:")
                for line in ai_explanation.split('\n')[:5]:
                    logger.info(f"  {line}")
                logger.info("  ...")
                
                # Create comprehensive response
                full_response = f"{ai_explanation}\n\n```svg\n{svg_code}\n```\n\nFeel free to ask me to modify any aspect of this design!"
                
                messages.append({"role": "assistant", "content": full_response})
                
                response_data = {
                    "response": full_response,
                    "svg_code": svg_code,
                    "svg_path": svg_filename,
                    "messages": messages
                }
                
                logger.info("\n[Design Creation Complete]")
                logger.info("="*80)
                logger.info("Summary:")
                logger.info(f"- Design plan created")
                logger.info(f"- Design knowledge gathered")
                logger.info(f"- Prompt enhanced and refined")
                logger.info(f"- Image generated: {image_filename}")
                logger.info(f"- SVG created: {svg_filename}")
                logger.info(f"- Explanation provided")
                logger.info("="*80)
                
                return jsonify(response_data)
                
            except Exception as e:
                logger.error(f"Error in design creation: {str(e)}")
                error_response = "I encountered an error while creating the design. Let me try a different approach or you can rephrase your request."
                messages.append({"role": "assistant", "content": error_response})
                return jsonify({"messages": messages})

        elif is_modify_request and current_svg:
            logger.info("Processing design modification request")
            
            try:
                # Modify the existing SVG
                modified_svg = modify_svg_with_ai(current_svg, latest_message)
                
                if modified_svg and modified_svg != current_svg:
                    # Save the modified SVG
                    svg_filename = save_svg(modified_svg, prefix="modified_svg")
                    
                    # Get AI explanation of the changes
                    change_explanation_prompt = f"I've modified the design based on the user's request: '{latest_message}'. Here's the updated SVG:\n\n```svg\n{modified_svg}\n```\n\nPlease explain what changes were made and how the design now better meets their needs."
                    
                    temp_messages = messages + [{"role": "user", "content": change_explanation_prompt}]
                    ai_explanation = chat_with_ai_about_design(temp_messages, modified_svg)
                    
                    full_response = f"{ai_explanation}\n\n```svg\n{modified_svg}\n```\n\nIs there anything else you'd like me to adjust?"
                    
                    messages.append({"role": "assistant", "content": full_response})
                    
                    response_data = {
                        "response": full_response,
                        "svg_code": modified_svg,
                        "svg_path": svg_filename,
                        "messages": messages
                    }
                    logger.info("Successfully modified design with explanation")
                    return jsonify(response_data)
                else:
                    # Fallback to conversational response
                    ai_response = chat_with_ai_about_design(messages, current_svg)
                    messages.append({"role": "assistant", "content": ai_response})
                    return jsonify({"messages": messages})
                    
            except Exception as e:
                logger.error(f"Error in design modification: {str(e)}")
                ai_response = "I had trouble modifying the design. Could you be more specific about what changes you'd like me to make?"
                messages.append({"role": "assistant", "content": ai_response})
                return jsonify({"messages": messages})

        else:
            # Handle general conversation
            logger.info("Processing general conversation")
            ai_response = chat_with_ai_about_design(messages, current_svg)
            messages.append({"role": "assistant", "content": ai_response})
            
            return jsonify({
                "messages": messages,
                "svg_code": current_svg,
                "svg_path": None,
                "response": ai_response
            })
            
    except Exception as e:
        error_msg = f"Error in chat_assistant: {str(e)}"
        logger.error(error_msg)
        logger.exception("Full traceback:")
        return jsonify({"error": error_msg}), 500

if __name__ == '__main__':
    # Get port from environment variable (Render sets PORT=8000)
    port = int(os.getenv('PORT', 5001))
    
    # Use 0.0.0.0 for production (Render) and 127.0.0.1 for local development
    host = '0.0.0.0' if os.getenv('PORT') else '127.0.0.1'
    
    # Disable debug mode in production
    debug = not bool(os.getenv('PORT'))
    
    logger.info(f"Starting Flask application on {host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)