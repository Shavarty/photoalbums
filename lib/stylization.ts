// Stylization presets & prompt assembly
export const STYLE_PRESETS = [
  {
    id: 'comic-book',
    name: 'Comic Book',
    prompt: `Transform this entire image into vibrant comic book style illustration. Use bold, crisp black outlines with saturated flat colors and cel-shading. Create dynamic lighting with strong contrast between light and shadow areas. Make characters and objects look like they are from a classic American comic book panel.`,
  },
  {
    id: 'manga',
    name: 'Manga',
    prompt: `Transform this entire image into Japanese manga illustration style. Convert to high-contrast black and white with expressive hatching and cross-hatching for shading. Use bold black outlines with varying line weights — thick for main contours, thin for details. Add dramatic lighting with deep shadows and crisp white highlights. If there are faces, make eyes larger and more expressive in classic manga style.`,
  },
  {
    id: 'noir',
    name: 'Noir',
    prompt: `Transform this entire image into a noir comic book illustration style. Convert to dramatic black and white with high-contrast lighting — deep blacks, crisp whites, and minimal mid-tones. Use bold silhouettes and dramatic shadow patterns inspired by 1940s noir film posters. Create a moody, atmospheric mood with strong diagonal lighting and expressive brushwork for outlines.`,
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    prompt: `Transform this entire image into a watercolor painting illustration. Use transparent color washes with soft, flowing edges where colors blend naturally into each other. Paper texture should be subtly visible, especially in lighter areas. Colors should be vibrant but with the characteristic translucency of watercolor medium. Use wet-on-wet blending for dreamy, soft transitions. Bold outlines can define key shapes while fill areas have soft watercolor treatment.`,
  },
  {
    id: '3d-animated',
    name: '3D Animated',
    prompt: `Transform this entire image into a 3D animated movie character illustration style, similar to Pixar and DreamWorks films. Create smooth, rounded forms with soft expressive lighting and subtle subsurface scattering on skin. Use vibrant, appealing colors with gentle diffused shadows. Characters should have exaggerated charming proportions — large expressive eyes, smooth skin textures. The overall feel should be warm, friendly, and visually polished like a frame from a modern 3D animated film.`,
  },
];

export const DEFAULT_PROCESS_INSTRUCTIONS = `CRITICAL RULE: The output MUST be fully rendered in the chosen art style — it must look like stylized artwork, NOT a photograph. The style preset defines the target visual appearance and must be applied completely to every part of the image. At the same time, copy every person and detail from the source exactly as visible — same poses, same body orientations, same states. The art style changes how things are rendered; it does not change what is shown. Do NOT add or remove any objects, accessories, or clothing items (e.g. do not add glasses, hats, or change what someone is wearing). The style preset may adjust rendering proportions (e.g. larger eyes in manga style) — that is allowed as part of the art style. Only the rendering style (lines, colors, shading, proportions) should change, not what is depicted.

IMPORTANT INSTRUCTIONS:
1. ANALYZE the small fragment of background visible in the source photo (e.g., sky, clouds, trees, ground, water, buildings, sunset).
2. EXTEND this EXACT SAME environment to fill the white areas. Create a wide panoramic view of this location.
3. The white areas are NOT part of the scene - they are blank canvas to paint the extended background on.
4. Keep the original photo content in its EXACT position - do not move, resize, or recompose it.
5. Maintain spatial composition: if the photo is positioned upper-left, keep content there and extend the scene to right and bottom.
6. Match the perspective, lighting, and elements from the visible background.
7. The photo MUST MERGE seamlessly with the extended background - there should be NO separation, NO dividing lines, NO borders between the photo and the extended areas. The background from the photo should continue all the way to the outer edges of the canvas.
8. The source photo is the single source of truth for all content. Every visible element — pose, orientation, clothing, accessories, expressions — must match the source exactly. Render only what is visible; anything hidden or not shown in the source must stay that way. The art style may adjust proportions and eye size as part of the style, but must not change what is depicted or invent details not present in the source.
9. CRITICAL: Fill the ENTIRE canvas edge-to-edge with the scene. NO white bars, NO blank spaces, NO padding at top, bottom, left, or right. The artwork must extend all the way to every edge of the image.
10. If the original aspect ratio needs adjustment, extend the background scenery rather than adding white/blank bars.

Transform and extend seamlessly in the chosen art style. The result must look like one unified scene of stylized artwork, not a photo placed on a background.`;
