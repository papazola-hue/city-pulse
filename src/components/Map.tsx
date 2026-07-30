'use client';

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Custom red icon for HIGH urgency
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom yellow icon for MEDIUM urgency
const yellowIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom HTML Icons for Events (Radar Style)
const createEventIcon = (isHot: boolean, isSelected: boolean) => {
  return new L.divIcon({
    className: 'bg-transparent border-0',
    html: `
      <div class="relative flex items-center justify-center ${isSelected ? 'scale-125' : 'hover:scale-110'} transition-all">
        ${isHot ? '<div class="absolute w-8 h-8 bg-orange-500 rounded-full animate-ping opacity-35" style="top:-8px; left:-8px;"></div>' : ''}
        <div class="w-4 h-4 rounded-full border-2 ${isSelected ? 'bg-pink-500 border-white shadow-lg shadow-pink-500/50' : 'bg-neutral-600 border-neutral-400'}"></div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

// User Location Icon (Radar Center)
const userIcon = new L.divIcon({
  className: 'bg-transparent border-0',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-12 h-12 bg-blue-500 rounded-full animate-pulse opacity-20"></div>
      <div class="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

export default function LeafletMap({ 
  issues, 
  events,
  onMarkerClick,
  onEventClick,
  selectedEventId
}: { 
  issues: any[], 
  events?: any[],
  onMarkerClick: (issue: any) => void,
  onEventClick?: (event: any) => void,
  selectedEventId?: number
}) {
  // Using a dark CartoDB map tile for a premium dark-mode look
  const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const attribution = '&copy; OpenStreetMap contributors &copy; CARTO';

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0 }}>
      <MapContainer 
        center={[-6.2088, 106.8456]} 
        zoom={12} 
        style={{ height: '100%', width: '100%', background: '#171717' }}
        zoomControl={false}
      >
        <TileLayer
          url={darkTileUrl}
          attribution={attribution}
        />
        
        {/* Render Geographical Radar Rings if in Event Radar mode */}
        {events && (
          <>
            {/* Center User Location */}
            <Marker position={[-6.2088, 106.8456]} icon={userIcon}>
              <Popup>
                <div className="font-sans font-bold text-blue-600">📍 Lokasi Anda (Pusat Radar)</div>
              </Popup>
            </Marker>

            {/* Radar Rings */}
            <Circle center={[-6.2088, 106.8456]} radius={2000} pathOptions={{ color: '#ec4899', weight: 1, opacity: 0.3, fillColor: '#ec4899', fillOpacity: 0.05 }} />
            <Circle center={[-6.2088, 106.8456]} radius={4000} pathOptions={{ color: '#ec4899', weight: 1, opacity: 0.15, fill: false }} />
            <Circle center={[-6.2088, 106.8456]} radius={6000} pathOptions={{ color: '#ec4899', weight: 1, opacity: 0.1, fill: false }} />
            <Circle center={[-6.2088, 106.8456]} radius={8000} pathOptions={{ color: '#ec4899', weight: 1, opacity: 0.05, fill: false }} />
          </>
        )}

        {issues.map((issue) => (
          issue.latitude && issue.longitude && (
            <Marker 
              key={`issue-${issue.id}`} 
              position={[issue.latitude, issue.longitude]}
              icon={issue.urgency === 'HIGH' ? redIcon : yellowIcon}
              eventHandlers={{
                click: () => onMarkerClick(issue)
              }}
            >
              <Popup>
                <div className="font-sans">
                  <h3 className="font-bold text-red-600">🚨 {issue.place_name}</h3>
                  <p className="text-xs text-gray-600 mt-1">{issue.issue_summary}</p>
                </div>
              </Popup>
            </Marker>
          )
        ))}

        {events && events.map((event) => (
          event.lat && event.lng && (
            <Marker 
              key={`event-${event.id}`} 
              position={[event.lat, event.lng]}
              icon={createEventIcon(event.trend === 'hot', selectedEventId === event.id)}
              eventHandlers={{
                click: () => {
                  if (onEventClick) onEventClick(event);
                }
              }}
            >
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
}
