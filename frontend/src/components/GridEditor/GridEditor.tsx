import React, { useState, useEffect } from 'react';
import {
  FloorGrid,
  GridCell,
  Seat,
  CellType,
  SeatType,
  Facing,
} from '../../api/types';
import { adminApi, LayoutUpdateCell, GenerateFloorSpec } from '../../api/admin';
import { useUiStore } from '../../store/uiStore';
import {
  Save,
  RotateCcw,
  RotateCw,
  Plus,
  Trash2,
  Sliders,
  Armchair,
  DoorOpen,
  Sun,
  Eraser,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Move,
} from 'lucide-react';

interface GridEditorProps {
  initialGrids: FloorGrid[];
}

export const GridEditor: React.FC<GridEditorProps> = ({ initialGrids }) => {
  const [grids, setGrids] = useState<FloorGrid[]>(initialGrids);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [selectedCellPos, setSelectedCellPos] = useState<{ row: number; col: number } | null>(null);
  const [activeTool, setActiveTool] = useState<CellType | 'ERASE'>('SEAT');
  const [history, setHistory] = useState<FloorGrid[][]>([initialGrids]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Generator modal state
  const [showGenerator, setShowGenerator] = useState(false);
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [newFloorData, setNewFloorData] = useState({ number: '', label: '' });
  const [generatorFloorSpecs, setGeneratorFloorSpecs] = useState<GenerateFloorSpec[]>([
    {
      floorNumber: 1,
      label: 'Floor 1 - Main Study Hall',
      rows: 5,
      cols: 6,
      counts: { INDIVIDUAL: 18, GROUP: 4, ACCESSIBLE: 2, COMPUTER: 6 },
    },
  ]);

  const { addToast } = useUiStore();
  const currentGrid = grids[activeFloorIndex] || grids[0];

  const pushState = (newGrids: FloorGrid[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(JSON.parse(JSON.stringify(newGrids)));
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setGrids(newGrids);
    setHasUnsavedChanges(true);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setGrids(JSON.parse(JSON.stringify(history[newIndex])));
      setHasUnsavedChanges(true);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setGrids(JSON.parse(JSON.stringify(history[newIndex])));
      setHasUnsavedChanges(true);
    }
  };

  const handleCellClick = (row: number, col: number) => {
    setSelectedCellPos({ row, col });

    // If a tool other than default select is clicked, apply it
    if (activeTool === 'ERASE') {
      const updated = JSON.parse(JSON.stringify(grids)) as FloorGrid[];
      const cell = updated[activeFloorIndex].cells.find((c) => c.row === row && c.col === col);
      if (cell) {
        cell.type = 'EMPTY';
        delete cell.seat;
        pushState(updated);
      }
    } else if (activeTool !== 'SEAT') {
      const updated = JSON.parse(JSON.stringify(grids)) as FloorGrid[];
      const cell = updated[activeFloorIndex].cells.find((c) => c.row === row && c.col === col);
      if (cell) {
        cell.type = activeTool;
        delete cell.seat;
        pushState(updated);
      }
    }
  };

  const updateSelectedSeat = (patch: Partial<Seat>) => {
    if (!selectedCellPos) return;
    const updated = JSON.parse(JSON.stringify(grids)) as FloorGrid[];
    const cell = updated[activeFloorIndex].cells.find(
      (c) => c.row === selectedCellPos.row && c.col === selectedCellPos.col
    );

    if (cell && cell.seat) {
      Object.assign(cell.seat, patch);
      pushState(updated);
    }
  };

  const updateSelectedCellType = (type: CellType) => {
    if (!selectedCellPos) return;
    const updated = JSON.parse(JSON.stringify(grids)) as FloorGrid[];
    const cell = updated[activeFloorIndex].cells.find(
      (c) => c.row === selectedCellPos.row && c.col === selectedCellPos.col
    );

    if (cell) {
      cell.type = type;
      if (type === 'SEAT' && !cell.seat) {
        cell.seat = {
          id: `seat-${currentGrid.floorId}-${cell.row}-${cell.col}`,
          floorId: currentGrid.floorId,
          label: `F${currentGrid.floorNumber}-${String.fromCharCode(65 + cell.row)}${cell.col + 1}`,
          seatType: 'INDIVIDUAL',
          facing: 'N',
          attributes: { window: false, powerOutlet: false, quietZone: false, nearDoor: false },
          isActive: true,
        };
      } else if (type !== 'SEAT') {
        delete cell.seat;
      }
      pushState(updated);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payloadCells: LayoutUpdateCell[] = currentGrid.cells.map((c) => ({
        row: c.row,
        col: c.col,
        type: c.type,
        seat: c.seat
          ? {
              id: c.seat.id,
              label: c.seat.label,
              seatType: c.seat.seatType,
              facing: c.seat.facing,
              attributes: c.seat.attributes,
              groupCapacity: c.seat.groupCapacity,
            }
          : undefined,
      }));

      let floorId = currentGrid.floorId;
      if (floorId.startsWith('temp-')) {
        const res = await adminApi.createFloor({
          floorNumber: currentGrid.floorNumber,
          label: currentGrid.label,
          rows: currentGrid.rows,
          cols: currentGrid.cols,
        }) as any;
        floorId = res.id;
        
        // Update the grid ID in state so subsequent saves work without recreating
        const updatedGrids = [...grids];
        updatedGrids[activeFloorIndex].floorId = floorId;
        setGrids(updatedGrids);
      }

      await adminApi.updateFloorLayout(floorId, {
        rows: currentGrid.rows,
        cols: currentGrid.cols,
        cells: payloadCells,
      });

      setHasUnsavedChanges(false);
      addToast({
        type: 'success',
        title: 'Layout Saved',
        message: `Successfully saved floor grid for ${currentGrid.label}`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not update layout. Please ensure no reserved seats were deleted.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateGrid = async () => {
    // Validate
    for (const spec of generatorFloorSpecs) {
      const totalSeats = Object.values(spec.counts).reduce((a, b) => a + b, 0);
      if (totalSeats > spec.rows * spec.cols) {
        addToast({
          type: 'error',
          title: 'Validation Error',
          message: `Floor ${spec.floorNumber}: Total seats (${totalSeats}) exceeds grid cells (${spec.rows * spec.cols}).`,
        });
        return;
      }
    }

    try {
      const generated = await adminApi.generateGrid(generatorFloorSpecs);
      setGrids(generated);
      setHistory([generated]);
      setHistoryIndex(0);
      setActiveFloorIndex(0);
      setShowGenerator(false);
      addToast({
        type: 'success',
        title: 'Grids Generated',
        message: `Auto-generated layout across ${generated.length} floor(s).`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Generation Failed',
        message: 'Could not generate floor grid.',
      });
    }
  };

  const handleAddFloor = () => {
    if (!newFloorData.number || !newFloorData.label) {
      addToast({ type: 'error', title: 'Error', message: 'Please fill all fields.' });
      return;
    }
    const num = parseInt(newFloorData.number);
    if (isNaN(num)) return;
    
    if (grids.some((g) => g.floorNumber === num)) {
      addToast({ type: 'error', title: 'Duplicate Floor', message: `Floor number ${num} already exists.` });
      return;
    }
    
    if (grids.some((g) => g.label.trim().toLowerCase() === newFloorData.label.trim().toLowerCase())) {
      addToast({ type: 'error', title: 'Duplicate Name', message: `Floor name "${newFloorData.label}" already exists.` });
      return;
    }
    
    const newFloor: FloorGrid = {
      floorId: `temp-${Date.now()}`,
      floorNumber: num,
      label: newFloorData.label,
      rows: 5,
      cols: 6,
      cells: []
    };
    
    for(let r=0; r<5; r++) {
      for(let c=0; c<6; c++) {
        newFloor.cells.push({ row: r, col: c, type: 'EMPTY' });
      }
    }
    
    const updatedGrids = [...grids, newFloor];
    pushState(updatedGrids);
    setActiveFloorIndex(updatedGrids.length - 1);
    setShowAddFloor(false);
    setNewFloorData({ number: '', label: '' });
  };

  const handleRemoveFloor = async () => {
    if (grids.length <= 1) {
      addToast({ type: 'error', title: 'Cannot Remove', message: 'You must have at least one floor.' });
      return;
    }

    const floorToRemove = currentGrid;
    const confirmed = window.confirm(
      `Are you sure you want to remove "${floorToRemove.label}"? This will delete all seats and layout data for this floor.`
    );
    if (!confirmed) return;

    try {
      // Delete from backend if it's a persisted floor
      if (!floorToRemove.floorId.startsWith('temp-')) {
        await adminApi.deleteFloor(floorToRemove.floorId);
      }

      const updatedGrids = grids.filter((_, idx) => idx !== activeFloorIndex);
      pushState(updatedGrids);
      setActiveFloorIndex(Math.min(activeFloorIndex, updatedGrids.length - 1));
      setSelectedCellPos(null);
      addToast({
        type: 'success',
        title: 'Floor Removed',
        message: `"${floorToRemove.label}" has been removed.`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Remove Failed', message: 'Could not remove floor.' });
    }
  };

  const selectedCell = selectedCellPos
    ? currentGrid?.cells.find(
        (c) => c.row === selectedCellPos.row && c.col === selectedCellPos.col
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          {grids.map((g, idx) => (
            <button
              key={g.floorId}
              onClick={() => {
                setActiveFloorIndex(idx);
                setSelectedCellPos(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeFloorIndex === idx
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {g.label}
            </button>
          ))}

          <button
            onClick={() => {
              setGeneratorFloorSpecs(
                grids.map((g) => {
                  const counts = { INDIVIDUAL: 0, GROUP: 0, ACCESSIBLE: 0, COMPUTER: 0 };
                  g.cells.forEach((c) => {
                    if (c.type === 'SEAT' && c.seat) {
                      const st = c.seat.seatType;
                      if (st === 'INDIVIDUAL') counts.INDIVIDUAL++;
                      if (st === 'GROUP') counts.GROUP++;
                      if (st === 'ACCESSIBLE') counts.ACCESSIBLE++;
                      if (st === 'COMPUTER') counts.COMPUTER++;
                    }
                  });
                  return {
                    floorNumber: g.floorNumber,
                    label: g.label,
                    rows: g.rows,
                    cols: g.cols,
                    counts,
                  };
                })
              );
              setShowGenerator(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-navy text-white hover:bg-navy-dark transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            Seat Generator
          </button>
          <button
            onClick={() => setShowAddFloor(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-sm"
          >
            + Add Floor
          </button>
          <button
            onClick={handleRemoveFloor}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-all flex items-center gap-1.5 shadow-sm"
          >
            − Remove Floor
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 disabled:opacity-40 rounded-xl transition-colors"
            title="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 disabled:opacity-40 rounded-xl transition-colors"
            title="Redo"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            disabled={saving || !hasUnsavedChanges}
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm shadow-primary/20"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes *' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Editor Main Canvas & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Visual Grid Canvas */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          {/* Palette Tools Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pb-4 mb-4 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">
              Palette:
            </span>
            <button
              onClick={() => setActiveTool('SEAT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all ${
                activeTool === 'SEAT'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Armchair className="w-3.5 h-3.5" /> Seat
            </button>
            <button
              onClick={() => setActiveTool('AISLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all ${
                activeTool === 'AISLE'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Move className="w-3.5 h-3.5" /> Aisle
            </button>
            <button
              onClick={() => setActiveTool('DOOR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all ${
                activeTool === 'DOOR'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <DoorOpen className="w-3.5 h-3.5" /> Door
            </button>
            <button
              onClick={() => setActiveTool('WINDOW_WALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all ${
                activeTool === 'WINDOW_WALL'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Window Wall
            </button>
            <button
              onClick={() => setActiveTool('ERASE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all ${
                activeTool === 'ERASE'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" /> Erase Cell
            </button>
          </div>

          {/* Grid Canvas */}
          <div className="overflow-auto max-h-[550px] p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-center">
            <div
              style={{
                display: 'grid',
                gridTemplateRows: `repeat(${currentGrid?.rows || 5}, minmax(4.25rem, 1fr))`,
                gridTemplateColumns: `repeat(${currentGrid?.cols || 6}, minmax(4.5rem, 1fr))`,
                gap: '0.625rem',
              }}
              className="p-2"
            >
              {currentGrid?.cells.map((cell) => {
                const isSelected =
                  selectedCellPos?.row === cell.row && selectedCellPos?.col === cell.col;

                return (
                  <div
                    key={`${cell.row}-${cell.col}`}
                    onClick={() => handleCellClick(cell.row, cell.col)}
                    className={`relative p-2 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-between select-none ${
                      isSelected
                        ? 'ring-4 ring-primary/20 border-primary bg-primary/10 shadow-md scale-105 z-10'
                        : cell.type === 'SEAT'
                        ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900'
                        : cell.type === 'AISLE'
                        ? 'border-dashed border-slate-300 bg-slate-200/50 text-slate-400'
                        : cell.type === 'DOOR'
                        ? 'border-teal/40 bg-teal-light text-teal-dark font-bold'
                        : cell.type === 'WINDOW_WALL'
                        ? 'border-sky-300 bg-sky-50 text-sky-700 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-300'
                    }`}
                  >
                    {cell.type === 'SEAT' && cell.seat ? (
                      <>
                        <div className="w-full flex justify-between text-[10px] opacity-75 font-mono">
                          <span>{cell.seat.facing}</span>
                          <span>{cell.seat.seatType[0]}</span>
                        </div>
                        <div className="font-bold text-xs">{cell.seat.label}</div>
                        <div className="text-[9px] uppercase font-semibold text-emerald-700">
                          {cell.seat.isActive ? 'Active' : 'Maint'}
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] uppercase font-bold tracking-wider">
                        {cell.type === 'EMPTY' ? '+' : cell.type}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Cell Configuration Panel */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-5">
          <h4 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" /> Cell Inspector
          </h4>

          {selectedCell ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">Cell Type:</span>
                <select
                  value={selectedCell.type}
                  onChange={(e) => updateSelectedCellType(e.target.value as CellType)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium outline-none focus:border-primary"
                >
                  <option value="SEAT">SEAT</option>
                  <option value="AISLE">AISLE</option>
                  <option value="DOOR">DOOR</option>
                  <option value="WINDOW_WALL">WINDOW WALL</option>
                  <option value="EMPTY">EMPTY</option>
                </select>
              </div>

              {selectedCell.type === 'SEAT' && selectedCell.seat && (
                <>
                  <div>
                    <span className="text-slate-500 block mb-1">Seat Label:</span>
                    <input
                      type="text"
                      value={selectedCell.seat.label}
                      onChange={(e) => updateSelectedSeat({ label: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-bold outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1">Seat Type:</span>
                    <select
                      value={selectedCell.seat.seatType}
                      onChange={(e) => updateSelectedSeat({ seatType: e.target.value as SeatType })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-medium outline-none focus:border-primary"
                    >
                      <option value="INDIVIDUAL">INDIVIDUAL</option>
                      <option value="GROUP">GROUP</option>
                      <option value="ACCESSIBLE">ACCESSIBLE</option>
                      <option value="COMPUTER">COMPUTER</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1">Facing Direction:</span>
                    <div className="grid grid-cols-4 gap-1">
                      {(['N', 'E', 'S', 'W'] as Facing[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => updateSelectedSeat({ facing: f })}
                          className={`py-2 rounded-lg font-bold border transition-colors ${
                            selectedCell.seat?.facing === f
                              ? 'bg-primary text-white border-primary'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-slate-500 block font-semibold">Seat Attributes:</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCell.seat.attributes.window}
                        onChange={(e) =>
                          updateSelectedSeat({
                            attributes: { ...selectedCell.seat!.attributes, window: e.target.checked },
                          })
                        }
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span>Window Side</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCell.seat.attributes.powerOutlet}
                        onChange={(e) =>
                          updateSelectedSeat({
                            attributes: { ...selectedCell.seat!.attributes, powerOutlet: e.target.checked },
                          })
                        }
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span>Power Outlet</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCell.seat.attributes.quietZone}
                        onChange={(e) =>
                          updateSelectedSeat({
                            attributes: { ...selectedCell.seat!.attributes, quietZone: e.target.checked },
                          })
                        }
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span>Quiet Study Pod</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCell.seat.attributes.nearDoor}
                        onChange={(e) =>
                          updateSelectedSeat({
                            attributes: { ...selectedCell.seat!.attributes, nearDoor: e.target.checked },
                          })
                        }
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span>Near Entrance/Door</span>
                    </label>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCell.seat.isActive}
                        onChange={(e) => updateSelectedSeat({ isActive: e.target.checked })}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="font-semibold text-slate-800">Operational Active</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Click any cell in the grid to inspect and adjust properties.
            </div>
          )}
        </div>
      </div>

      {/* Auto-Generator Modal */}
      {showGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" /> Auto-Generate Floor Grids
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Define the grid dimensions and category seat quotas per floor. The algorithm will automatically layout desks, aisles, and window assignments.
            </p>

            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {generatorFloorSpecs.map((spec, sIdx) => {
                const total = Object.values(spec.counts).reduce((a, b) => a + b, 0);
              const capacity = spec.rows * spec.cols;
              const isOver = total > capacity;

              return (
                <div key={sIdx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Floor {spec.floorNumber} - {spec.label}</span>
                    <span className={`font-mono font-bold ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {total} / {capacity} Seats Used
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">Rows:</span>
                      <input
                        type="number"
                        min={3}
                        max={15}
                        value={spec.rows}
                        onChange={(e) => {
                          const updated = [...generatorFloorSpecs];
                          updated[sIdx].rows = parseInt(e.target.value) || 5;
                          setGeneratorFloorSpecs(updated);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500">Columns:</span>
                      <input
                        type="number"
                        min={3}
                        max={15}
                        value={spec.cols}
                        onChange={(e) => {
                          const updated = [...generatorFloorSpecs];
                          updated[sIdx].cols = parseInt(e.target.value) || 6;
                          setGeneratorFloorSpecs(updated);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-slate-500">Individual:</span>
                      <input
                        type="number"
                        min={0}
                        value={spec.counts.INDIVIDUAL}
                        onChange={(e) => {
                          const updated = [...generatorFloorSpecs];
                          updated[sIdx].counts.INDIVIDUAL = parseInt(e.target.value) || 0;
                          setGeneratorFloorSpecs(updated);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500">Computer:</span>
                      <input
                        type="number"
                        min={0}
                        value={spec.counts.COMPUTER}
                        onChange={(e) => {
                          const updated = [...generatorFloorSpecs];
                          updated[sIdx].counts.COMPUTER = parseInt(e.target.value) || 0;
                          setGeneratorFloorSpecs(updated);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500">Group:</span>
                      <input
                        type="number"
                        min={0}
                        value={spec.counts.GROUP}
                        onChange={(e) => {
                          const updated = [...generatorFloorSpecs];
                          updated[sIdx].counts.GROUP = parseInt(e.target.value) || 0;
                          setGeneratorFloorSpecs(updated);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500">Accessible:</span>
                      <input
                        type="number"
                        min={0}
                        value={spec.counts.ACCESSIBLE}
                        onChange={(e) => {
                          const updated = [...generatorFloorSpecs];
                          updated[sIdx].counts.ACCESSIBLE = parseInt(e.target.value) || 0;
                          setGeneratorFloorSpecs(updated);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleGenerateGrid}
                className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs shadow-md shadow-primary/20 transition-all"
              >
                Generate & Replace
              </button>
              <button
                onClick={() => setShowGenerator(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Floor Modal */}
      {showAddFloor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add New Floor</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Floor Number</label>
                <input
                  type="number"
                  value={newFloorData.number}
                  onChange={(e) => setNewFloorData({...newFloorData, number: e.target.value})}
                  placeholder="e.g. 3"
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Floor Name (Label)</label>
                <input
                  type="text"
                  value={newFloorData.label}
                  onChange={(e) => setNewFloorData({...newFloorData, label: e.target.value})}
                  placeholder="e.g. Floor 3 - Reading Room"
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-primary text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddFloor}
                className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs transition-all shadow-md shadow-primary/20"
              >
                Add Floor
              </button>
              <button
                onClick={() => {
                  setShowAddFloor(false);
                  setNewFloorData({ number: '', label: '' });
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
