'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

export default function LeafletMap({ issues, onMarkerClick }: { issues: any[], onMarkerClick: (issue: any) => void }) {
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
        {issues.map((issue) => (
          issue.latitude && issue.longitude && (
            <Marker 
              key={issue.id} 
              position={[issue.latitude, issue.longitude]}
              icon={issue.urgency === 'HIGH' ? redIcon : yellowIcon}
              eventHandlers={{
                click: () => onMarkerClick(issue)
              }}
            >
              <Popup>
                <div className="font-sans">
                  <h3 className="font-bold text-gray-900">{issue.place_name}</h3>
                  <p className="text-xs text-gray-600 mt-1">{issue.issue_summary}</p>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
}
