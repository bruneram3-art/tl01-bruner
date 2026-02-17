import React from 'react';
import { HRSProvider } from '../components/hrs/HRSContext';
import { HRSLayout } from '../components/hrs/HRSLayout';
import { HRSSidebar } from '../components/hrs/HRSSidebar';
import { HRSDataGrid } from '../components/hrs/HRSDataGrid';
import { HRSVisualizer } from '../components/hrs/HRSVisualizer';

export const HRSSimulator: React.FC = () => {
    return (
        <HRSProvider>
            <HRSLayout>
                <div className="flex h-full w-full">
                    {/* Left Panel: Tree View */}
                    <HRSSidebar />

                    {/* Center Panel: Data Grid */}
                    <HRSDataGrid />

                    {/* Right Panel: Visualization */}
                    <HRSVisualizer />
                </div>
            </HRSLayout>
        </HRSProvider>
    );
};
