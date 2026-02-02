import { NextResponse } from "next/server";

// Кэш цен (обновляется раз в сутки)
let cachedPricing = {
  textInput: 2.00,
  imageOutput: 120.00,
  lastUpdated: new Date('2026-01-26').toISOString(),
};

let lastFetchTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа

export async function GET() {
  const now = Date.now();

  // Если кэш свежий, возвращаем его
  if (now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json(cachedPricing);
  }

  try {
    // Парсим официальную страницу Google с ценами
    const response = await fetch('https://ai.google.dev/gemini-api/docs/pricing', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.warn('Failed to fetch pricing, using cached values');
      return NextResponse.json(cachedPricing);
    }

    const html = await response.text();

    // Ищем цены в HTML (примерный парсинг)
    // Формат может быть: "$2" или "$120" в таблице цен
    const textInputMatch = html.match(/input.*?\$(\d+\.?\d*)/i);
    const imageOutputMatch = html.match(/image.*?output.*?\$(\d+\.?\d*)/i);

    if (textInputMatch && imageOutputMatch) {
      cachedPricing = {
        textInput: parseFloat(textInputMatch[1]),
        imageOutput: parseFloat(imageOutputMatch[1]),
        lastUpdated: new Date().toISOString(),
      };
      lastFetchTime = now;
      console.log('Updated Gemini pricing:', cachedPricing);
    }

    return NextResponse.json(cachedPricing);

  } catch (error) {
    console.error('Error fetching Gemini pricing:', error);
    // При ошибке возвращаем кэшированные значения
    return NextResponse.json(cachedPricing);
  }
}
