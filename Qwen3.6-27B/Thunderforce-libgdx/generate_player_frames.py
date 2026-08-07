#!/usr/bin/env python3
"""Generate 8 player ship animation frames with distinct poses."""
import json
import subprocess
import time
import sys

POSES = [
    {"name": "idle", "seed": 42, "prompt": "16-bit pixel art, Mega Drive Genesis, sci-fi fighter spaceship idle hover, centered, metallic blue hull, red engine flames, dark grey wings, white cockpit, black background, pixel-perfect, hard edges, symmetrical"},
    {"name": "tilt_up", "seed": 100, "prompt": "16-bit pixel art, Mega Drive Genesis, sci-fi fighter spaceship nose tilting upward, climbing pose, metallic blue hull, red engine flames, dark grey wings, white cockpit, black background, pixel-perfect, hard edges"},
    {"name": "tilt_down", "seed": 200, "prompt": "16-bit pixel art, Mega Drive Genesis, sci-fi fighter spaceship nose tilting downward, diving pose, metallic blue hull, red engine flames, dark grey wings, white cockpit, black background, pixel-perfect, hard edges"},
    {"name": "bank_left", "seed": 300, "prompt": "16-bit pixel art, Mega Drive Genesis, sci-fi fighter spaceship banking left turn, angled pose, metallic blue hull, red engine flames, dark grey wings, white cockpit, black background, pixel-perfect, hard edges"},
    {"name": "bank_right", "seed": 400, "prompt": "16-bit pixel art, Mega Drive Genesis, sci-fi fighter spaceship banking right turn, angled pose, metallic blue hull, red engine flames, dark grey wings, white cockpit, black background, pixel-perfect, hard edges"},
    {"name": "thrust", "seed": 500, "prompt": "16-bit pixel art, Mega Drive Genesis, sci-fi fighter spaceship engine thrust boost, large flame exhaust, metallic blue hull, bright red orange flames, dark grey wings, white cockpit, black background, pixel-perfect, hard edges"},
    {"name": "bob_up", "seed": 600, "prompt": "16-bit pixel art, Mega Drive Genesis, sci-fi fighter spaceship hovering slightly upward, gentle bob motion, metallic blue hull, red engine flames, dark grey wings, white cockpit, black background, pixel-perfect, hard edges"},
    {"name": "bob_down", "seed": 700, "prompt": "16-bit pixel art, Mega Drive Genesis, sci-fi fighter spaceship hovering slightly downward, gentle bob motion, metallic blue hull, red engine flames, dark grey wings, white cockpit, black background, pixel-perfect, hard edges"},
]

NEGATIVE = "photorealistic, 3d render, smooth gradients, anti-aliasing, blurry, soft edges, modern game art, vector art, text, watermark, logo, photographic"

def make_workflow(prompt, seed, name):
    return {
        "1": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": "Genesis.safetensors"}
        },
        "2": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": prompt, "clip": ["1", 1]}
        },
        "3": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": NEGATIVE, "clip": ["1", 1]}
        },
        "4": {
            "class_type": "EmptyLatentImage",
            "inputs": {"width": 128, "height": 128, "batch_size": 1}
        },
        "5": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed, "steps": 28, "cfg": 9,
                "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1,
                "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0],
                "latent_image": ["4", 0]
            }
        },
        "6": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["5", 0], "vae": ["1", 2]}
        },
        "7": {
            "class_type": "ImageScale",
            "inputs": {"image": ["6", 0], "upscale_method": "nearest-exact", "width": 24, "height": 24, "crop": "disabled"}
        },
        "8": {
            "class_type": "ImageQuantize",
            "inputs": {"image": ["7", 0], "colors": 16, "dither": "bayer-8"}
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"filename_prefix": f"Thunderforce_player_{name}", "images": ["8", 0]}
        }
    }

def queue_workflow(workflow):
    payload = {"prompt": workflow}
    resp = subprocess.run(
        ["curl", "-s", "-X", "POST", "http://127.0.0.1:8188/prompt",
         "-H", "Content-Type: application/json", "-d", json.dumps(payload)],
        capture_output=True, text=True
    )
    return json.loads(resp.stdout)

def wait_for_completion(prompt_id, timeout=120):
    start = time.time()
    while time.time() - start < timeout:
        resp = subprocess.run(
            ["curl", "-s", f"http://127.0.0.1:8188/history/{prompt_id}"],
            capture_output=True, text=True
        )
        data = json.loads(resp.stdout)
        entry = data.get(prompt_id, {})
        if "outputs" in entry:
            return entry["outputs"]
        time.sleep(2)
    return None

if __name__ == "__main__":
    # Queue all 8 workflows
    print(f"Queueing {len(POSES)} frames...")
    prompt_ids = []
    for pose in POSES:
        wf = make_workflow(pose["prompt"], pose["seed"], pose["name"])
        result = queue_workflow(wf)
        pid = result.get("prompt_id", "unknown")
        prompt_ids.append((pid, pose["name"]))
        print(f"  Queued {pose['name']} → {pid}")

    # Wait for all to complete
    print("\nWaiting for completion...")
    outputs = {}
    for pid, name in prompt_ids:
        print(f"  Waiting for {name}...", end=" ", flush=True)
        out = wait_for_completion(pid)
        if out:
            for node_id, node_out in out.items():
                imgs = node_out.get("images", [])
                for img in imgs:
                    filename = img.get("filename", "?")
                    outputs[name] = filename
                    print(f"✓ {filename}")
        else:
            print("✗ TIMEOUT")

    print(f"\nDone: {len(outputs)}/{len(POSES)} frames generated")
    for name, filename in outputs.items():
        print(f"  {name}: {filename}")
