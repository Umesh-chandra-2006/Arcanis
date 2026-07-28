import { ENV } from "./_core/env";

export interface ImageGenerationResult {
  url: string;
  success: boolean;
  error?: string;
}

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

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev",
      {
        headers: {
          Authorization: `Bearer ${ENV.imageGenApiKey}`,
        },
        method: "POST",
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            height: 512,
            width: 512,
            guidance_scale: 7.5,
            num_inference_steps: 28,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as any).error || response.statusText;
      console.error(`[Image Generation] Hugging Face error: ${errorMessage}`);
      return {
        url: "",
        success: false,
        error: `Hugging Face API error: ${errorMessage}`,
      };
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    return {
      url: dataUrl,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Image Generation] Failed to generate image: ${errorMessage}`);
    return {
      url: "",
      success: false,
      error: `Image generation failed: ${errorMessage}`,
    };
  }
}

export async function generateSpellCardImageWithRetry(
  prompt: string,
  spellName: string,
  maxRetries = 3
): Promise<ImageGenerationResult> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await generateSpellCardImage(prompt, spellName);

    if (result.success) {
      return result;
    }

    if (result.error?.includes("rate limit") && attempt < maxRetries - 1) {
      const backoffMs = Math.pow(2, attempt) * 1000;
      console.warn(
        `[Image Generation] Rate limited, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      continue;
    }

    return result;
  }

  return {
    url: "",
    success: false,
    error: "Max retries exceeded for image generation",
  };
}
