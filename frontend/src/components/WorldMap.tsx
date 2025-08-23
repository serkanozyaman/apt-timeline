import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { getTimeline, getGroups } from '../services/apiService';

declare global {
  interface Window {
    THREE: any;
    DAT: any;
  }
}

const WorldMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [groupsData, setGroupsData] = useState<any[]>([]);
  const [countryStats, setCountryStats] = useState<{[key: string]: number}>({});
  const [filteredCountries, setFilteredCountries] = useState<string[]>([]);

  // Arama filtresi
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = Object.keys(countryStats).filter(country =>
        country.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCountries(filtered);
    } else {
      setFilteredCountries([]);
    }
  }, [searchQuery, countryStats]);

  // API'den veri çekme
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [timelineResponse, groupsResponse] = await Promise.all([
          getTimeline({ limit: 1000 }),
          getGroups()
        ]);
        
        setTimelineData(timelineResponse || []);
        setGroupsData(groupsResponse || []);
        
        // Ülke istatistiklerini hesapla - API response formatına göre
        const countryCount: {[key: string]: number} = {};
        const events = Array.isArray(timelineResponse) ? timelineResponse : [];
        
        events.forEach((event: any) => {
          // Backend'den gelen country field'ını kullan
          if (event.country && event.country !== 'Unknown') {
            countryCount[event.country] = (countryCount[event.country] || 0) + 1;
          }
        });
        setCountryStats(countryCount);
        
      } catch (err) {
        console.error('Error fetching API data:', err);
        setError('Failed to load data from API');
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const loadScriptsAndInitGlobe = async () => {
      try {
        // Load Three.js
        if (!window.THREE) {
          const threeScript = document.createElement('script');
          threeScript.src = '/apt-g1/three.min.js';
          threeScript.async = true;
          document.head.appendChild(threeScript);
          
          await new Promise((resolve, reject) => {
            threeScript.onload = resolve;
            threeScript.onerror = reject;
          });
        }

        // Load globe.js
        if (!window.DAT) {
          const globeScript = document.createElement('script');
          globeScript.src = '/apt-g1/globe.js';
          globeScript.async = true;
          document.head.appendChild(globeScript);
          
          await new Promise((resolve, reject) => {
            globeScript.onload = resolve;
            globeScript.onerror = reject;
          });
        }

        // Initialize globe
        await initGlobe();
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading globe:', err);
        setError('Failed to load interactive globe');
        setIsLoading(false);
      }
    };

    loadScriptsAndInitGlobe();
  }, []);

  const initGlobe = async () => {
    if (!containerRef.current || !window.THREE || !window.DAT) return;

    try {
      // Check WebGL support
      if (!window.WebGLRenderingContext || !document.createElement('canvas').getContext('webgl')) {
        throw new Error('Your browser does not support WebGL.');
      }

      // Load country centroids
      const centroidsResponse = await fetch('/apt-g1/countries.geojson');
      if (!centroidsResponse.ok) throw new Error('Could not load country coordinates');
      const centroidsData = await centroidsResponse.json();
      const countryMap: { [key: string]: { lat: number; lng: number } } = {};
      
      centroidsData.features.forEach((feature: any) => {
        const countryName = feature.properties.NAME || feature.properties.COUNTRY;
        if (countryName) {
          const [lng, lat] = feature.geometry.coordinates;
          countryMap[countryName.toLowerCase()] = { lat, lng };
        }
      });

      // Load APT data from API instead of static file
      const data: number[] = [];
      
      // API'den gelen timeline verilerini kullan
      if (Object.keys(countryStats).length > 0) {
        Object.entries(countryStats).forEach(([country, count]) => {
          const countryInfo = countryMap[country.toLowerCase()];
          if (countryInfo && count > 0) {
            // Aktivite sayısına göre büyüklük belirle (0.2 - 1.0 arası)
            const magnitude = Math.min(0.2 + (count / 10) * 0.8, 1.0);
            data.push(countryInfo.lat, countryInfo.lng, magnitude);
          }
        });
      }

      console.log('Globe data points:', data.length / 3, 'countries');

      // Create globe
      const globe = new window.DAT.Globe(containerRef.current, {
        imgDir: '/apt-g1/'
      });
      globe.animate();
      globe.addData(data, { 
        format: 'magnitude', 
        name: 'APT Activities',
        animated: true
      });
      globe.createPoints();

      console.log('Globe initialized successfully');
    } catch (err) {
      throw err;
    }
  };
  // Gerçek istatistikleri hesapla
  const totalThreats = timelineData.length;
  const totalGroups = groupsData.length;
  const totalCountries = Object.keys(countryStats).length;
  const totalIncidents = Object.values(countryStats).reduce((sum, count) => sum + count, 0);

  // Top countries listesi için güvenli veri kontrolü
  const hasCountryData = Object.keys(countryStats).length > 0;
  const maxCount = hasCountryData ? Math.max(...Object.values(countryStats)) : 1;

  return (
    <div className="flex-1 bg-black flex relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)]"></div>
      </div>
      
      {/* Sidebar-aligned stats */}
      <div className="absolute left-0 top-0 space-y-0 z-10">
        <div className="bg-slate-800/50 p-6 rounded-none border-b border-slate-700 w-52 h-48 flex flex-col justify-between">
          <div className="flex items-center justify-start">
            <MapPin className="w-5 h-5 text-red-400 mr-2" />
            <div className="text-sm text-slate-300">Active Threats</div>
          </div>
          <div className="text-3xl font-bold text-red-400">{totalThreats}</div>
        </div>
        
        <div className="bg-slate-800/50 p-6 rounded-none border-b border-slate-700 w-52 h-48 flex flex-col justify-between">
          <div className="flex items-center justify-start">
            <MapPin className="w-5 h-5 text-orange-400 mr-2" />
            <div className="text-sm text-slate-300">Monitored Groups</div>
          </div>
          <div className="text-3xl font-bold text-orange-400">{totalGroups}</div>
        </div>
        
        <div className="bg-slate-800/50 p-6 rounded-none border-b border-slate-700 w-52 h-48 flex flex-col justify-between">
          <div className="flex items-center justify-start">
            <MapPin className="w-5 h-5 text-yellow-400 mr-2" />
            <div className="text-sm text-slate-300">Countries</div>
          </div>
          <div className="text-3xl font-bold text-yellow-400">{totalCountries}</div>
        </div>
        
        <div className="bg-slate-800/50 p-6 rounded-none w-52 h-48 flex flex-col justify-between">
          <div className="flex items-center justify-start">
            <MapPin className="w-5 h-5 text-green-400 mr-2" />
            <div className="text-sm text-slate-300">Incidents</div>
          </div>
          <div className="text-3xl font-bold text-green-400">{totalIncidents}</div>
        </div>
      </div>
      
      {/* Search Box */}
      <div className="absolute top-4 right-4 z-20">
        <div className="relative">
          <div className="flex items-center bg-slate-800/80 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-white placeholder-slate-400 border-none outline-none text-sm w-48"
            />
          </div>
          
          {/* Search Results Dropdown */}
          {searchQuery && filteredCountries.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 rounded-lg border border-slate-700 max-h-60 overflow-y-auto">
              {filteredCountries.slice(0, 10).map((country) => (
                <div
                  key={country}
                  className="px-3 py-2 hover:bg-slate-700/50 cursor-pointer flex justify-between items-center"
                  onClick={() => {
                    setSearchQuery(country);
                    // Haritada ülkeyi vurgula (gelecekte implementasyon)
                  }}
                >
                  <span className="text-white text-sm">{country}</span>
                  <span className="text-cyan-400 text-xs">{countryStats[country]} incidents</span>
                </div>
              ))}
            </div>
          )}
          
          {searchQuery && filteredCountries.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 rounded-lg border border-slate-700 px-3 py-2">
              <span className="text-slate-400 text-sm">No countries found</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Top Countries List */}
      <div className="absolute right-4 bottom-4 z-20 w-80">
        <div className="bg-slate-800/80 rounded-lg p-4">
          <h3 className="text-white text-lg font-semibold mb-3 flex items-center">
            <MapPin className="w-5 h-5 text-cyan-400 mr-2" />
            Top Targeted Countries
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {hasCountryData ? (
              Object.entries(countryStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([country, count], index) => (
                  <div key={country} className="flex justify-between items-center py-1">
                    <div className="flex items-center">
                      <span className="text-cyan-400 text-sm mr-2">#{index + 1}</span>
                      <span className="text-white text-sm">{country}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-16 h-2 bg-slate-700 rounded-full mr-2">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-300 text-xs w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-slate-400 text-sm text-center py-4">
                Loading country data...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Globe Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 w-full h-full"
        style={{ left: '208px', width: 'calc(100% - 208px)' }}
      />

      {/* Loading/Error States */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-white">Loading Interactive Globe...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
          <div className="text-center">
            <p className="text-red-400 mb-2">{error}</p>
            <p className="text-slate-400 text-sm">Fallback map will be displayed</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldMap;
