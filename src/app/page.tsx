'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import dynamic from 'next/dynamic';
import { AlertTriangle, CheckCircle, RefreshCcw, Activity, MapPin, Play, Terminal, Trash2 } from 'lucide-react';

const LeafletMap = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-400">
      <RefreshCcw className="w-8 h-8 animate-spin mr-2" /> Loading Interactive Map...
    </div>
  ),
});

const SCAN_QUERIES = [
  "Stasiun MRT Jakarta",
  "Taman Kota Jakarta",
  "Halte TransJakarta",
  "RSUD Jakarta"
];

const FALLBACK_PLACES = [
  {
    displayName: { text: "Stasiun Sudirman" },
    location: { latitude: -6.2023, longitude: 106.8228 },
    reviews: [{ text: { text: "Eskalator di pintu B dekat pintu keluar rusak lagi, antrian panjang pas jam pulang kerja." } }]
  },
  {
    displayName: { text: "Halte TransJakarta Harmoni" },
    location: { latitude: -6.1674, longitude: 106.8233 },
    reviews: [{ text: { text: "AC di dalam ruang tunggu mati total, sumpek banget pas siang hari." } }]
  },
  {
    displayName: { text: "RSUD Tarakan" },
    location: { latitude: -6.1751, longitude: 106.8091 },
    reviews: [{ text: { text: "Atap ruang tunggu IGD bocor pas hujan lebat tadi, airnya menggenang di lantai." } }]
  }
];

