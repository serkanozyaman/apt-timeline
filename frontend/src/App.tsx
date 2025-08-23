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

      {/* Simple top tabs to switch between WorldMap, Timeline (sidebar) and Globe */}
      <div className="flex items-center space-x-2 bg-gray-900 p-2">
        <button className={`px-3 py-1 rounded ${view==='map'? 'bg-teal-500 text-black' : 'text-white'}`} onClick={() => setView('map')}>World Map</button>
        <button className={`px-3 py-1 rounded ${view==='timeline'? 'bg-teal-500 text-black' : 'text-white'}`} onClick={() => setView('timeline')}>Timeline</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {view === 'map' && <WorldMap />}
        {view === 'timeline' && <Timeline />}
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