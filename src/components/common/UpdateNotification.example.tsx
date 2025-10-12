import React, { useState } from 'react';
import { UpdateNotification } from './UpdateNotification';

/**
 * Example usage of the UpdateNotification component
 * This demonstrates how to integrate the component with service worker updates
 */
export const UpdateNotificationExample: React.FC = () => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  // Simulate update availability
  const simulateUpdateAvailable = () => {
    setIsUpdateAvailable(true);
  };

  // Handle update process
  const handleUpdate = async () => {
    // Simulate update process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real implementation, this would:
    // 1. Activate the waiting service worker
    // 2. Reload the page to get the new version
    console.log('Update completed - would reload page in real implementation');
    setIsUpdateAvailable(false);
  };

  // Handle dismissal
  const handleDismiss = () => {
    setIsUpdateAvailable(false);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Update Notification Demo</h2>
      
      <button
        onClick={simulateUpdateAvailable}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Simulate Update Available
      </button>

      <UpdateNotification
        isVisible={isUpdateAvailable}
        onUpdate={handleUpdate}
        onDismiss={handleDismiss}
      />

      <div className="text-sm text-gray-600 space-y-2">
        <p><strong>Features demonstrated:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Responsive design (mobile-first approach)</li>
          <li>Loading states during update process</li>
          <li>Error handling with retry capability</li>
          <li>Dismissible notification</li>
          <li>Accessible design with proper ARIA labels</li>
          <li>Smooth animations and transitions</li>
        </ul>
      </div>
    </div>
  );
};