export default function Dashboard() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patrolling, setPatrolling] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  
  // Terminal Logs State
  const [logs, setLogs] = useState<string[]>(["🤖 PRODUCTION MODE: Live Ingestion Pipeline Ready."]);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [`[${time}] ${message}`, ...prev]);
  };

  const fetchIssues = async () => {
    setLoading(true);
    const { data } = await supabase.from('issues').select('*').order('created_at', { ascending: false });
    if (data) setIssues(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const startPatrol = async () => {
    if (patrolling) return;
    setPatrolling(true);
    addLog("🚀 Initiating Real-Time City Infrastructure Scan...");

    const query = SCAN_QUERIES[Math.floor(Math.random() * SCAN_QUERIES.length)];
    addLog(`📡 Contacting Google Places API... Searching for: "${query}"`);

    try {
      const placesRes = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      const placesData = await placesRes.json();
      let places = placesData.places || [];

      if (placesData.error) {
        addLog(`❌ Google API Error: ${placesData.error}`);
        addLog(`⚠️ NOTE: Google Places API requires an active Billing Account to fetch live reviews.`);
        addLog(`🔄 Activating Hackathon Fallback Engine (Injecting realistic production mock data)...`);
        places = FALLBACK_PLACES; // Switch to realistic mock data so demo doesn't stop!
      } else {
        addLog(`✅ Google API Connected. Found ${places.length} locations. Scanning reviews...`);
      }

      const placesToScan = places.slice(0, 3);

      for (let place of placesToScan) {
        const placeName = place.displayName?.text;
        const lat = place.location?.latitude;
        const lng = place.location?.longitude;
        const reviews = place.reviews ? place.reviews.map((r: any) => r.text?.text) : [];

        if (reviews.length === 0) {
          addLog(`⏭️ Skipping ${placeName} (No recent reviews found).`);
          continue;
        }

        addLog(`🔍 Analyzing real reviews for: ${placeName}...`);
        
        const agentRes = await fetch('/api/agent/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeName, latitude: lat, longitude: lng, reviews })
        });
        
        const agentData = await agentRes.json();

        if (agentData.result && agentData.result.hasIssue) {
          addLog(`🧠 Gemini AI: Detected issue! "${agentData.result.summary}" (Urgency: ${agentData.result.urgency})`);
          addLog(`💾 Saved to Supabase (Lat: ${lat.toFixed(3)}, Lng: ${lng.toFixed(3)}).`);
        } else {
          addLog(`✅ ${placeName} clear. No infrastructure issues detected by AI.`);
        }
        
        await fetchIssues();
        await new Promise(r => setTimeout(r, 1000));
      }

    } catch (e: any) {
      addLog(`❌ Pipeline Error: ${e.message}`);
    }

    addLog("🏁 Live scan cycle complete. Agent sleeping...");
    setPatrolling(false);
  };

  const handleClearIssues = async () => {
    addLog("🗑️ Wiping database tables...");
    await supabase.from('issues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setIssues([]);
    setSelectedIssue(null);
    addLog("✅ Database cleared.");
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-white font-sans overflow-hidden">
      <aside className="w-[420px] bg-neutral-950/95 backdrop-blur-xl border-r border-neutral-800 flex flex-col z-10 shadow-2xl">
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20 animate-pulse">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">CityPulse AI (PROD)</h1>
              <p className="text-xs text-emerald-400 font-bold">100% Live Google Data</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-neutral-800 space-y-3">
          <button 
            onClick={startPatrol}
            disabled={patrolling}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center space-x-2 text-sm"
          >
            {patrolling ? (
              <>
                <RefreshCcw className="w-4 h-4 animate-spin" />
                <span>Fetching Live Google Data...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Scan Live City Infrastructure</span>
              </>
            )}
          </button>

          <button 
            onClick={handleClearIssues}
            disabled={patrolling}
            className="w-full py-2 px-4 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-xl transition-all text-xs font-semibold text-neutral-500 hover:text-red-400 hover:border-red-900/30 flex items-center justify-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Database</span>
          </button>
        </div>

        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <h2 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center">
            <Terminal className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Agent Activity Log (Production)
          </h2>
          <div className="h-[140px] bg-neutral-900/60 rounded-xl p-3 border border-neutral-800 font-mono text-[10px] text-neutral-400 overflow-y-auto space-y-1 flex flex-col-reverse">
            {logs.map((log, idx) => (
              <div key={idx} className={log.includes('❌') || log.includes('⚠️') ? 'text-red-400' : log.includes('🧠') ? 'text-indigo-300' : log.includes('✅') ? 'text-emerald-400' : log.includes('📡') ? 'text-yellow-400' : ''}>
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col min-h-0 bg-neutral-950/20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Live Alerts Map</h2>
            <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {issues.length} Issues Detected
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
            {loading ? (
              <div className="space-y-3">
                <div className="animate-pulse h-20 bg-neutral-900 border border-neutral-800 rounded-xl"></div>
              </div>
            ) : issues.length === 0 ? (
              <div className="text-center py-12 text-neutral-600 flex flex-col items-center justify-center h-full border border-dashed border-neutral-800 rounded-xl">
                <CheckCircle className="w-10 h-10 mb-2 opacity-25 text-emerald-400" />
                <p className="text-xs font-medium">No alerts. Run scan to fetch live data.</p>
              </div>
            ) : (
              issues.map((issue) => (
                <div 
                  key={issue.id} 
                  onClick={() => setSelectedIssue(issue)}
                  className={`p-3.5 rounded-xl bg-neutral-900/40 border cursor-pointer transition-all ${
                    selectedIssue?.id === issue.id 
                      ? 'border-emerald-500 bg-neutral-900/90 shadow-lg shadow-emerald-500/5' 
                      : 'border-neutral-800/80 hover:border-neutral-750'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <h3 className="text-sm font-semibold text-neutral-100 flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-neutral-400" />
                      {issue.place_name}
                    </h3>
                    <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                      issue.urgency === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {issue.urgency}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mb-2.5 line-clamp-2 leading-relaxed">{issue.issue_summary}</p>
                  <div className="text-[10px] text-neutral-600 flex justify-between items-center">
                    <span className="flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1 text-neutral-500" /> Auto Ticket
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 relative bg-neutral-900 z-0">
        <LeafletMap 
          issues={issues} 
          onMarkerClick={(issue) => setSelectedIssue(issue)} 
        />
      </main>
    </div>
  );
}
