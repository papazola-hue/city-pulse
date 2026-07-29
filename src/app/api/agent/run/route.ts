import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { placeName, latitude, longitude, reviews } = await req.json();

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({ success: true, result: { hasIssue: false } });
    }

    const reviewsText = reviews.join('\n- ');
    const prompt = `
      Anda adalah AI penganalisis keluhan fasilitas publik.
      Lokasi: ${placeName}
      Ulasan Asli dari Google:
      - ${reviewsText}
      
      Tugas Anda:
      1. Apakah ada keluhan tentang kerusakan infrastruktur/fasilitas? (Contoh: rusak, kotor, mati, macet, bocor)
      2. Abaikan komplain pelayanan manusia (misal: kasir judes, dokter lambat). Fokus pada fasilitas fisik kota.
      3. Jika YA ada keluhan fasilitas, ekstrak ringkasan masalahnya dan tentukan urgensinya (HIGH, MEDIUM, LOW).
      4. Format output ke dalam JSON murni (tanpa markdown/backticks):
      {
        "hasIssue": boolean,
        "summary": "Deskripsi singkat masalah infrastruktur",
        "urgency": "HIGH" | "MEDIUM" | "LOW"
      }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
    });

    const resultText = response.text || '';
    const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson);

    if (result.hasIssue) {
        // Save to Supabase using exact real coordinates from Google
        const { error } = await supabase
            .from('issues')
            .insert([
                {
                    place_name: placeName,
                    latitude: latitude,
                    longitude: longitude,
                    issue_summary: result.summary,
                    urgency: result.urgency,
                    status: 'OPEN'
                }
            ]);
            
        if (error) {
            console.error('Supabase Error:', error);
            return NextResponse.json({ error: 'Database save failed' }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('Agent Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
