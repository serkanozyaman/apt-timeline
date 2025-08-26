import Header from './components/Header';
import APTSidebar from './components/APTSidebar';
import WorldMap from './components/WorldMap';
import Timeline from './components/Timeline';
import APTModal from './components/APTModal';
import { useState } from 'react';

interface APTGroup {
  id: string;
  name: string;
  aliases: string[];
  origin: string;
  firstSeen: string;
  targets: string[];
  techniques: string[];
  recentAttacks: Array<{
    date: string;
    target: string;
    description: string;
  }>;
}

function App() {
  const [selectedAPT, setSelectedAPT] = useState<APTGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<'map' | 'timeline'>('map');

  // selection handler intentionally omitted — APTSidebar currently lists groups only

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAPT(null);
  };

  return (
    <div className="h-screen flex flex-col bg-black">
      <Header />

      {/* Modern tab navigation */}
      <div className="flex items-center justify-center bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 shadow-lg">
        <div className="flex items-center space-x-1 p-2 bg-slate-800/50 rounded-xl m-2 backdrop-blur-sm">
          <button 
            className={`px-6 py-3 rounded-lg font-medium text-sm transition-all duration-300 ease-in-out transform hover:scale-105 ${
              view === 'map' 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`} 
            onClick={() => setView('map')}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>World Map</span>
            </div>
          </button>
          
          <button 
            className={`px-6 py-3 rounded-lg font-medium text-sm transition-all duration-300 ease-in-out transform hover:scale-105 ${
              view === 'timeline' 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`} 
            onClick={() => setView('timeline')}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Timeline</span>
            </div>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {view === 'map' && <WorldMap />}
        {view === 'timeline' && (
          <div className="w-full h-full">
            <Timeline />
          </div>
        )}
      </div>

      <APTModal
        apt={selectedAPT}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

export default App;