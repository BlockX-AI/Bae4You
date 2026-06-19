"""
modal_pulid.py — PuLID-FLUX identity-preserving avatar generation on Modal.

Deploy:
  pip install modal
  modal deploy apps/api/modal/modal_pulid.py

This creates a web endpoint at https://[your-workspace]--bae4u-pulid-generate.modal.run

Set MODAL_PULID_URL in Railway env vars to that URL.
Set PULID_ENABLED=true to activate.

Free tier: $30/month credit = ~3000-4000 avatars at ~12-15s on A10G.
Cold start: ~5-10s on first request, then stays warm.
"""

import modal
import base64
import io
from typing import Optional

app = modal.App("bae4u-pulid")

# ── Container image: PuLID-FLUX + dependencies ───────────────────────────────

pulid_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.2.1",
        "torchvision==0.17.1",
        "diffusers==0.27.2",
        "transformers==4.39.3",
        "accelerate==0.28.0",
        "safetensors==0.4.2",
        "huggingface_hub==0.22.2",
        "Pillow==10.3.0",
        "fastapi[standard]==0.110.0",
        "pydantic==2.6.4",
        "insightface==0.7.3",
        "onnxruntime==1.17.3",
        "opencv-python-headless==4.9.0.80",
    )
    .run_commands(
        # Clone PuLID-FLUX from official repo
        "git clone https://github.com/ToTheBeginning/PuLID.git /app/pulid",
        "pip install -e /app/pulid",
    )
)

# ── Volume for model caching ──────────────────────────────────────────────────

model_volume = modal.Volume.from_name("bae4u-pulid-models", create_if_missing=True)
MODEL_DIR = "/models"


# ── Model loader (runs once on cold start) ────────────────────────────────────

def _load_model():
    import torch
    import sys
    sys.path.insert(0, "/app/pulid")

    from pulid.pipeline_flux import PuLIDPipeline  # type: ignore

    pipeline = PuLIDPipeline.from_pretrained(
        "black-forest-labs/FLUX.1-dev",
        torch_dtype=torch.bfloat16,
        cache_dir=MODEL_DIR,
    )
    pipeline = pipeline.to("cuda")
    return pipeline


# ── Modal web endpoint ────────────────────────────────────────────────────────

@app.function(
    image=pulid_image,
    gpu="A10G",
    timeout=120,
    volumes={MODEL_DIR: model_volume},
    # Keep 1 warm container to reduce cold starts
    keep_warm=1,
)
@modal.web_endpoint(method="POST", label="bae4u-pulid-generate")
def generate(item: dict) -> dict:
    """
    Request body:
        image_base64:    str   — source photo (base64 encoded)
        mime_type:       str   — "image/jpeg" | "image/png"
        prompt:          str   — generation prompt
        negative_prompt: str   — negative prompt
        id_weight:       float — identity strength (default 0.9)
        start_step:      int   — when PuLID kicks in (default 1)
        true_cfg:        float — prompt adherence (default 1.2)
        num_steps:       int   — inference steps (default 24)
        guidance_scale:  float — FLUX guidance (default 4.0)
        width:           int   — output width (default 1024)
        height:          int   — output height (default 1024)

    Response:
        image_base64: str   — generated image base64
        error:        str   — error message if failed
    """
    import torch
    from PIL import Image

    try:
        image_b64   = item.get("image_base64", "")
        mime_type   = item.get("mime_type", "image/jpeg")
        prompt      = item.get("prompt", "")
        neg_prompt  = item.get("negative_prompt", "")
        id_weight   = float(item.get("id_weight", 0.9))
        start_step  = int(item.get("start_step", 1))
        true_cfg    = float(item.get("true_cfg", 1.2))
        num_steps   = int(item.get("num_steps", 24))
        guidance    = float(item.get("guidance_scale", 4.0))
        width       = int(item.get("width", 1024))
        height      = int(item.get("height", 1024))

        # Decode source image
        img_bytes = base64.b64decode(image_b64)
        id_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        # Load pipeline (cached after first call)
        pipeline = _load_model()

        # Generate with PuLID identity injection
        with torch.inference_mode():
            result = pipeline(
                prompt=prompt,
                negative_prompt=neg_prompt,
                id_images=[id_image],
                id_weight=id_weight,
                start_step=start_step,
                true_cfg_scale=true_cfg,
                num_inference_steps=num_steps,
                guidance_scale=guidance,
                width=width,
                height=height,
                num_images_per_prompt=1,
            )

        output_image = result.images[0]

        # Encode output
        out_buf = io.BytesIO()
        output_image.save(out_buf, format="PNG")
        out_b64 = base64.b64encode(out_buf.getvalue()).decode("utf-8")

        return {"image_base64": out_b64}

    except Exception as e:
        return {"error": str(e)}
