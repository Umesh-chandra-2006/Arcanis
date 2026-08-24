import "dotenv/config";

async function testEndpoints() {
  const token = process.env.IMAGE_GEN_API_KEY;
  const prompt = "A frostbolt projectile of jagged glowing blue ice crystals roaring through a dark frozen blizzard atmosphere, pure central illustration art, no text, no UI elements, no borders";

  const candidates = [
    // OpenAI Compatible endpoint on HuggingFace router
    {
      url: "https://router.huggingface.co/hf-inference/v1/images/generations",
      body: { prompt, model: "black-forest-labs/FLUX.1-schnell" }
    },
    {
      url: "https://router.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
      body: { inputs: prompt }
    },
    {
      url: "https://router.huggingface.co/hf-inference/v1/images/generations",
      body: { prompt, model: "stabilityai/stable-diffusion-xl-base-1.0" }
    },
    {
      url: "https://router.huggingface.co/together/v1/images/generations",
      body: { prompt, model: "black-forest-labs/FLUX.1-schnell" }
    }
  ];

  for (const item of candidates) {
    console.log(`\nTesting ${item.url}...`);
    try {
      const resp = await fetch(item.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(item.body)
      });
      console.log(`Status: ${resp.status}`);
      const txt = await resp.text();
      console.log(`Resp snippet: ${txt.substring(0, 300)}`);
    } catch (err) {
      console.error(`Error testing ${item.url}:`, err.message);
    }
  }
}

testEndpoints();
