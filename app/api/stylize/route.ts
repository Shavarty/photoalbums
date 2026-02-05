import { NextResponse } from "next/server";
import { DEFAULT_MODEL } from "@/lib/geminiModels";

// Gemini image generation берёт 20-60 секунд
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { imageBase64, modelId = DEFAULT_MODEL, prompt: promptFromClient } = await request.json();

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

CRITICAL RULE: The output MUST be fully rendered in the chosen art style — it must look like stylized artwork, NOT a photograph. The style preset defines the target visual appearance and must be applied completely to every part of the image. At the same time, preserve all SOURCE CONTENT precisely: every person's pose, orientation, clothing, and accessories must be copied exactly as they appear. FACIAL EXPRESSIONS must be preserved exactly — if a person's eyes are closed or squinted in the source, render them closed or squinted; do not open closed eyes or invent details (such as eye color) that are not visible in the source. Do NOT add or remove any objects, accessories, or clothing items (e.g. do not add glasses, hats, or change what someone is wearing). The style preset may adjust rendering proportions (e.g. larger eyes in manga style) — that is allowed as part of the art style. Only the rendering style (lines, colors, shading, proportions) should change, not what is depicted.

IMPORTANT INSTRUCTIONS:
1. ANALYZE the small fragment of background visible in the source photo (e.g., sky, clouds, trees, ground, water, buildings, sunset).
2. EXTEND this EXACT SAME environment to fill the white areas. Create a wide panoramic view of this location.
3. The white areas are NOT part of the scene - they are blank canvas to paint the extended background on.
4. Keep the original photo content in its EXACT position - do not move, resize, or recompose it.
5. Maintain spatial composition: if the photo is positioned upper-left, keep content there and extend the scene to right and bottom.
6. Match the perspective, lighting, and elements from the visible background.
7. The photo MUST MERGE seamlessly with the extended background - there should be NO separation, NO dividing lines, NO borders between the photo and the extended areas. The background from the photo should continue all the way to the outer edges of the canvas.
8. The source photo is the single source of truth for all content. Every visible element — pose, orientation, clothing, accessories, expressions — must match the source exactly. EXPRESSIONS: if eyes are closed or squinting, keep them that way; do not invent details not visible in the source (e.g. eye color when eyes are closed). Do NOT add or remove objects or accessories. The art style may adjust proportions and eye size as part of the style, but must not change expressions or invent missing details.
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
