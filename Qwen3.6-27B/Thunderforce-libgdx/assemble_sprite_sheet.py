#!/usr/bin/env python3
"""Assemble individual frames into a sprite sheet with padding."""
import os
import sys
from PIL import Image

OUTPUT_DIR = "/home/wantez/source/github/Confy-Org/ComfyUI/output"
PROJECT_DIR = "/home/wantez/source/github/iromu/llm-litmus/Qwen3.6-27B/Thunderforce-libgdx"

def assemble_sheet(frame_files, cell_size=32, padding=2, columns=4, output_prefix="sprite_sheet"):
    """Assemble frames into a grid sprite sheet with padding between cells."""
    if not frame_files:
        print("No frames to assemble")
        return None

    # Load all frames
    frames = []
    for fn in frame_files:
        path = os.path.join(OUTPUT_DIR, fn)
        if os.path.exists(path):
            img = Image.open(path).convert("RGBA")
            frames.append(img)
        else:
            print(f"Warning: {fn} not found, skipping")

    if not frames:
        return None

    # Calculate grid dimensions
    total = len(frames)
    rows = (total + columns - 1) // columns

    # Cell size includes the sprite + padding
    cell_w = cell_size
    cell_h = cell_size

    # Create output image
    sheet_w = columns * cell_w
    sheet_h = rows * cell_h
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    # Place each frame centered in its cell with padding
    for idx, frame in enumerate(frames):
        row = idx // columns
        col = idx % columns

        # Calculate cell position
        x = col * cell_w
        y = row * cell_h

        # Center the frame within the cell, leaving padding
        # Resize frame to fit within cell with padding
        max_w = cell_w - 2 * padding
        max_h = cell_h - 2 * padding

        # Scale frame to fit if needed
        if frame.width > max_w or frame.height > max_h:
            scale = min(max_w / frame.width, max_h / frame.height)
            new_w = max(1, int(frame.width * scale))
            new_h = max(1, int(frame.height * scale))
            # Use nearest-neighbor for pixel art
            frame = frame.resize((new_w, new_h), Image.NEAREST)

        # Center in cell
        fx = x + (cell_w - frame.width) // 2
        fy = y + (cell_h - frame.height) // 2

        sheet.paste(frame, (fx, fy), frame)

    # Save
    output_fn = f"{output_prefix}.png"
    output_path = os.path.join(OUTPUT_DIR, output_fn)
    sheet.save(output_path)
    print(f"Saved {output_path} ({sheet_w}x{sheet_h}, {len(frames)} frames, {columns}x{rows} grid)")
    return output_path

def main():
    if len(sys.argv) < 3:
        print("Usage: assemble_sprite_sheet.py <prefix> <frame1> <frame2> ...")
        print("  or: assemble_sprite_sheet.py player_idle idle.png tilt_up.png ...")
        return

    output_prefix = sys.argv[1]
    frame_files = sys.argv[2:]
    assemble_sheet(frame_files, output_prefix=output_prefix)

if __name__ == "__main__":
    main()
