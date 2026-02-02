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

    // Промпт: возврат к рабочей простой версии + negative prompt для предотвращения рамок
    const prompt = `Transform this entire image into vibrant comic book style with bold black outlines, cel shading, and saturated flat colors.

IMPORTANT INSTRUCTIONS:
1. If there are white/blank areas around the photo content, EXPAND the scene naturally by filling these areas with continuation of the background (sky, ground, walls, scenery, etc.) in the same comic book style.
2. Keep the original photo content in its EXACT position - do not move, resize, or recompose it.
3. The white areas are NOT part of the scene - they are blank space that needs to be filled with natural scene extension.
4. Maintain spatial composition: if the photo is positioned upper-left, keep content there and extend the scene to right and bottom.
5. Make people and objects recognizable but stylized as comic characters.

Transform and extend seamlessly in comic book art style.

Negative prompt: no borders, no frames, no margins, no mockup, no black border, no white border, no composite, no layered effect, no picture-in-picture.`;

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
