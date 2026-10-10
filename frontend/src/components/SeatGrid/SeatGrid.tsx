import React, { useState } from 'react';
import {
  FloorGrid,
  GridCell,
  Seat,
  SeatStatus,
  SeatType,
  Facing,
} from '../../api/types';
import {
  User,
  Users,
  Accessibility,
  Monitor,
  Compass,
  Zap,
  VolumeX,
  Sun,
  DoorOpen,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
} from 'lucide-react';

interface SeatGridProps {
  grid: FloorGrid;
  selectedSeatId?: string;
  onSelectSeat?: (seat: Seat) => void;
  interactive?: boolean;
}

export const SeatGrid: React.FC<SeatGridProps> = ({
  grid,
  selectedSeatId,
  onSelectSeat,
  interactive = true,
}) => {
  const [zoom, setZoom] = useState(1);
  const [hoveredCell, setHoveredCell] = useState<GridCell | null>(null);

  const getSeatTypeIcon = (type: SeatType) => {
    switch (type) {
      case 'COMPUTER':
        return <Monitor className="w-3.5 h-3.5" />;
      case 'GROUP':
        return <Users className="w-3.5 h-3.5" />;
      case 'ACCESSIBLE':
        return <Accessibility className="w-3.5 h-3.5" />;
      case 'INDIVIDUAL':
      default:
        return <User className="w-3.5 h-3.5" />;
    }
  };

  const getFacingArrow = (facing: Facing) => {
    switch (facing) {
      case 'N':
        return '↑';
      case 'E':
        return '→';
      case 'S':
        return '↓';
      case 'W':
        return '←';
    }
  };

  const getStatusColor = (status: SeatStatus = 'AVAILABLE', isSelected: boolean) => {
    if (isSelected) {
      return 'bg-primary text-white border-primary ring-4 ring-primary/20 shadow-lg scale-105 z-20';
    }

    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-500 cursor-pointer shadow-sm';
      case 'BOOKED':
        return 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed opacity-75';
      case 'YOURS':
        return 'bg-blue-600 border-blue-700 text-white font-bold ring-2 ring-blue-300 shadow-sm';
      case 'HELD':
        return 'bg-amber-100 border-amber-400 text-amber-800 cursor-not-allowed opacity-90';
      case 'MAINTENANCE':
        return 'bg-rose-50 border-rose-300 text-rose-500 cursor-not-allowed opacity-60 bg-repeating-linear';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, cell: GridCell) => {
    if (!interactive || !cell.seat) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (cell.status === 'AVAILABLE' && onSelectSeat) {
        onSelectSeat(cell.seat);
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl overflow-hidden relative">
      {/* Grid Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <span>{grid.label}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
              {grid.rows} × {grid.cols} Layout
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select an available seat to configure your reservation.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono px-2 text-slate-600">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid View Area */}
      <div className="overflow-auto max-h-[520px] p-4 flex justify-center items-center bg-slate-50/70 rounded-2xl border border-slate-100">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
            display: 'grid',
            gridTemplateRows: `repeat(${grid.rows}, minmax(4rem, 1fr))`,
            gridTemplateColumns: `repeat(${grid.cols}, minmax(4.5rem, 1fr))`,
            gap: '0.625rem',
          }}
          className="p-2"
          role="grid"
          aria-label={`${grid.label} interactive seat grid`}
        >
          {grid.cells.map((cell) => {
            const isSeat = cell.type === 'SEAT' && !!cell.seat;
            const isSelected = isSeat && cell.seat?.id === selectedSeatId;
            const status = cell.status || 'AVAILABLE';

            if (!isSeat) {
              return (
                <div
                  key={`${cell.row}-${cell.col}`}
                  className={`flex items-center justify-center rounded-xl text-[10px] uppercase font-bold tracking-wider transition-colors ${
                    cell.type === 'AISLE'
                      ? 'bg-slate-200/50 text-slate-400 border border-dashed border-slate-300'
                      : cell.type === 'DOOR'
                      ? 'bg-teal-light text-teal-dark border border-teal/30'
                      : cell.type === 'WINDOW_WALL'
                      ? 'bg-sky-50 text-sky-600 border border-sky-200'
                      : 'bg-transparent'
                  }`}
                  role="gridcell"
                  aria-label={cell.type}
                >
                  {cell.type === 'DOOR' && (
                    <span className="flex items-center gap-1">
                      <DoorOpen className="w-3.5 h-3.5" /> Door
                    </span>
                  )}
                  {cell.type === 'WINDOW_WALL' && (
                    <span className="flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5" /> Window
                    </span>
                  )}
                  {cell.type === 'AISLE' && 'Aisle'}
                </div>
              );
            }

            const seat = cell.seat!;

            return (
              <button
                key={`${cell.row}-${cell.col}`}
                type="button"
                tabIndex={status === 'AVAILABLE' ? 0 : -1}
                disabled={!interactive || status !== 'AVAILABLE'}
                onClick={() => onSelectSeat && onSelectSeat(seat)}
                onKeyDown={(e) => handleKeyDown(e, cell)}
                onMouseEnter={() => setHoveredCell(cell)}
                onMouseLeave={() => setHoveredCell(null)}
                aria-selected={isSelected}
                aria-label={`Seat ${seat.label}, Type: ${seat.seatType}, Status: ${status}`}
                className={`relative group flex flex-col items-center justify-between p-2 rounded-2xl border-2 transition-all select-none ${getStatusColor(
                  status,
                  isSelected
                )}`}
              >
                {/* Header row: facing arrow & type icon */}
                <div className="w-full flex items-center justify-between text-[11px] opacity-80 leading-none">
                  <span title={`Facing ${seat.facing}`} className="font-mono font-bold">
                    {getFacingArrow(seat.facing)}
                  </span>
                  <span>{getSeatTypeIcon(seat.seatType)}</span>
                </div>

                {/* Seat Label */}
                <div className="font-extrabold text-xs tracking-tight my-0.5">
                  {seat.label}
                </div>

                {/* Footer status text / icon */}
                <div className="text-[9px] uppercase font-bold tracking-wider leading-none">
                  {isSelected ? (
                    <span className="flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Picked
                    </span>
                  ) : status === 'YOURS' ? (
                    'Yours'
                  ) : status === 'AVAILABLE' ? (
                    'Free'
                  ) : status === 'HELD' ? (
                    'Held'
                  ) : (
                    'Taken'
                  )}
                </div>

                {/* Subtle attribute indicator dots */}
                <div className="absolute top-1 right-1 flex gap-0.5">
                  {seat.attributes.window && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" title="Window Desk" />
                  )}
                  {seat.attributes.powerOutlet && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Power Socket" />
                  )}
                  {seat.attributes.quietZone && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal" title="Quiet Zone" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hover Info Tooltip Preview */}
      {hoveredCell?.seat && (
        <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 px-2 py-0.5 rounded-lg bg-white border border-slate-200">
              {hoveredCell.seat.label}
            </span>
            <span className="text-slate-600 font-medium">
              {hoveredCell.seat.seatType} • Facing {hoveredCell.seat.facing}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-600">
            {hoveredCell.seat.attributes.window && (
              <span className="flex items-center gap-1 text-sky-700">
                <Sun className="w-3.5 h-3.5" /> Window
              </span>
            )}
            {hoveredCell.seat.attributes.powerOutlet && (
              <span className="flex items-center gap-1 text-amber-700">
                <Zap className="w-3.5 h-3.5" /> Power Outlet
              </span>
            )}
            {hoveredCell.seat.attributes.quietZone && (
              <span className="flex items-center gap-1 text-teal-dark">
                <VolumeX className="w-3.5 h-3.5" /> Silent Zone
              </span>
            )}
            {hoveredCell.seat.attributes.nearDoor && (
              <span className="flex items-center gap-1 text-slate-600">
                <DoorOpen className="w-3.5 h-3.5" /> Near Door
              </span>
            )}
          </div>
        </div>
      )}

      {/* Status Legend */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-100 border border-emerald-400" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-300" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-blue-600 border border-blue-700" />
            <span>Your Seat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-amber-100 border border-amber-400" />
            <span>Held (Waitlist)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-rose-100 border border-rose-300" />
            <span>Maintenance</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Use Arrow Keys + Enter to navigate
        </div>
      </div>
    </div>
  );
};
