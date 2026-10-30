#!/usr/bin/env bash
# Export web assets from the approved title and lion-head PNG masters.
set -euo pipefail
cd "$(dirname "$0")/.."
convert icons/source/lion-title.png -resize 640x640 -strip -quality 92 icons/judaea-universalis-logo.webp
convert icons/source/lion-head.png -resize 192x192 -strip icons/lion-192.png
convert icons/source/lion-head.png -resize 512x512 -strip icons/lion-512.png
convert icons/source/lion-head.png -resize 154x154 -background '#1d1710' -gravity center -extent 180x180 -alpha remove -alpha off -strip icons/lion-apple-touch.png
convert icons/source/lion-head.png -resize 122x122 -background '#1d1710' -gravity center -extent 192x192 -alpha remove -alpha off -strip icons/lion-maskable-192.png
convert icons/source/lion-head.png -resize 328x328 -background '#1d1710' -gravity center -extent 512x512 -alpha remove -alpha off -strip icons/lion-maskable-512.png
convert icons/source/lion-head.png -resize 16x16 -strip icons/lion-16.png
convert icons/source/lion-head.png -resize 32x32 -strip icons/lion-32.png
convert icons/lion-16.png icons/lion-32.png icons/lion.ico
