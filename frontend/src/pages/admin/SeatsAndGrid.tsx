import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { FloorGrid } from '../../api/types';
import { GridEditor } from '../../components/GridEditor/GridEditor';
import { Grid, Layers } from 'lucide-react';

export const SeatsAndGrid: React.FC = () => {
  const [grids, setGrids] = useState<FloorGrid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getFloors()
      .then(async (floors) => {
        if (floors.length === 0) {
          // If no floors, create default
          setGrids([]);
          return;
        }
        const loaded = await Promise.all(
          floors.map((f) => adminApi.getFloorGrid(f.id))
        );
        setGrids(loaded);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-16 text-slate-400 text-xs">Loading floor layouts...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Interactive Floor & Seat Grid Builder
        </h2>
      </div>

      <GridEditor initialGrids={grids} />
    </div>
  );
};
