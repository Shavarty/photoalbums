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

    // Промпт для стилизации с поддержкой expansion (основан на успешном промпте пользователя)
    const prompt = `TASK: STYLIZE and TRANSFORM. DO NOT CROP. DO NOT ZOOM IN.

STRICT SPATIAL INTEGRITY RULES (HIGHEST PRIORITY):
- NO CROPPING ALLOWED: The input image represents the FINAL CANVAS SIZE. White space should be treated as "canvas underlay" to be filled with paint, NOT as empty space to be cropped away.
- 1:1 SCALING: Characters/subjects MUST occupy EXACTLY THE SAME percentage of pixels in output as in input. If subjects occupy 20% of height in input, they must occupy 20% of height in output.
- ABSOLUTE PLACEMENT: Do not move subjects to center. If they are in the bottom-right corner, keep them in the bottom-right corner.
- ANCHORING: Imagine the input image is a locked layer. You are painting underneath the subjects. The subjects themselves act as a fixed anchor.

MODE: STYLIZATION AND PAINTING
INSTRUCTIONS:
1. Keep subjects EXACTLY as presented in the source image. Do not change their pose, position, or clothing. Strictly preserve their likeness and facial features.
2. Apply Style: Apply "Modern Romantic Graphic Novel" style (clean lines, soft cel-shaded shading) to make subjects look like high-quality digital illustration, not a photo filter.
3. Background Extension: Analyze the small fragment of background visible in the source photo (e.g., wooden floor, sunset, water, trees, sky). Extend this EXACT SAME environment to fill the rest of the white canvas. Create a wide panoramic view of this location.

VISUAL STYLE:
- Modern Western comic aesthetic
- High-quality digital 2D illustration
- Vibrant but natural colors
- Cinematic lighting (golden hour tones)
- Sharp outlines, soft gradients
- Smooth, soft shading
- NOT photorealistic, NOT anime
- NO artifacts, NO frames, NO borders

Remember: White areas are empty canvas to paint on with natural scene continuation.`;

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
        temperature: 0.6  // Проверенная температура для стабильных результатов
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
