import { NextResponse } from "next/server";
import { DEFAULT_MODEL, GEMINI_MODELS } from "@/lib/geminiModels";

// Gemini берёт 20-60 сек, Seedream через fal.ai ~60 сек
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { imageBase64, modelId = DEFAULT_MODEL, prompt: promptFromClient } = await request.json();

    const modelConfig = GEMINI_MODELS[modelId];

    // Роутинг по провайдеру
    if (modelConfig?.provider === 'openai') {
      return handleOpenAIRequest(imageBase64, promptFromClient, modelConfig);
    }
    if (modelConfig?.provider === 'fal') {
      return handleFalRequest(imageBase64, promptFromClient, modelConfig);
    }

    // Ваш API ключ из Google Cloud
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Промпт: клиент может передать свой промпт, иначе используется стандартный
    const prompt = promptFromClient || `Transform this entire image into vibrant comic book style with bold black outlines, cel shading, and saturated flat colors.

CRITICAL RULE: The output MUST be fully rendered in the chosen art style — it must look like stylized artwork, NOT a photograph. The style preset defines the target visual appearance and must be applied completely to every part of the image. At the same time, copy every person and detail from the source exactly as visible — same poses, same body orientations, same states. The art style changes how things are rendered; it does not change what is shown. Do NOT add or remove any objects, accessories, or clothing items (e.g. do not add glasses, hats, or change what someone is wearing). The style preset may adjust rendering proportions (e.g. larger eyes in manga style) — that is allowed as part of the art style. Only the rendering style (lines, colors, shading, proportions) should change, not what is depicted.

IMPORTANT INSTRUCTIONS:
1. ANALYZE the small fragment of background visible in the source photo (e.g., sky, clouds, trees, ground, water, buildings, sunset).
2. EXTEND this EXACT SAME environment to fill the white areas. Create a wide panoramic view of this location.
3. The white areas are NOT part of the scene - they are blank canvas to paint the extended background on.
4. Keep the original photo content in its EXACT position - do not move, resize, or recompose it.
5. Maintain spatial composition: if the photo is positioned upper-left, keep content there and extend the scene to right and bottom.
6. Match the perspective, lighting, and elements from the visible background.
7. The photo MUST MERGE seamlessly with the extended background - there should be NO separation, NO dividing lines, NO borders between the photo and the extended areas. The background from the photo should continue all the way to the outer edges of the canvas.
8. The source photo is the single source of truth for all content. Every visible element — pose, orientation, clothing, accessories, expressions — must match the source exactly. Render only what is visible; anything hidden or not shown in the source must stay that way. The art style may adjust proportions and eye size as part of the style, but must not change what is depicted or invent details not present in the source.
9. CRITICAL: Fill the ENTIRE canvas edge-to-edge with the scene. NO white bars, NO blank spaces, NO padding at top, bottom, left, or right. The comic artwork must extend all the way to every edge of the image.
10. If the original aspect ratio needs adjustment, extend the background scenery rather than adding white/blank bars.

Transform and extend seamlessly in comic book art style. The result must look like one unified scene of stylized artwork, not a photo placed on a background.`;

    // Убираем префикс data:image/jpeg;base64, если есть
    const base64Data = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    // Подготавливаем тело запроса
    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            },
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.8  // Компромисс: сохраняет reasoning, снижает вариативность (меньше рамок/композитов)
      }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    console.log(`Sending request to Gemini API (model: ${modelId})...`);
    console.log('PROMPT:\n' + prompt);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error:", response.status, errorText);
      return NextResponse.json(
        { error: `API error: ${response.status} ${errorText}` },
        { status: 500 }
      );
    }

    const result = await response.json();

    // Получаем сгенерированное изображение
    const imageData = result.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData
    )?.inlineData;

    if (!imageData) {
      console.error("No image in response:", JSON.stringify(result, null, 2));
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }

    const stylizedImage = `data:${imageData.mimeType};base64,${imageData.data}`;

    // Извлекаем информацию о токенах
    const usageMetadata = result.usageMetadata || {};
    const tokenInfo = {
      promptTokens: usageMetadata.promptTokenCount || 0,
      candidatesTokens: usageMetadata.candidatesTokenCount || 0,
      totalTokens: usageMetadata.totalTokenCount || 0,
      modelId: modelId
    };

    console.log("Stylization successful! Tokens used:", tokenInfo);

    return NextResponse.json({
      success: true,
      stylizedUrl: stylizedImage,
      tokens: tokenInfo
    });

  } catch (error: any) {
    console.error("Stylization error:", error);
    return NextResponse.json(
      { error: error.message || "Stylization failed" },
      { status: 500 }
    );
  }
}

// ─── fal.ai handler (Seedream 4.5 и другие fal.ai модели) ───────────────────

