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

const createCustomPin = (isSelected: boolean) =>
  L.divIcon({
    className: 'custom-pin',
    html: `
      <div style="
        background: ${isSelected ? '#E8602C' : '#2B5BE0'};
        width: ${isSelected ? '38px' : '32px'};
        height: ${isSelected ? '38px' : '32px'};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px ${isSelected ? 'rgba(232, 96, 44, 0.45)' : 'rgba(43, 91, 224, 0.35)'};
        border: 2.5px solid white;
        transition: all 0.2s ease-in-out;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: ${isSelected ? '15px' : '13px'};
        ">🏛</div>
      </div>
    `,
    iconSize: isSelected ? [38, 38] : [32, 32],
    iconAnchor: isSelected ? [19, 38] : [16, 32],
    popupAnchor: isSelected ? [0, -38] : [0, -32],
  });

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
              icon={createCustomPin(isSelected)}
              eventHandlers={{
                click: () => onSelectLibrary && onSelectLibrary(lib),
              }}
            >
              <Tooltip direction="top" offset={[0, -32]} opacity={0.95}>
                <span className="font-bold text-xs">{lib.name}</span>
              </Tooltip>

              <Popup>
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
