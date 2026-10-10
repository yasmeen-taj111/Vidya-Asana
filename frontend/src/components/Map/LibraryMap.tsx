import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Library } from '../../api/types';
import { Link } from 'react-router-dom';
import { Navigation, MapPin } from 'lucide-react';

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
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 13px;
        ">🏛</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

export const LibraryMap: React.FC<LibraryMapProps> = ({
  libraries,
  center = [12.9716, 77.5946], // Default Bengaluru
  zoom = 12,
  selectedLibraryId,
  onSelectLibrary,
}) => {
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

        {libraries.map((lib) => {
          const isSelected = lib.id === selectedLibraryId;
          return (
            <Marker
              key={lib.id}
              position={[lib.latitude, lib.longitude]}
              icon={createCustomPin(isSelected)}
              eventHandlers={{
                click: () => onSelectLibrary && onSelectLibrary(lib),
              }}
            >
              <Popup>
                <div className="p-1 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 text-sm">{lib.name}</h4>
                  <p className="text-slate-600">{lib.address}</p>
                  <div className="flex items-center gap-2 pt-1 font-semibold text-primary">
                    {lib.distanceKm && <span>{lib.distanceKm} km away</span>}
                    {lib.isFree ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        🟢 Free Admission
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        💳 Paid Passes
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/app/libraries/${lib.id}/book`}
                    className="mt-2 block w-full py-1.5 px-3 bg-primary text-white text-center font-bold rounded-lg text-[11px] hover:bg-primary-hover transition-colors"
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