async function handleFalRequest(
  imageBase64: string,
  promptFromClient: string | undefined,
  modelConfig: any
) {
  const falApiKey = process.env.FAL_API_KEY;
  if (!falApiKey) {
    return NextResponse.json(
      { error: "FAL_API_KEY not configured. Add it to .env.local" },
      { status: 500 }
    );
  }

  // Kontext works better with short, direct instructions.
  // Replace the long DEFAULT_PROCESS_INSTRUCTIONS (everything from "CRITICAL RULE:") with
  // a Kontext-optimized version. Style preset text is preserved.
  const KONTEXT_PROCESS_INSTRUCTIONS = `The source image shows a photo placed on a white canvas. The photo does NOT fill the entire canvas — it occupies only part of it. DO NOT scale, stretch, crop, or reposition the photo. Keep it at its exact current size and position. The white areas around the photo are empty canvas — fill them by extending the background that is visible inside the photo (same sky, ground, trees, or environment). Blend the extended background into the photo with no visible borders or seams. Apply the art style described above to the entire result — both the photo content and the extended background — so everything looks like one unified stylized artwork. Fill 100% of the canvas with no white spaces remaining.`;

  let prompt: string;
  if (promptFromClient && modelConfig.falInputStyle === 'single') {
    // For Kontext: keep style preset, replace heavy process instructions
    const stylePart = promptFromClient.split('\n\nCRITICAL RULE:')[0].trim();
    prompt = stylePart + '\n\n' + KONTEXT_PROCESS_INSTRUCTIONS;
  } else {
    prompt = promptFromClient || `Transform this image into vibrant manga/comic book style. Bold black ink outlines, cel shading, saturated flat colors. Preserve every person's appearance, pose and expression exactly. Fill the ENTIRE canvas edge-to-edge with stylized artwork. NO white bars, NO black borders, NO blank spaces at any edge.`;
  }

  // Подготавливаем изображение — fal.ai принимает data URL напрямую
  const imageDataUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const modelPath = modelConfig.falModelPath;
  const falUrl = `https://fal.run/${modelPath}`;

  console.log(`Sending request to fal.ai (model: ${modelPath})...`);
  console.log('PROMPT:\n' + prompt);

  // Seedream uses image_urls (array), Kontext uses image_url (single)
  const imagePayload = modelConfig.falInputStyle === 'single'
    ? { image_url: imageDataUrl }
    : { image_urls: [imageDataUrl], image_size: 'auto_4K' };

  const response = await fetch(falUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      ...imagePayload,
      num_images: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("fal.ai error:", response.status, errorText);
    return NextResponse.json(
      { error: `fal.ai error: ${response.status} ${errorText}` },
      { status: 500 }
    );
  }

  const result = await response.json();
  console.log("fal.ai response:", JSON.stringify(result, null, 2));

  // fal.ai возвращает images[].url
  const imageUrl = result.images?.[0]?.url;
  if (!imageUrl) {
    console.error("No image in fal.ai response:", result);
    return NextResponse.json(
      { error: "No image returned from fal.ai" },
      { status: 500 }
    );
  }

  // Скачиваем результат и конвертируем в base64 (как и у Gemini)
  const imgResponse = await fetch(imageUrl);
  const imgBuffer = await imgResponse.arrayBuffer();
  const imgBase64 = Buffer.from(imgBuffer).toString('base64');
  const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
  const stylizedImage = `data:${contentType};base64,${imgBase64}`;

  const tokenInfo = {
    promptTokens: 0,
    candidatesTokens: 0,
    totalTokens: 0,
    modelId: modelConfig.id,
    costUsd: modelConfig.pricing.avgImageCost,
  };

  console.log(`fal.ai stylization successful! Cost: ~$${modelConfig.pricing.avgImageCost}`);

  return NextResponse.json({
    success: true,
    stylizedUrl: stylizedImage,
    tokens: tokenInfo,
  });
}

// ─── OpenAI handler (gpt-image-1.5 и другие OpenAI модели) ──────────────────

async function handleOpenAIRequest(
  imageBase64: string,
  promptFromClient: string | undefined,
  modelConfig: any
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured. Add it to .env.local" },
      { status: 500 }
    );
  }

  // Используем тот же промпт, что и для Gemini (клиент передаёт собранный промпт)
  const prompt = promptFromClient || `Transform this entire image into vibrant comic book style with bold black outlines, cel shading, and saturated flat colors. Preserve every person's exact appearance — same faces, clothing, body type, poses. Fill the entire canvas edge-to-edge with stylized artwork.`;

  // Конвертируем base64 → Buffer → Blob для multipart/form-data
  const base64Data = imageBase64.startsWith('data:') ? imageBase64.split(',')[1] : imageBase64;
  const mimeMatch = imageBase64.startsWith('data:') ? imageBase64.match(/data:([^;]+);/) : null;
  const mimeType = mimeMatch?.[1] || 'image/jpeg';
  const imageBuffer = Buffer.from(base64Data, 'base64');
  const imageBlob = new Blob([imageBuffer], { type: mimeType });

  const formData = new FormData();
  formData.append('model', modelConfig.id);
  formData.append('image[]', imageBlob, 'image.jpg');
  formData.append('prompt', prompt);
  formData.append('quality', modelConfig.openaiQuality || 'medium');
  formData.append('size', 'auto');
  formData.append('output_format', 'jpeg');
  formData.append('output_compression', '92');
  formData.append('input_fidelity', 'high');
  formData.append('moderation', 'low');

  console.log(`Sending request to OpenAI API (model: ${modelConfig.id}, quality: ${modelConfig.openaiQuality || 'medium'})...`);

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      // Content-Type НЕ устанавливаем — fetch сам добавит boundary для FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    return NextResponse.json(
      { error: `OpenAI API error: ${response.status} ${errorText}` },
      { status: 500 }
    );
  }

  const result = await response.json();
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    console.error('No image in OpenAI response:', JSON.stringify(result, null, 2));
    return NextResponse.json({ error: 'No image returned from OpenAI' }, { status: 500 });
  }

  const stylizedImage = `data:image/jpeg;base64,${b64}`;
  const tokenInfo = {
    promptTokens: 0,
    candidatesTokens: 0,
    totalTokens: 0,
    modelId: modelConfig.id,
    costUsd: modelConfig.pricing.avgImageCost,
  };

  console.log(`OpenAI stylization successful! Cost: ~$${modelConfig.pricing.avgImageCost}`);

  return NextResponse.json({
    success: true,
    stylizedUrl: stylizedImage,
    tokens: tokenInfo,
  });
}
