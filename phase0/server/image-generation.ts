import { ENV } from "./_core/env";

export interface ImageGenerationResult {
  url: string;
  success: boolean;
  error?: string;
}

const HUGGINGFACE_PROVIDERS = [
  "https://router.huggingface.co/together/v1/images/generations",
  "https://router.huggingface.co/hyperbolic/v1/images/generations",
  "https://router.huggingface.co/fal-ai/v1/images/generations",
  "https://router.huggingface.co/nebius/v1/images/generations",
];

const FIXED_STYLE_ANCHOR =
  "Dark fantasy digital painting, semi-realistic illustration style, dramatic chiaroscuro lighting, painterly brushwork with visible texture, atmospheric depth, cinematic single-subject composition, ArtStation quality, highly detailed";

const FIXED_EXCLUSION_SUFFIX =
  "no text, no letters, no words, no numbers, no UI elements, no borders, no frame, no watermark, no signature, isolated illustration only, no card layout";

export async function generateSpellCardImage(
  prompt: string,
  spellName: string
): Promise<ImageGenerationResult> {
  if (!ENV.imageGenApiKey) {
    return {
      url: "",
      success: false,
      error: "Image generation API key not configured",
    };
  }

  const sanitizedPrompt = `${FIXED_STYLE_ANCHOR}, ${prompt}, ${FIXED_EXCLUSION_SUFFIX}`;

  let lastError = "";

  for (const providerUrl of HUGGINGFACE_PROVIDERS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      const response = await fetch(providerUrl, {
        headers: {
          Authorization: `Bearer ${ENV.imageGenApiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          model: "black-forest-labs/FLUX.1-schnell",
          prompt: sanitizedPrompt,
          width: 512,
          height: 512,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        lastError = (errorData as any).error || response.statusText;
        console.warn(`[Image Generation] Provider ${providerUrl} failed: ${lastError}`);
        continue;
      }

      const data = await response.json();
      const imageUrl = data?.data?.[0]?.url || data?.data?.[0]?.b64_json;

      if (imageUrl) {
        if (imageUrl.startsWith("http")) {
          const downloadController = new AbortController();
          const downloadTimeout = setTimeout(() => downloadController.abort(), 30_000);
          let imgResp: Response;
          try {
            imgResp = await fetch(imageUrl, { signal: downloadController.signal });
          } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
            console.warn(`[Image Generation] Download failed: ${lastError}`);
            continue;
          } finally {
            clearTimeout(downloadTimeout);
          }
          if (imgResp.ok) {
            const buffer = await imgResp.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            return {
              url: `data:image/png;base64,${base64}`,
              success: true,
            };
          }
        } else if (imageUrl.startsWith("data:")) {
          return { url: imageUrl, success: true };
        } else {
          return { url: `data:image/png;base64,${imageUrl}`, success: true };
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.warn(`[Image Generation] Network error on ${providerUrl}: ${lastError}`);
    }
  }

  return {
    url: "",
    success: false,
    error: `Image generation failed: ${lastError}`,
  };
}

export async function generateSpellCardImageWithRetry(
  prompt: string,
  spellName: string,
  maxRetries = 2
): Promise<ImageGenerationResult> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await generateSpellCardImage(prompt, spellName);
    if (result.success) {
      return result;
    }

    if (result.error?.includes("rate limit") && attempt < maxRetries - 1) {
      const backoffMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      continue;
    }
  }

  return {
    url: "",
    success: false,
    error: "Max retries exceeded for image generation",
  };
}