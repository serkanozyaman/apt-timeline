import React, { useEffect, useState } from 'react';
import { ChevronRight, AlertTriangle, Calendar } from 'lucide-react';
import { getGroups } from '../services/apiService';

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

const APTSidebar: React.FC = () => {
  const [groups, setGroups] = useState<APTGroup[]>([]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await getGroups();
        setGroups(data);
      } catch (error) {
        console.error('Failed to fetch groups:', error);
      }
    };

    fetchGroups();
  }, []);

  return (
    <div className="w-80 bg-gray-900 text-gray-200 h-full overflow-y-auto border-l border-gray-800">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-teal-400 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-teal-400" />
          APT Groups
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {groups.length} Active Threat Actors
        </p>
      </div>
      
      <div className="p-2">
        {groups.map((apt) => (
          <div
            key={apt.id}
            className={`p-3 mb-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-800`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-100">{apt.name}</h3>
                <p className="text-xs text-gray-400">{apt.origin}</p>
                <div className="flex items-center mt-1">
                  <Calendar className="w-3 h-3 mr-1 text-gray-500" />
                  <span className="text-xs text-gray-500">Since {apt.firstSeen}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
            
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {apt.targets.slice(0, 2).map((target, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded"
                  >
                    {target}
                  </span>
                ))}
                {apt.targets.length > 2 && (
                  <span className="px-2 py-1 text-xs bg-gray-600 text-gray-400 rounded">
                    +{apt.targets.length - 2}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default APTSidebar;