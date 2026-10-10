import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Compass } from 'lucide-react';

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  libraryName?: string;
  zoom?: number;
  height?: string;
  className?: string;
}

const customPickerIcon = L.divIcon({
  className: 'custom-picker-pin',
  html: `
    <div style="
      background: #E8602C;
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(232, 96, 44, 0.4);
      border: 3px solid white;
    ">
      <div style="
        transform: rotate(45deg);
        color: white;
        font-weight: bold;
        font-size: 15px;
      ">📍</div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// Helper component to listen to clicks on map and update coordinates
const MapClickHandler: React.FC<{ onPick: (lat: number, lng: number) => void }> = ({ onPick }) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Helper component to re-center map when latitude or longitude changes from geocoding
const MapCenterUpdater: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (!isNaN(lat) && !isNaN(lng)) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 15), {
        duration: 0.8,
      });
    }
  }, [lat, lng, map]);
  return null;
};

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  latitude,
  longitude,
  onChange,
  libraryName = 'Library Location',
  zoom = 15,
  height,
  className = '',
}) => {
  const handleMarkerDragEnd = (e: any) => {
    const marker = e.target;
    if (marker) {
      const position = marker.getLatLng();
      onChange(position.lat, position.lng);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onChange(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('[LocationPicker] Geolocation failed:', err);
        }
      );
    }
  };

  const isValidCoords = !isNaN(latitude) && !isNaN(longitude);
  const centerLat = isValidCoords ? latitude : 12.9716;
  const centerLng = isValidCoords ? longitude : 77.5946;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-1">
        <span className="flex items-center gap-1.5 text-slate-800 font-bold">
          <MapPin className="w-4 h-4 text-primary" /> Pinpoint on Map
        </span>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="text-primary hover:text-primary-hover flex items-center gap-1 text-[11px] font-bold bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg transition-colors"
        >
          <Navigation className="w-3 h-3" />
          <span>Use Current GPS</span>
        </button>
      </div>

      <div
        style={height ? { height } : undefined}
        className={`w-full ${height ? '' : 'h-56 sm:h-64'} rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative z-0 ${className}`}
      >
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={zoom}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onPick={onChange} />
          <MapCenterUpdater lat={centerLat} lng={centerLng} />

          <Marker
            position={[centerLat, centerLng]}
            icon={customPickerIcon}
            draggable={true}
            eventHandlers={{
              dragend: handleMarkerDragEnd,
            }}
          >
            <Popup>
              <div className="text-xs p-1">
                <span className="font-bold block text-slate-900">{libraryName}</span>
                <span className="text-[10px] text-slate-500">Drag this pin or click anywhere to adjust location</span>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Floating guidance overlay */}
        <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-xs py-1.5 px-3 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between text-[11px] z-[400] pointer-events-none">
          <span className="text-slate-600 truncate">
            Click map or drag pin to fine-tune exact entrance
          </span>
          <span className="font-mono font-bold text-slate-800 shrink-0 ml-2">
            {centerLat.toFixed(5)}, {centerLng.toFixed(5)}
          </span>
        </div>
      </div>
    </div>
  );
};
