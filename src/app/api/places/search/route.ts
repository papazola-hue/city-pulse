import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey.includes('YOUR')) {
    return NextResponse.json({ error: 'API Key missing or invalid' }, { status: 400 });
  }

  try {
    const { query } = await req.json();

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.location,places.reviews'
      },
      body: JSON.stringify({ textQuery: query, languageCode: 'id' })
    });
    
    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 403 });
    }
    
    return NextResponse.json({ places: data.places || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
