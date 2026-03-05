#!/bin/bash
# generate-assets.sh - Generates placeholder assets for Expo build

echo "Generating placeholder assets..."

# Create a simple 1x1 pink pixel PNG using base64
# This is a valid 1x1 PNG in pink color
PINK_PNG="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=="

echo $PINK_PNG | base64 -d > /tmp/pixel.png

# Use ImageMagick if available, otherwise use the pixel PNG
if command -v convert &> /dev/null; then
  convert -size 1024x1024 xc:'#FF6B9D' -gravity center \
    -font DejaVu-Sans-Bold -pointsize 200 \
    -fill white -annotate 0 '👶' \
    assets/icon.png 2>/dev/null || cp /tmp/pixel.png assets/icon.png
  
  convert -size 1024x1024 xc:'#FFF0F5' assets/adaptive-icon.png 2>/dev/null || cp /tmp/pixel.png assets/adaptive-icon.png
  convert -size 1284x2778 xc:'#FFF0F5' assets/splash.png 2>/dev/null || cp /tmp/pixel.png assets/splash.png
else
  cp /tmp/pixel.png assets/icon.png
  cp /tmp/pixel.png assets/adaptive-icon.png
  cp /tmp/pixel.png assets/splash.png
fi

echo "Assets generated!"
