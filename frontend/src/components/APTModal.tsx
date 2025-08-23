import React from 'react';
import { X, MapPin, Calendar, Target, Zap, AlertCircle, Clock } from 'lucide-react';

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

interface APTModalProps {
  apt: APTGroup | null;
  isOpen: boolean;
  onClose: () => void;
}

const APTModal: React.FC<APTModalProps> = ({ apt, isOpen, onClose }) => {
  if (!isOpen || !apt) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gray-800 p-6 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold text-teal-400">{apt.name}</h2>
            <div className="flex items-center mt-2 space-x-4">
              <div className="flex items-center text-gray-400">
                <MapPin className="w-4 h-4 mr-1" />
                <span>{apt.origin}</span>
              </div>
              <div className="flex items-center text-gray-400">
                <Calendar className="w-4 h-4 mr-1" />
                <span>Active since {apt.firstSeen}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Aliases */}
          <div>
            <h3 className="text-lg font-semibold text-teal-400 mb-3 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Known Aliases
            </h3>
            <div className="flex flex-wrap gap-2 p-3 bg-gray-800 rounded-lg">
              {apt.aliases.map((alias, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm"
                >
                  {alias}
                </span>
              ))}
            </div>
          </div>

          {/* Primary Targets */}
          <div>
            <h3 className="text-lg font-semibold text-teal-400 mb-3 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Primary Targets
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-gray-800 rounded-lg">
              {apt.targets.map((target, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-700 rounded-lg text-gray-300 text-center font-medium"
                >
                  {target}
                </div>
              ))}
            </div>
          </div>

          {/* Attack Techniques */}
          <div>
            <h3 className="text-lg font-semibold text-teal-400 mb-3 flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Attack Techniques
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-800 rounded-lg">
              {apt.techniques.map((technique, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-700 rounded-lg text-gray-300 font-medium"
                >
                  {technique}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Attacks */}
          <div>
            <h3 className="text-lg font-semibold text-teal-400 mb-3 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Recent Attacks
            </h3>
            <div className="space-y-4 p-3 bg-gray-800 rounded-lg">
              {apt.recentAttacks.map((attack, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-200">{attack.target}</h4>
                    <span className="text-sm text-teal-400 bg-gray-600 px-2 py-1 rounded">
                      {attack.date}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {attack.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APTModal;