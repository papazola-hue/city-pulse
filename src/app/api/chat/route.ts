import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { EVENT_DATA } from '@/data/mockEvents';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const eventsJson = JSON.stringify(EVENT_DATA.map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      location: e.location,
      time: e.time,
      distance: e.distance
    })));

    const prompt = `
      Anda adalah AI Assistant cerdas untuk aplikasi "City Pulse", sebuah radar event lokal.
      Pengguna menanyakan: "${message}"

      Berikut adalah daftar event yang sedang aktif di database kami:
      ${eventsJson}

      Tugas Anda:
      1. Cari event yang paling relevan dengan pertanyaan pengguna.
      2. Jika ada, berikan respons yang ramah, gaul, dan singkat (maksimal 2 kalimat). 
      3. Tentukan ID dari event tersebut agar sistem bisa menampilkan lokasinya di peta.
      4. Jika tidak ada yang cocok sama sekali, berikan respons maaf dan ID bernilai null.
      5. Output HARUS dalam format JSON murni tanpa markdown, backticks, atau teks lain di sekitarnya.
      
      Format Output:
      {
        "reply": "Respons teks Anda di sini...",
        "eventId": 1 // (atau angka ID event, null jika tidak ada)
      }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-flash-latest', 
        contents: prompt,
    });

    const resultText = response.text || '';
    const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson);

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('Chat Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
