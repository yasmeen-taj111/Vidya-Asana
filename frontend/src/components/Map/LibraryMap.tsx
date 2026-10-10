import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Library } from '../../api/types';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, Compass } from 'lucide-react';

interface LibraryMapProps {
  libraries: Library[];
  center?: [number, number];
  zoom?: number;
  selectedLibraryId?: string;
  onSelectLibrary?: (lib: Library) => void;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const createCustomPin = (name: string, isSelected: boolean) => {
  const safeName = escapeHtml(name || 'Library');
  return L.divIcon({
    className: 'custom-library-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 160px;
        pointer-events: auto;
        cursor: pointer;
        user-select: none;
      ">
        <!-- Small Library Name Indicator Badge -->
        <div style="
          background: ${isSelected ? '#E8602C' : 'rgba(255, 255, 255, 0.95)'};
          color: ${isSelected ? '#FFFFFF' : '#0F172A'};
          font-size: 11px;
          font-weight: 700;
          line-height: 1.25;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 3px 9px;
          border-radius: 9999px;
          border: 1.5px solid ${isSelected ? '#C2410C' : '#E2E8F0'};
          box-shadow: 0 3px 10px ${isSelected ? 'rgba(232, 96, 44, 0.45)' : 'rgba(15, 23, 42, 0.16)'};
          white-space: nowrap;
          max-width: 146px;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        ">
          <span style="
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: ${isSelected ? '#FFFFFF' : '#E8602C'};
            display: inline-block;
            flex-shrink: 0;
          "></span>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${safeName}
          </span>
        </div>

        <!-- Droplet Map Pin -->
        <div style="
          background: ${isSelected ? '#E8602C' : '#1E293B'};
          width: 30px;
          height: 30px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px ${isSelected ? 'rgba(232, 96, 44, 0.5)' : 'rgba(15, 23, 42, 0.35)'};
          border: 2px solid white;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        ">
          <div style="
            transform: rotate(45deg);
            color: white;
            font-weight: bold;
            font-size: 13px;
          ">🏛</div>
        </div>
      </div>
    `,
    iconSize: [160, 64],
    iconAnchor: [80, 64],
    popupAnchor: [0, -64],
  });
};

// Component to handle map view updates: centering, bounds auto-fitting, and fly-to
const MapViewController: React.FC<{
  libraries: Library[];
  center?: [number, number];
  zoom?: number;
  selectedLibraryId?: string;
}> = ({ libraries, center, zoom, selectedLibraryId }) => {
  const map = useMap();

  useEffect(() => {
    // 1. If a specific library is selected, fly to it
    if (selectedLibraryId) {
      const selected = libraries.find((l) => l.id === selectedLibraryId);
      if (selected) {
        const lat = Number(selected.latitude);
        const lng = Number(selected.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          map.flyTo([lat, lng], Math.max(map.getZoom(), 15), {
            duration: 1.0,
          });
          return;
        }
      }
    }

    // 2. Otherwise auto-fit bounds for all valid libraries
    const validLibs = libraries.filter((l) => {
      const lat = Number(l.latitude);
      const lng = Number(l.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });

    if (validLibs.length > 1) {
      const bounds = L.latLngBounds(
        validLibs.map((l) => [Number(l.latitude), Number(l.longitude)])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (validLibs.length === 1) {
      map.setView([Number(validLibs[0].latitude), Number(validLibs[0].longitude)], 14);
    } else if (center) {
      map.setView(center, zoom || 12);
    }
  }, [libraries, selectedLibraryId, center, zoom, map]);

  return null;
};

export const LibraryMap: React.FC<LibraryMapProps> = ({
  libraries,
  center = [12.9716, 77.5946], // Default Bengaluru
  zoom = 12,
  selectedLibraryId,
  onSelectLibrary,
}) => {
  const validLibraries = libraries.filter((lib) => {
    const lat = Number(lib.latitude);
    const lng = Number(lib.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  });

  return (
    <div className="w-full h-full min-h-[380px] rounded-3xl overflow-hidden border border-slate-200 shadow-lg relative z-0">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewController
          libraries={validLibraries}
          center={center}
          zoom={zoom}
          selectedLibraryId={selectedLibraryId}
        />

        {validLibraries.map((lib) => {
          const lat = Number(lib.latitude);
          const lng = Number(lib.longitude);
          const isSelected = lib.id === selectedLibraryId;

          return (
            <Marker
              key={lib.id}
              position={[lat, lng]}
              icon={createCustomPin(lib.name, isSelected)}
              eventHandlers={{
                click: () => onSelectLibrary && onSelectLibrary(lib),
              }}
            >
              <Popup offset={[0, -64]}>
                <div className="p-1 space-y-2 text-xs min-w-[200px]">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{lib.name}</h4>
                    <p className="text-slate-600 text-[11px] mt-0.5">{lib.address}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      📍 {lat.toFixed(4)}, {lng.toFixed(4)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-semibold">
                    <span className="text-[11px] text-slate-600">
                      {lib.distanceKm ? `${lib.distanceKm.toFixed(1)} km away` : lib.city}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        lib.isFree
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {lib.isFree ? 'Free Admission' : 'Paid Slots'}
                    </span>
                  </div>

                  <Link
                    to={`/app/libraries/${lib.id}/book`}
                    className="mt-2 block w-full py-2 px-3 bg-primary text-white text-center font-bold rounded-xl text-xs hover:bg-primary-hover shadow-sm transition-all"
                  >
                    View Seats & Book →
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
