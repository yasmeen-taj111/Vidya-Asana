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
  Move,
} from 'lucide-react';

interface SeatGridProps {
  grid: FloorGrid;
  selectedSeatId?: string;
  onSelectSeat?: (seat: Seat) => void;
  interactive?: boolean;
  /** When true, BOOKED seats are also clickable (e.g. admin walk-out / release flow) */
  allowOccupiedClick?: boolean;
}

export const SeatGrid: React.FC<SeatGridProps> = ({
  grid,
  selectedSeatId,
  onSelectSeat,
  interactive = true,
  allowOccupiedClick = false,
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
      return 'bg-primary text-white border-primary ring-4 ring-primary/20 shadow-xl scale-105 z-20';
    }

    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-50/90 border-emerald-400 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/15 hover:-translate-y-1 hover:scale-[1.04] cursor-pointer shadow-sm';
      case 'BOOKED':
        return allowOccupiedClick
          ? 'bg-rose-50/90 border-rose-400 text-rose-700 hover:bg-rose-100 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-500/15 hover:-translate-y-1 hover:scale-[1.04] cursor-pointer shadow-sm'
          : 'bg-slate-100/90 border-slate-300 text-slate-400 hover:bg-rose-50/70 hover:border-rose-300/80 hover:text-rose-600 hover:shadow-md hover:shadow-rose-500/10 hover:-translate-y-0.5 hover:scale-[1.02] cursor-not-allowed opacity-80';
      case 'YOURS':
        return 'bg-blue-600 border-blue-700 text-white font-bold ring-2 ring-blue-300 shadow-sm hover:bg-blue-700 hover:scale-[1.04] hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/20 cursor-pointer';
      case 'HELD':
        return 'bg-amber-100/90 border-amber-400 text-amber-800 hover:bg-amber-200/80 hover:border-amber-500 hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 cursor-not-allowed opacity-90';
      case 'MAINTENANCE':
        return 'bg-rose-50 border-rose-300 text-rose-500 hover:bg-rose-100/70 hover:border-rose-400 hover:scale-[1.02] cursor-not-allowed opacity-60 bg-repeating-linear';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:scale-[1.02]';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, cell: GridCell) => {
    if (!interactive || !cell.seat) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const clickable = cell.status === 'AVAILABLE' || (allowOccupiedClick && cell.status === 'BOOKED');
      if (clickable && onSelectSeat) {
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
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={`flex items-center justify-center rounded-2xl text-[10px] uppercase font-bold tracking-wider select-none transition-all duration-300 ease-out ${
                    cell.type === 'AISLE'
                      ? 'bg-slate-100/70 text-slate-400 border border-dashed border-slate-300/80 hover:bg-slate-200/90 hover:border-slate-400 hover:text-slate-700 hover:shadow-md hover:shadow-slate-300/40 hover:-translate-y-0.5 hover:scale-[1.03] cursor-default'
                      : cell.type === 'DOOR'
                      ? 'bg-teal-light text-teal-dark border border-teal/30 hover:bg-teal-light/90 hover:border-teal/60 hover:shadow-md hover:shadow-teal/20 hover:-translate-y-0.5 hover:scale-[1.03] cursor-default'
                      : cell.type === 'WINDOW_WALL'
                      ? 'bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 hover:border-sky-300 hover:shadow-md hover:shadow-sky-300/20 hover:-translate-y-0.5 hover:scale-[1.03] cursor-default'
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
                  {cell.type === 'AISLE' && (
                    <span className="flex items-center gap-1 text-[9px] tracking-wider opacity-80">
                      <Move className="w-3 h-3 opacity-60" /> Aisle
                    </span>
                  )}
                </div>
              );
            }

            const seat = cell.seat!;

            const isClickable =
              interactive &&
              (status === 'AVAILABLE' || (allowOccupiedClick && status === 'BOOKED'));

            return (
              <button
                key={`${cell.row}-${cell.col}`}
                type="button"
                tabIndex={isClickable ? 0 : 0}
                aria-disabled={!isClickable}
                onClick={() => isClickable && onSelectSeat && onSelectSeat(seat)}
                onKeyDown={(e) => handleKeyDown(e, cell)}
                onMouseEnter={() => setHoveredCell(cell)}
                onMouseLeave={() => setHoveredCell(null)}
                aria-selected={isSelected}
                aria-label={`Seat ${seat.label}, Type: ${seat.seatType}, Status: ${status}`}
                className={`relative group flex flex-col items-center justify-between p-2 rounded-2xl border-2 transition-all duration-300 ease-out select-none active:scale-95 active:duration-100 ${getStatusColor(
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
      {hoveredCell && (
        <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs animate-fade-in transition-all">
          {hoveredCell.seat ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 px-2 py-0.5 rounded-lg bg-white border border-slate-200">
                  {hoveredCell.seat.label}
                </span>
                {hoveredCell.status === 'AVAILABLE' ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    FREE / AVAILABLE
                  </span>
                ) : hoveredCell.status === 'BOOKED' ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px]">
                    OCCUPIED / TAKEN
                  </span>
                ) : hoveredCell.status === 'YOURS' ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                    YOUR SEAT
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                    {hoveredCell.status}
                  </span>
                )}
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
            </>
          ) : hoveredCell.type === 'AISLE' ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 flex items-center gap-1.5 shadow-xs">
                  <Move className="w-3.5 h-3.5 text-slate-500" /> Aisle Walkway
                </span>
                <span className="text-slate-600 font-medium">
                  Row {hoveredCell.row + 1}, Col {hoveredCell.col + 1} • Open walking path for desk navigation
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
                CLEAR CORRIDOR
              </span>
            </div>
          ) : hoveredCell.type === 'DOOR' ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="font-bold text-teal-800 px-2.5 py-0.5 rounded-lg bg-white border border-teal/30 flex items-center gap-1.5 shadow-xs">
                  <DoorOpen className="w-3.5 h-3.5 text-teal" /> Main Door
                </span>
                <span className="text-slate-600 font-medium">
                  Row {hoveredCell.row + 1}, Col {hoveredCell.col + 1} • Floor entry & exit access point
                </span>
              </div>
              <span className="text-[10px] font-bold text-teal-700 bg-teal/10 px-2 py-0.5 rounded-md">
                ENTRYWAY
              </span>
            </div>
          ) : hoveredCell.type === 'WINDOW_WALL' ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sky-800 px-2.5 py-0.5 rounded-lg bg-white border border-sky-200 flex items-center gap-1.5 shadow-xs">
                  <Sun className="w-3.5 h-3.5 text-sky-500" /> Window Wall
                </span>
                <span className="text-slate-600 font-medium">
                  Row {hoveredCell.row + 1}, Col {hoveredCell.col + 1} • Exterior glazed wall with natural lighting
                </span>
              </div>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded-md">
                NATURAL LIGHT
              </span>
            </div>
          ) : null}
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
