import React from 'react';
import {
  UserCircleIcon,
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  ClockIcon,
  CheckCircleIcon,
  BuildingStorefrontIcon,
  PhoneIcon,
  MapPinIcon,
  EnvelopeIcon,
  IdentificationIcon,
  CalendarIcon,
  UserIcon,
  HomeIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  TruckIcon
} from '@heroicons/react/24/solid';
import { useDataCollection } from '../contexts/DataCollectionContext';

const AgentVisualizer = ({ isExpanded }: { isExpanded: boolean }) => {
  const { 
    capturedData, 
    getCompletionPercentage, 
    getCapturedCount, 
    exportData,
    captureDataPoint // For demo purposes
  } = useDataCollection();

  if (!isExpanded) {
    return null;
  }

  // Calculate completion percentage
  const completionPercentage = getCompletionPercentage();
  const capturedCount = getCapturedCount();

  // Download collected data as JSON
  const downloadData = () => {
    const collectedData = exportData();
    const dataStr = JSON.stringify(collectedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `store-verification-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Icon mapping for data points
  const getDataPointIcon = (dataId: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      'store_id': IdentificationIcon,
      'address_line_1': HomeIcon,
      'locality': MapPinIcon,
      'landmark': BuildingStorefrontIcon,
      'city': BuildingOfficeIcon,
      'state': GlobeAltIcon,
      'pin_code': MapPinIcon,
      'business_hours': CalendarIcon,
      'weekly_off': CalendarIcon,
      'main_phone_std': PhoneIcon,
      'manager_number': PhoneIcon,
      'store_email': EnvelopeIcon,
      'manager_email': EnvelopeIcon,
      'designation': UserIcon,
      'parking_options': TruckIcon,
      'payment_methods': CreditCardIcon,
      'alternate_number': PhoneIcon,
    };
    return iconMap[dataId] || ClipboardDocumentListIcon;
  };

  // Static data
  const currentAgent = {
    name: 'Authentication',
    description: 'Collecting store verification data.',
    status: 'Active',
  };

  const handoffAgents = [
    { name: 'Returns' },
    { name: 'Sales' },
    { name: 'Human Agent' },
  ];

  const metrics = [
    { name: 'Data Completion', value: `${completionPercentage}%`, icon: ClipboardDocumentListIcon },
    { name: 'Call Duration', value: '2:34', icon: ClockIcon },
  ];

  return (
    <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-500 text-white p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Data Collection Center</h2>
          <p className="text-sm text-purple-200">Live Store Verification</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm font-medium">COLLECTING</span>
        </div>
      </div>

      <div className="p-4 overflow-y-auto space-y-6">
        {/* Current Agent */}
        <div className="bg-blue-500 text-white p-4 rounded-lg shadow-lg flex items-center justify-between">
          <div className="flex items-center">
            <UserCircleIcon className="h-10 w-10 mr-4" />
            <div>
              <h3 className="text-lg font-bold">{currentAgent.name}</h3>
              <p className="text-sm text-blue-100">{currentAgent.description}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-blue-200">STATUS</p>
            <p className="font-bold text-md">{currentAgent.status}</p>
          </div>
        </div>

        {/* Data Collection Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-md font-semibold text-gray-700 flex items-center">
              <ClipboardDocumentListIcon className="h-5 w-5 mr-2 text-gray-500" />
              Data Collection Progress
            </h3>
            <button
              onClick={downloadData}
              disabled={capturedCount === 0}
              className="flex items-center text-sm bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Download ({capturedCount})
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-gray-200 rounded-full h-2 mb-3">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          
          <div className="bg-white rounded-lg p-3 space-y-2 shadow-sm max-h-64 overflow-y-auto">
            {capturedData.map((dataPoint) => {
              const IconComponent = getDataPointIcon(dataPoint.id);
              return (
                <div key={dataPoint.id} className="flex items-center justify-between text-gray-600 border-b border-gray-100 pb-2 last:border-b-0">
                  <div className="flex items-center">
                    <IconComponent className={`h-5 w-5 mr-3 ${
                      dataPoint.status === 'captured' || dataPoint.status === 'verified' 
                        ? 'text-green-500' 
                        : 'text-gray-400'
                    }`} />
                    <span className="text-sm font-medium">{dataPoint.name}</span>
                  </div>
                  <div className="flex items-center">
                    {dataPoint.value ? (
                      <div className="text-right">
                        <span className="text-sm text-gray-800 font-medium">{dataPoint.value}</span>
                        {dataPoint.timestamp && (
                          <p className="text-xs text-gray-500">
                            {dataPoint.timestamp.toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        Pending
                      </span>
                    )}
                    {(dataPoint.status === 'captured' || dataPoint.status === 'verified') && (
                      <CheckCircleIcon className="h-4 w-4 ml-2 text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent Network */}
        <div>
          <h3 className="text-md font-semibold text-gray-700 mb-2 flex items-center">
            <ShareIcon className="h-5 w-5 mr-2 text-gray-500" />
            Agent Network
          </h3>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-sm text-gray-500 mb-2">Can handoff to:</p>
            <div className="flex flex-wrap gap-2">
              {handoffAgents.map((agent) => (
                <span key={agent.name} className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm font-medium">
                  {agent.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Live Metrics */}
        <div>
          <h3 className="text-md font-semibold text-gray-700 mb-2 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-gray-500" />
            Session Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {metrics.map((metric) => (
              <div key={metric.name} className="bg-white rounded-lg p-3 shadow-sm flex items-center">
                <metric.icon className="h-6 w-6 mr-3 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">{metric.name}</p>
                  <p className="font-bold text-lg text-gray-800">{metric.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Buttons for Testing */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-700 mb-2 font-medium">Demo: Simulate Data Capture</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => captureDataPoint('store_id', 'SI-123456')}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
            >
              Store ID
            </button>
            <button
              onClick={() => captureDataPoint('address_line_1', '123 Main Street, Shop No. 5')}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
            >
              Address Line 1
            </button>
            <button
              onClick={() => captureDataPoint('city', 'Mumbai')}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
            >
              City
            </button>
            <button
              onClick={() => captureDataPoint('main_phone_std', '+91-22-98765-43210')}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
            >
              Phone with STD
            </button>
            <button
              onClick={() => captureDataPoint('payment_methods', 'Cash, UPI, Cards')}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
            >
              Payment Methods
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentVisualizer; 