import { NextResponse } from "next/server";
import { DEFAULT_MODEL } from "@/lib/geminiModels";

export async function POST(request: Request) {
  try {
    const { imageBase64, modelId = DEFAULT_MODEL } = await request.json();

    // Ваш API ключ из Google Cloud
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Промпт оптимизирован для Gemini 3 Pro Image (concise, direct, positive)
    const prompt = `Image expansion (outpainting) task:

INPUT: Photo positioned within white canvas. White areas = space to fill with extended background.
OUTPUT: Same canvas size. Photo stays in exact same position. Fill white areas by extending the photo's background seamlessly.

SPATIAL RULES:
- Photo position: Keep exactly where shown (no centering, no moving)
- Photo size: Keep same percentage of canvas as input (1:1 scaling)
- Canvas size: Keep input dimensions exactly

BACKGROUND EXTENSION:
- Analyze visible background in photo (sky, ground, trees, water, buildings, etc.)
- Extend that same background environment into white areas
- Create natural panoramic continuation
- Match perspective, lighting, and elements from original photo

STYLE APPLICATION:
Modern romantic graphic novel illustration: clean linework, soft cel-shading, vibrant natural colors, cinematic golden-hour lighting, smooth gradients, high-quality digital 2D art. Maintain character likeness and facial features.

Seamlessly blend extended background with original photo content in illustrated style.`;

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
        temperature: 1.0  // Google рекомендует 1.0 для Gemini 3 (оптимально для reasoning)
      }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    console.log(`Sending request to Gemini API (model: ${modelId}, via system VPN)...`);

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
