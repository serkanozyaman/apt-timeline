import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { getTimeline, getGroups } from '../services/apiService';
import iso2ToName from '../data/iso2_to_name.json';

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

  // Single effect: load scripts, fetch API data, then init globe
  const unmatchedSet = new Set<string>();
  const matchedSet = new Set<string>();

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCountries([]);
      return;
    }
    
    const filtered = Object.keys(countryStats).filter(country =>
      country.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCountries(filtered);
  }, [searchQuery, countryStats]);

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

        // Fetch timeline + groups from backend BEFORE initializing globe so points reflect latest data
        const [timelineResponse, groupsResponse] = await Promise.all([
          getTimeline({ limit: 2000 }),
          getGroups()
        ]);

        const events = Array.isArray(timelineResponse) ? timelineResponse : [];
        setTimelineData(events);
        setGroupsData(Array.isArray(groupsResponse) ? groupsResponse : []);

        // Build country stats map
        const countryCount: {[key: string]: number} = {};
        events.forEach((event: any) => {
          if (event.country && event.country !== 'Unknown') {
            countryCount[event.country] = (countryCount[event.country] || 0) + 1;
          }
        });
        setCountryStats(countryCount);

        console.log('WorldMap: Raw events sample:', events.slice(0, 3));
        console.log('WorldMap: Country stats built:', countryCount);

        console.log('WorldMap: Fetched data:', {
          timelineEvents: events.length,
          groups: Array.isArray(groupsResponse) ? groupsResponse.length : 0,
          countryStats: countryCount,
          sampleEvent: events[0]
        });

        // Initialize globe after data ready
        await initGlobe(events, countryCount);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading globe:', err);
        setError('Failed to load interactive globe');
        setIsLoading(false);
      }
    };

    loadScriptsAndInitGlobe();
  }, []);

  const initGlobe = async (events: any[], countryStats: {[key: string]: number}) => {
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
        const props = feature.properties || {};
        const candidates: string[] = [];
        [
          props.NAME,           // Primary country name
          props.NAME_EN,        // English name
          props.ADMIN,          // Administrative name
          props.SOVEREIGNT,     // Sovereign name
          props.NAME_LONG,      // Long name
          props.FORMAL_EN,      // Formal English name
        ].forEach((v) => { if (v) candidates.push(String(v)); });
        [
          props.ISO_A2,         // ISO 2-letter code
          props.ISO_A3,         // ISO 3-letter code
          props.ISO2,           // Alternative ISO2
          props.ISO3,           // Alternative ISO3
        ].forEach((v) => { if (v) candidates.push(String(v)); });

        const geom = feature.geometry || {};
        let coords: number[] | undefined = undefined;
        
        // Try to extract coordinates from different geometry types
        if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
          coords = geom.coordinates as number[];
        } else if (geom.type === 'MultiPoint' && Array.isArray(geom.coordinates) && geom.coordinates.length) {
          coords = geom.coordinates[0];
        } else if (geom.type === 'Polygon' && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
          // For polygons, calculate centroid from the first ring
          const ring = geom.coordinates[0];
          if (ring && ring.length > 0) {
            let sumLng = 0, sumLat = 0;
            ring.forEach((coord: number[]) => {
              sumLng += coord[0];
              sumLat += coord[1];
            });
            coords = [sumLng / ring.length, sumLat / ring.length];
          }
        } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
          // For multipolygons, use the first polygon's centroid
          const firstPoly = geom.coordinates[0];
          if (firstPoly && firstPoly.length > 0) {
            const ring = firstPoly[0];
            if (ring && ring.length > 0) {
              let sumLng = 0, sumLat = 0;
              ring.forEach((coord: number[]) => {
                sumLng += coord[0];
                sumLat += coord[1];
              });
              coords = [sumLng / ring.length, sumLat / ring.length];
            }
          }
        }

        if (!coords || coords.length < 2) {
          console.warn('WorldMap: Could not extract coordinates from geometry:', geom.type, geom.coordinates);
          return;
        }
        
        const [lng, lat] = coords;
        
        // Validate coordinates
        if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          console.warn('WorldMap: Invalid coordinates:', lng, lat, 'for feature:', props.NAME);
          return;
        }

        candidates.forEach((key) => {
          const k = String(key).trim().toLowerCase();
          if (!k) return;
          
          // Store the coordinates for this country identifier
          countryMap[k] = { lat: Number(lat), lng: Number(lng) };
          
          // Also store common variations
          if (k.includes('united states')) {
            countryMap['usa'] = { lat: Number(lat), lng: Number(lng) };
            countryMap['us'] = { lat: Number(lat), lng: Number(lng) };
          }
          if (k.includes('united kingdom')) {
            countryMap['uk'] = { lat: Number(lat), lng: Number(lng) };
            countryMap['gb'] = { lat: Number(lat), lng: Number(lng) };
          }
          if (k.includes('russia')) {
            countryMap['russian federation'] = { lat: Number(lat), lng: Number(lng) };
          }
        });
      });

              console.log('WorldMap: Loaded country map with', Object.keys(countryMap).length, 'countries');
        console.log('WorldMap: Sample countries in map:', Object.keys(countryMap).slice(0, 10));
        
        // Debug: Check if specific countries are in the map
        const debugCountries = ['china', 'russia', 'pakistan', 'iran', 'north korea', 'turkey'];
        debugCountries.forEach(country => {
          if (countryMap[country]) {
            console.log('WorldMap: Found', country, 'at', countryMap[country]);
          } else {
            console.warn('WorldMap: Missing', country, 'in countryMap');
          }
        });

      // API'den gelen timeline verilerini kullan
      const data: number[] = [];

      if (events.length === 0 && Object.keys(countryStats).length > 0) {
        // fallback to aggregated countryStats
        console.log('WorldMap: Using aggregated country stats as fallback');
        Object.entries(countryStats).forEach(([country, count]) => {
          const countryInfo = countryMap[(country || '').toLowerCase()];
          if (countryInfo && count > 0) {
            // scale up magnitude so points appear much larger on the globe
            const baseMag = 0.2 + (count / 10) * 0.8;
            const magnitude = Math.min(baseMag * 4.0, 4.0);
            data.push(countryInfo.lat, countryInfo.lng, magnitude);
            console.log('WorldMap: Added point for', country, 'at', countryInfo.lat, countryInfo.lng, 'magnitude', magnitude);
          } else {
            console.warn('WorldMap: Could not find coordinates for country:', country);
            unmatchedSet.add(country);
          }
        });
      } else {
        console.log('WorldMap: Processing', events.length, 'timeline events');
        const counts: {[key: string]: number} = {};
        events.forEach((ev: any) => {
          // Backend'den gelen TimelineEvent formatına uygun olarak country field'ını kullan
          const c = ev.country || '';
          if (c && c !== 'Unknown') counts[c] = (counts[c] || 0) + 1;
        });

        const findCountry = (raw: string | undefined) => {
          if (!raw) return undefined;
          const r = String(raw).trim();
          if (!r) return undefined;
          
          console.log('WorldMap: Finding country for:', raw);
          
          // First, try to map ISO code to country name
          if (/^[a-z]{2}$/i.test(r)) {
            const mapped = (iso2ToName as any)[r.toUpperCase()];
            if (mapped) {
              console.log('WorldMap: Mapped ISO code', r, 'to country name', mapped);
              // Now try to find the mapped country name in the countryMap
              const countryInfo = countryMap[mapped.toLowerCase()];
              if (countryInfo) {
                console.log('WorldMap: Found coordinates for', mapped, ':', countryInfo);
                matchedSet.add(raw);
                return countryInfo;
              } else {
                console.warn('WorldMap: Mapped country name', mapped, 'not found in countryMap');
              }
            } else {
              console.warn('WorldMap: ISO code', r, 'not found in iso2ToName mapping');
            }
          }
          
          // Direct match with country name
          const low = r.toLowerCase();
          if (countryMap[low]) {
            console.log('WorldMap: Direct match found for', raw, ':', countryMap[low]);
            matchedSet.add(raw);
            return countryMap[low];
          }
          
          // Try to find the country in the map with various search strategies
          const countryKeys = Object.keys(countryMap);
          let bestMatch = null;
          let bestScore = 0;
          
          for (const key of countryKeys) {
            let score = 0;
            
            // Exact substring match
            if (key.includes(low) || low.includes(key)) {
              score += 10;
            }
            
            // Word boundary match
            const keyWords = key.split(/\s+/);
            const lowWords = low.split(/\s+/);
            
            for (const keyWord of keyWords) {
              for (const lowWord of lowWords) {
                if (keyWord === lowWord) {
                  score += 5;
                } else if (keyWord.startsWith(lowWord) || lowWord.startsWith(keyWord)) {
                  score += 3;
                }
              }
            }
            
            if (score > bestScore) {
              bestScore = score;
              bestMatch = key;
            }
          }
          
          if (bestMatch && bestScore >= 3) {
            console.log('WorldMap: Best match found for', raw, ':', bestMatch, 'with score', bestScore);
            matchedSet.add(raw);
            return countryMap[bestMatch];
          }
          
          // try iso variants
          if (/^[a-z]{2}$/i.test(r) || /^[a-z]{3}$/i.test(r)) {
            if (countryMap[r.toUpperCase().toLowerCase()]) {
              console.log('WorldMap: ISO variant match found for', raw, ':', countryMap[r.toUpperCase().toLowerCase()]);
              matchedSet.add(raw);
              return countryMap[r.toUpperCase().toLowerCase()];
            }
          }
          
          const normalized = low.replace(/[.,'"()]/g, '').replace(/ of | the /g, ' ').trim();
          if (countryMap[normalized]) {
            console.log('WorldMap: Normalized match found for', raw, ':', countryMap[normalized]);
            matchedSet.add(raw);
            return countryMap[normalized];
          }
          
          // Remove old partial match logic since we have better search above
          
          console.warn('WorldMap: No match found for country:', raw);
          unmatchedSet.add(raw);
          return undefined;
        };

        events.forEach((ev: any) => {
          // Backend'den gelen TimelineEvent formatına uygun olarak country field'ını kullan
          const raw = ev.country;
          if (!raw || raw === 'Unknown') return;
          
          const countryInfo = findCountry(raw);
          if (!countryInfo) {
            console.warn('WorldMap: Could not find coordinates for country:', raw);
            return;
          }
          
          const count = counts[raw] || 1;
          // scale up magnitude so individual event points are larger
          const baseMag = 0.2 + (count / 10) * 0.8;
          const magnitude = Math.min(baseMag * 4.0, 4.0);
          const jitter = () => (Math.random() - 0.5) * 0.8 * (1 / Math.sqrt(count));
          const lat = countryInfo.lat + jitter();
          const lng = countryInfo.lng + jitter();
          data.push(lat, lng, magnitude);
          console.log('WorldMap: Added point for', raw, 'at', lat, lng, 'magnitude', magnitude);
        });
      }

      console.log('WorldMap: Globe data points:', data.length / 3, 'points');
      console.log('WorldMap: data sample (first 9 values):', data.slice(0, 9));
      console.log('WorldMap: Matched countries:', Array.from(matchedSet));
      console.log('WorldMap: Unmatched countries:', Array.from(unmatchedSet));
      
      // If no data produced, add visible debug points so we can confirm globe rendering
      if (data.length === 0) {
        console.warn('WorldMap: no data produced for globe — adding debug sample points');
        // format: lat, lng, magnitude
        data.push(39.9042, 116.4074, 4.0); // Beijing
        data.push(38.9072, -77.0369, 4.0); // Washington DC
        data.push(51.5074, -0.1278, 4.0); // London
      }

      // Create globe
      const globe = new window.DAT.Globe(containerRef.current, {
        imgDir: '/apt-g1/',
        // use a conservative multiplier for now to avoid extreme scaling
        pointMultiplier: 200
      });
      globe.animate();
      // Use non-animated path so points render immediately
      globe.addData(data, { 
        format: 'magnitude', 
        name: 'APT Activities',
        animated: false
      });
      globe.createPoints();

      // debug: inspect geometry and points to ensure data was added
      try {
        const baseGeo = (globe as any)._baseGeometry;
        console.log('WorldMap: globe _baseGeometry vertices:', baseGeo ? baseGeo.vertices.length : 'undefined');
        console.log('WorldMap: globe.points present?', !!(globe as any).points);
      } catch (e) {
        console.warn('WorldMap: error inspecting globe internals', e);
      }

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
