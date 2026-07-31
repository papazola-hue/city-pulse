'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import { EVENT_DATA } from '@/data/mockEvents';
import { Radar, Flame, MapPin, Map as MapIcon, Compass, Users, Clock, Search, Activity, AlertTriangle, CheckCircle, Play, RefreshCcw, Terminal, Trash2 } from 'lucide-react';

const LeafletMap = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-400">
      <RefreshCcw className="w-8 h-8 animate-spin mr-2" /> Loading Map Engine...
    </div>
  ),
});

const CATEGORIES = ["All", "Entertainment", "Music", "Food", "Networking", "Sports", "Promo", "Art", "Community", "Shopping"];

// Custom locale-agnostic number formatter
const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

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
  const [activeMode, setActiveMode] = useState<'events' | 'infra'>('events');
  const [isMounted, setIsMounted] = useState(false);

  // --- EVENT RADAR STATE ---
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEvents, setFilteredEvents] = useState(EVENT_DATA);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  // --- INFRASTRUCTURE STATE ---
  const [issues, setIssues] = useState<any[]>([]);
  const [loadingInfra, setLoadingInfra] = useState(true);
  const [patrolling, setPatrolling] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>(["🤖 PRODUCTION MODE: Live Ingestion Pipeline Ready."]);

  useEffect(() => {
    setIsMounted(true);
    fetchIssues();
  }, []);

  // Filter Logic Events
  useEffect(() => {
    let result = EVENT_DATA;
    if (activeCategory !== "All") {
      result = result.filter(e => e.category === activeCategory);
    }
    // Only apply manual text filter if AI is not active
    if (searchQuery && !aiMessage && !isAiThinking) {
      result = result.filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        e.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredEvents(result);
  }, [activeCategory, searchQuery, aiMessage, isAiThinking]);

  // Infra Logic
  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [`[${time}] ${message}`, ...prev]);
  };

  const fetchIssues = async () => {
    setLoadingInfra(true);
    const { data } = await supabase.from('issues').select('*').order('created_at', { ascending: false });
    if (data) setIssues(data);
    setLoadingInfra(false);
  };

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
        addLog(`🔄 Activating Hackathon Fallback Engine...`);
        places = FALLBACK_PLACES;
      }

      const placesToScan = places.slice(0, 3);

      for (let place of placesToScan) {
        const placeName = place.displayName?.text;
        const lat = place.location?.latitude;
        const lng = place.location?.longitude;
        const reviews = place.reviews ? place.reviews.map((r: any) => r.text?.text) : [];

        if (reviews.length === 0) continue;

        addLog(`🔍 Analyzing real reviews for: ${placeName}...`);
        
        const agentRes = await fetch('/api/agent/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeName, latitude: lat, longitude: lng, reviews })
        });
        
        const agentData = await agentRes.json();

        if (agentData.result && agentData.result.hasIssue) {
          addLog(`🧠 Gemini AI: Detected issue! "${agentData.result.summary}"`);
        } else {
          addLog(`✅ ${placeName} clear. No infrastructure issues detected.`);
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
    <div className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-[480px] bg-neutral-900/40 backdrop-blur-2xl border-r border-white/5 flex flex-col z-10 shadow-2xl relative">
        
        {/* Toggle Nav */}
        <div className="p-4 border-b border-white/5 bg-black/40 flex gap-3">
          <button 
             onClick={() => setActiveMode('events')}
             className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeMode === 'events' ? 'bg-gradient-to-r from-pink-600 to-orange-500 shadow-lg shadow-pink-500/20' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`}
          >
            <Radar className="w-4 h-4" /> Event Radar
          </button>
          <button 
             onClick={() => setActiveMode('infra')}
             className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeMode === 'infra' ? 'bg-gradient-to-r from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`}
          >
            <AlertTriangle className="w-4 h-4" /> Infrastructure
          </button>
        </div>

        {/* ================= EVENTS SIDEBAR ================= */}
        {activeMode === 'events' && (
          <>
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2.5 bg-gradient-to-tr from-pink-600 to-orange-500 rounded-xl shadow-lg shadow-pink-500/20">
                  <Radar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">City Pulse</h1>
                  <p className="text-xs text-pink-400 font-bold uppercase tracking-widest mt-1">HyperLocal Event Radar</p>
                </div>
              </div>

              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-neutral-500" />
                </div>
                <input
                  type="text"
                  placeholder="Ask AI (e.g. 'cari event musik terdekat')..."
                  className="w-full bg-black/50 border border-pink-500/30 rounded-xl py-2.5 pl-10 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/70 transition-all placeholder:text-neutral-500 text-white"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (aiMessage) setAiMessage(null);
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      setIsAiThinking(true);
                      setAiMessage(null);
                      try {
                        const res = await fetch('/api/chat', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ message: searchQuery })
                        });
                        const data = await res.json();
                        if (data.success && data.result) {
                          setAiMessage(data.result.reply);
                          if (data.result.eventId) {
                            const found = EVENT_DATA.find(ev => ev.id === data.result.eventId);
                            if (found) {
                              setSelectedEvent(found);
                              if (activeCategory !== 'All' && found.category !== activeCategory) {
                                setActiveCategory('All');
                              }
                            }
                          }
                        }
                      } catch (err) {
                        console.error(err);
                      }
                      setIsAiThinking(false);
                    }
                  }}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <div className={`w-2 h-2 rounded-full ${isAiThinking ? 'bg-pink-500 animate-ping' : 'bg-pink-500/20'}`} title="AI Ready"></div>
                </div>
              </div>

              {aiMessage && (
                <div className="mb-4 p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-xs text-pink-100 flex items-start space-x-2 animate-in fade-in slide-in-from-top-2">
                  <div className="p-1 bg-pink-500/20 rounded-md">
                    <Radar className="w-3 h-3 text-pink-400" />
                  </div>
                  <p className="flex-1 leading-relaxed">{aiMessage}</p>
                </div>
              )}

              <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      activeCategory === cat ? 'bg-white text-black shadow-md' : 'bg-white/5 text-neutral-400 hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                  <Compass className="w-12 h-12 mb-3 opacity-20" />
                  <p>No events found on radar.</p>
                </div>
              ) : (
                filteredEvents.map(event => (
                  <div 
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                      selectedEvent?.id === event.id ? 'bg-gradient-to-br from-pink-900/30 to-orange-900/20 border-pink-500/50' : 'bg-black/40 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-pink-500 bg-pink-500/10 px-2 py-0.5 rounded-md">
                        {event.category}
                      </span>
                      {event.trend === 'hot' && (
                        <span className="flex items-center text-[10px] text-orange-400 font-bold bg-orange-400/10 px-2 py-0.5 rounded-md animate-pulse">
                          <Flame className="w-3 h-3 mr-1" /> Trending
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base text-white leading-tight mb-3">{event.title}</h3>
                    
                    <div className="grid grid-cols-2 gap-y-2 text-xs text-neutral-400">
                      <div className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-neutral-500" /> {event.time}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-neutral-500" /> {event.distance}
                      </div>
                      <div className="flex items-center col-span-2">
                        <Users className="w-3.5 h-3.5 mr-1.5 text-neutral-500" /> {isMounted ? formatNumber(event.attendees) : event.attendees} interested
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ================= INFRASTRUCTURE SIDEBAR ================= */}
        {activeMode === 'infra' && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-neutral-800">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">Infrastructure AI</h1>
                  <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mt-1">Live Google Scan</p>
                </div>
              </div>
              
              <div className="space-y-3">
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
                      <span>Scan City Infrastructure</span>
                    </>
                  )}
                </button>

                <button 
                  onClick={handleClearIssues}
                  disabled={patrolling}
                  className="w-full py-2 px-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-all text-xs font-semibold text-neutral-400 hover:text-red-400 flex items-center justify-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Database</span>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950">
              <h2 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center">
                <Terminal className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> AI Agent Activity Log
              </h2>
              <div className="h-[140px] bg-black/60 rounded-xl p-3 border border-neutral-800 font-mono text-[10px] text-neutral-400 overflow-y-auto space-y-1 flex flex-col-reverse">
                {logs.map((log, idx) => (
                  <div key={idx} className={log.includes('❌') ? 'text-red-400' : log.includes('🧠') ? 'text-indigo-300' : log.includes('✅') ? 'text-emerald-400' : log.includes('📡') ? 'text-yellow-400' : ''}>
                    {log}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-neutral-950 p-6">
              <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1.5 text-orange-400" /> Active Reports
              </h2>
              {loadingInfra ? (
                <div className="text-center text-neutral-500 text-sm py-10">Syncing with database...</div>
              ) : issues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-500 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
                  <CheckCircle className="w-8 h-8 mb-2 text-neutral-600" />
                  <p className="text-sm">City is clear.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {issues.map((issue) => (
                    <div 
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedIssue?.id === issue.id ? 'bg-neutral-800 border-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${issue.urgency === 'High' ? 'bg-red-500/20 text-red-400' : issue.urgency === 'Medium' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {issue.urgency}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-neutral-200 mb-1">{issue.location_name}</h3>
                      <p className="text-xs text-neutral-400 line-clamp-2">{issue.issue_summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </aside>

      {/* Main Content */}
      <main className="flex-1 relative bg-[#050505] flex flex-col">
        {activeMode === 'events' ? (
          <div className="p-8 flex-1 flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.03)_0%,rgba(0,0,0,0)_100%)] pointer-events-none"></div>
            
            {/* Top Bar Stats */}
            <div className="flex justify-between items-center bg-neutral-900/60 border border-white/10 p-4 rounded-2xl mb-6 backdrop-blur-md z-10">
              <div className="flex items-center">
                <MapIcon className="w-5 h-5 text-neutral-400 mr-2" />
                <span className="font-semibold">Jakarta Central District</span>
              </div>
              <div className="flex space-x-6 text-sm font-bold">
                <div className="text-center px-4 border-r border-white/10">
                  <div className="text-pink-500 text-xl">{filteredEvents.length}</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Active Events</div>
                </div>
                <div className="text-center px-4">
                  <div className="text-orange-400 text-xl">
                    {isMounted ? formatNumber(filteredEvents.reduce((acc, curr) => acc + curr.attendees, 0)) : '0'}
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Total Crowd</div>
                </div>
              </div>
            </div>

            {/* Map Background + Radar Overlay */}
            <div className="flex-1 bg-black/40 border border-white/10 rounded-3xl relative overflow-hidden flex items-center justify-center">
              
              {/* The Real Leaflet Map */}
              <div className="absolute inset-0 z-0">
                <LeafletMap 
                  issues={[]} 
                  events={filteredEvents}
                  selectedEventId={selectedEvent?.id}
                  onMarkerClick={() => {}}
                  onEventClick={(event) => {
                    setSelectedEvent(event);
                  }}
                />
              </div>

              {/* Selected Detail Overlay */}
              {selectedEvent && (
                <div className="absolute bottom-6 right-6 w-[350px] bg-neutral-900/90 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 z-20">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-pink-500 bg-pink-500/10 px-2 py-0.5 rounded-md">
                      {selectedEvent.category}
                    </span>
                    <button onClick={() => setSelectedEvent(null)} className="text-neutral-500 hover:text-white">✕</button>
                  </div>
                  <h2 className="text-xl font-bold mb-2 text-white">{selectedEvent.title}</h2>
                  <div className="flex items-center text-neutral-400 text-sm mb-4">
                    <MapPin className="w-4 h-4 mr-1 text-pink-500" /> {selectedEvent.location}
                  </div>
                  
                  <div className="space-y-3 mb-6 bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Time</span>
                      <span className="font-semibold text-white">{selectedEvent.time}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Distance</span>
                      <span className="font-semibold text-white">{selectedEvent.distance}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Crowd</span>
                      <span className="font-semibold text-orange-400">{isMounted ? formatNumber(selectedEvent.attendees) : selectedEvent.attendees} interested</span>
                    </div>
                  </div>

                  <button className="w-full py-3 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 rounded-xl font-bold shadow-lg shadow-pink-500/25 transition-all text-xs">
                    Set Event Alert
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 w-full h-full relative z-0 p-8 flex flex-col">
            <div className="flex justify-between items-center bg-neutral-900/80 border border-emerald-500/20 p-4 rounded-2xl mb-6 backdrop-blur-md z-10 shadow-lg shadow-emerald-500/5">
              <div className="flex items-center">
                <MapIcon className="w-5 h-5 text-emerald-400 mr-2" />
                <span className="font-semibold text-emerald-50">Jakarta Operations Center</span>
              </div>
              <div className="flex space-x-6 text-sm font-bold">
                <div className="text-center px-4 border-r border-white/10">
                  <div className="text-red-400 text-xl">{issues.filter(i => i.urgency==='High').length}</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Critical</div>
                </div>
                <div className="text-center px-4">
                  <div className="text-emerald-500 text-xl">{issues.length}</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Total Active</div>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-black/40 border border-emerald-500/10 rounded-3xl relative overflow-hidden flex items-center justify-center shadow-inner">
               <div className="absolute inset-0 z-0">
                 <LeafletMap 
                   issues={issues} 
                   onMarkerClick={(issue) => {
                     setActiveMode('infra');
                     setSelectedIssue(issue);
                   }}
                 />
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
