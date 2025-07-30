"use client";

import React, { createContext, useContext, useState, FC, PropsWithChildren } from 'react';

export interface DataPoint {
  id: string;
  name: string;
  value: string | null;
  status: 'pending' | 'captured' | 'verified';
  timestamp?: Date;
}

interface DataCollectionContextValue {
  capturedData: DataPoint[];
  captureDataPoint: (dataId: string, value: string, status?: 'captured' | 'verified') => void;
  updateDataPoint: (dataId: string, updates: Partial<DataPoint>) => void;
  resetAllData: () => void;
  getCompletionPercentage: () => number;
  getCapturedCount: () => number;
  exportData: () => any;
}

const DataCollectionContext = createContext<DataCollectionContextValue | undefined>(undefined);

export const useDataCollection = () => {
  const context = useContext(DataCollectionContext);
  if (context === undefined) {
    throw new Error('useDataCollection must be used within a DataCollectionProvider');
  }
  return context;
};

export const DataCollectionProvider: FC<PropsWithChildren> = ({ children }) => {
  const [capturedData, setCapturedData] = useState<DataPoint[]>([
    { id: 'store_id', name: 'Store ID/Code', value: null, status: 'pending' },
    { id: 'address_line_1', name: 'Address Line 1', value: null, status: 'pending' },
    { id: 'locality', name: 'Locality', value: null, status: 'pending' },
    { id: 'landmark', name: 'Landmark', value: null, status: 'pending' },
    { id: 'city', name: 'City', value: null, status: 'pending' },
    { id: 'state', name: 'State', value: null, status: 'pending' },
    { id: 'pin_code', name: 'PIN Code', value: null, status: 'pending' },
    { id: 'business_hours', name: 'Business Hours', value: null, status: 'pending' },
    { id: 'weekly_off', name: 'Weekly Off', value: null, status: 'pending' },
    { id: 'main_phone_std', name: 'Main Phone Number with STD', value: null, status: 'pending' },
    { id: 'manager_number', name: 'Store Manager\'s Number', value: null, status: 'pending' },
    { id: 'store_email', name: 'Store Email ID', value: null, status: 'pending' },
    { id: 'manager_email', name: 'Store Manager\'s Email ID', value: null, status: 'pending' },
    { id: 'designation', name: 'Designation of Person', value: null, status: 'pending' },
    { id: 'parking_options', name: 'Parking Options', value: null, status: 'pending' },
    { id: 'payment_methods', name: 'Payment Methods Accepted', value: null, status: 'pending' },
    { id: 'alternate_number', name: 'Alternate Number', value: null, status: 'pending' },
  ]);

  const captureDataPoint = (dataId: string, value: string, status: 'captured' | 'verified' = 'captured') => {
    console.log(`[DataCollection] Capturing ${dataId}: ${value}`);
    setCapturedData(prev => prev.map(item => 
      item.id === dataId 
        ? { ...item, value, status, timestamp: new Date() }
        : item
    ));
  };

  const updateDataPoint = (dataId: string, updates: Partial<DataPoint>) => {
    setCapturedData(prev => prev.map(item => 
      item.id === dataId 
        ? { ...item, ...updates, timestamp: new Date() }
        : item
    ));
  };

  const resetAllData = () => {
    setCapturedData(prev => prev.map(item => ({
      ...item,
      value: null,
      status: 'pending' as const,
      timestamp: undefined
    })));
  };

  const getCompletionPercentage = () => {
    const capturedCount = capturedData.filter(item => item.status === 'captured' || item.status === 'verified').length;
    return Math.round((capturedCount / capturedData.length) * 100);
  };

  const getCapturedCount = () => {
    return capturedData.filter(item => item.status === 'captured' || item.status === 'verified').length;
  };

  const exportData = () => {
    return capturedData
      .filter(item => item.value)
      .reduce((acc, item) => {
        acc[item.name] = {
          value: item.value,
          timestamp: item.timestamp?.toISOString(),
          status: item.status
        };
        return acc;
      }, {} as any);
  };

  const value: DataCollectionContextValue = {
    capturedData,
    captureDataPoint,
    updateDataPoint,
    resetAllData,
    getCompletionPercentage,
    getCapturedCount,
    exportData,
  };

  return (
    <DataCollectionContext.Provider value={value}>
      {children}
    </DataCollectionContext.Provider>
  );
}; 