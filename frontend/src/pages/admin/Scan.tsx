import React from 'react';
import { QRScanner } from '../../components/QRScanner';

export const Scan: React.FC = () => {
  return (
    <div className="py-6">
      <QRScanner />
    </div>
  );
};
