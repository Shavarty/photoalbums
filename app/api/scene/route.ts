import { NextResponse } from "next/server";

export const maxDuration = 120;

const SCENE_GENERATION_INSTRUCTIONS = `Extract all the people from this reference photo — their exact faces, clothing, body types, and poses. Place them naturally in this new scene: {SCENE_DESCRIPTION}

CRITICAL RULES:
1. Preserve every person's exact appearance from the reference photo — same faces, clothing, body type
2. Generate a completely new background based on the scene description
3. Integrate the people naturally into the new scene with correct lighting and perspective
4. Apply the art style described above to the entire image
5. Fill the ENTIRE canvas edge-to-edge — no white bars, no blank spaces
6. The result must be one unified stylized illustration of these people in the described scene`;

export async function POST(request: Request) {
  try {
    const { imageBase64, imageBase64s, sceneDescription, stylePreset } = await request.json();

    // Support both single imageBase64 (legacy) and imageBase64s array
    const images: string[] = imageBase64s?.length ? imageBase64s : (imageBase64 ? [imageBase64] : []);

    if (images.length === 0) {
      return NextResponse.json({ error: "At least one reference image is required" }, { status: 400 });
    }
    if (!sceneDescription?.trim()) {
      return NextResponse.json({ error: "Scene description is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const modelId = "gemini-3-pro-image-preview";

    const processInstructions = SCENE_GENERATION_INSTRUCTIONS.replace(
      "{SCENE_DESCRIPTION}",
      sceneDescription.trim()
    );

    const prompt = (stylePreset?.trim() ? stylePreset.trim() + "\n\n" : "") + processInstructions;

    // Build parts: one inlineData per reference image, then the text prompt
    const imageParts = images.map((img) => {
      const base64Data = img.includes(",") ? img.split(",")[1] : img;
      return { inlineData: { mimeType: "image/jpeg", data: base64Data } };
    });

    const requestBody = {
      contents: [
        {
          parts: [
            ...imageParts,
            {
              text: images.length > 1
                ? `Reference photos above show the people to use (${images.length} photos). ` + prompt
                : prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.8,
      },
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    console.log(`Scene generation request (model: ${modelId})...`);
    console.log("Scene description:", sceneDescription);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return NextResponse.json(
        { error: `API error: ${response.status} ${errorText}` },
        { status: 500 }
      );
    }

    const result = await response.json();

    const imageData = result.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData
    )?.inlineData;

    if (!imageData) {
      console.error("No image in response:", JSON.stringify(result, null, 2));
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    const generatedUrl = `data:${imageData.mimeType};base64,${imageData.data}`;

    const usageMetadata = result.usageMetadata || {};
    const tokens = {
      promptTokens: usageMetadata.promptTokenCount || 0,
      candidatesTokens: usageMetadata.candidatesTokenCount || 0,
      totalTokens: usageMetadata.totalTokenCount || 0,
      modelId,
    };

    console.log("Scene generation successful! Tokens:", tokens);

    return NextResponse.json({ success: true, generatedUrl, tokens });
  } catch (error: any) {
    console.error("Scene generation error:", error);
    return NextResponse.json(
      { error: error.message || "Scene generation failed" },
      { status: 500 }
    );
  }
}
