import { NextResponse } from "next/server";

export const maxDuration = 120;

// Все поддерживаемые Gemini соотношения сторон (generationConfig.imageConfig.aspectRatio)
const GEMINI_ASPECT_RATIOS: [string, number][] = [
  ["1:1",  1],
  ["2:3",  2/3],
  ["3:2",  3/2],
  ["3:4",  3/4],
  ["4:3",  4/3],
  ["4:5",  4/5],
  ["5:4",  5/4],
  ["9:16", 9/16],
  ["16:9", 16/9],
  ["21:9", 21/9],
];

function toGeminiAspectRatio(ar: number): string {
  let best = "1:1";
  let bestDiff = Infinity;
  for (const [label, value] of GEMINI_ASPECT_RATIOS) {
    const diff = Math.abs(ar - value);
    if (diff < bestDiff) { bestDiff = diff; best = label; }
  }
  return best;
}

const SCENE_GENERATION_INSTRUCTIONS = `Extract all the people from this reference photo — their exact faces, clothing, body types, and poses. Place them naturally in this new scene: {SCENE_DESCRIPTION}

CRITICAL RULES:
1. Preserve every person's exact appearance from the reference photo — same faces, clothing, body type
2. Generate a completely new background based on the scene description
3. Integrate the people naturally into the new scene with correct lighting and perspective
4. Apply the art style described above to the entire image
5. Fill the ENTIRE canvas edge-to-edge — no white bars, no blank spaces
6. The result must be one unified stylized illustration of these people in the described scene
7. DO NOT add speech bubbles, thought bubbles, caption boxes, sound effects text, or any text overlay — the image must be clean artwork with no text embedded in it`;

export async function POST(request: Request) {
  try {
    const { imageBase64, imageBase64s, sceneDescription, stylePreset, aspectRatio, isCover = false } = await request.json();

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

    const coverInstructions = isCover ? `

BOOK COVER COMPOSITION (CRITICAL):
- Generate ONE single continuous panoramic illustration — do NOT create split panels, diptychs, or two separate scenes joined together
- The entire canvas must be ONE unified image that flows seamlessly from left edge to right edge with no visible division, seam, or break
- SHOT TYPE: LONG SHOT — the camera is far from the scene. Characters appear as relatively small figures within a large environment. The scenery and background dominate the frame. Do NOT use close-up, medium shot, or full-frame character framing.
- PRINT TRIM WARNING (CRITICAL): This image will be physically trimmed by 18mm on every side during book production. Characters positioned near any canvas edge WILL BE CUT OFF in the final printed book. To survive the trim, ALL characters and every body part (head, raised hands, feet) must be placed strictly inside the inner safe zone — at least 25% away from every canvas edge (top, bottom, left, right).
- Characters must occupy NO MORE than 45% of the canvas height total, centered vertically — leaving substantial empty background above their heads and below their feet
- Place ALL main characters and key story elements in the RIGHT PORTION of the panoramic image (approximately the right 50% of the canvas), horizontally centered within that right half, with clear empty space to the right of the rightmost character
- The LEFT PORTION of the canvas (approximately the left 50%) should be atmospheric background scenery only — sky, landscape, environment — with no main characters or key objects
- Leave clear space in the upper-right area for the book title` : '';

    const prompt = (stylePreset?.trim() ? stylePreset.trim() + "\n\n" : "") + processInstructions + coverInstructions;

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
        imageConfig: {
          aspectRatio: aspectRatio ? toGeminiAspectRatio(aspectRatio) : "1:1",
        },
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
