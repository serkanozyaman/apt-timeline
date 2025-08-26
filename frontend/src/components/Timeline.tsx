import React, { useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { format, parseISO } from 'date-fns';
import { getTimeline } from '../services/apiService';
import Filters from './Filters';
import LoadingSpinner from './LoadingSpinner';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface TimelineEvent {
  id?: string;
  date: string;
  campaign: string;
  summary: string;
  group_name: string;
  country?: string;
  mitre_url?: string;
  source_url?: string;
  date_range?: {
    first_seen: string;
    last_seen: string;
  };
}

interface Group {
  name: string;
  country: string;
}

const Timeline: React.FC = () => {
  const swiperRef = useRef<any>(null);
  const timelineBarRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [data, setData] = useState<TimelineEvent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    group: '',
    country: '',
    fromDate: '',
    toDate: '',
    limit: 500,
    sort: 'date_asc',
    includeUnknownGroups: true
  });

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      const timelineData = await getTimeline(filters);
      const events = Array.isArray(timelineData) ? timelineData : [];
      const filtered = filters.includeUnknownGroups
        ? events
        : events.filter((ev: any) => ev.group_name !== 'Unknown' && ev.country !== 'Unknown');
      setData(filtered);
      
      // Extract unique groups from data for filter dropdown
      const uniqueGroups = Array.from(
        new Set(events.map((event: TimelineEvent) => 
          JSON.stringify({ name: event.group_name, country: event.country || 'Unknown' })
        ))
      ).map((groupStr) => JSON.parse(groupStr as string) as Group);
      
      setGroups(uniqueGroups);
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
      setData([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineData();
  }, [filters]);

  useEffect(() => {
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.update();
    }
  }, [data]);

  useEffect(() => {
    // Scroll timeline bar to active year
    if (timelineBarRef.current && data.length > 0) {
      const activeYear = getYearFromDate(data[activeIndex]?.date);
      const yearElements = timelineBarRef.current.querySelectorAll('.timeline-year-item');
      const activeElement = Array.from(yearElements).find((el: any) => 
        el.textContent === activeYear
      );
      if (activeElement) {
        activeElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [activeIndex, data]);

  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleRefresh = () => {
    fetchTimelineData();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown Date';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getYearFromDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    try {
      return format(parseISO(dateString), 'yyyy');
    } catch {
      return dateString.split('-')[0] || 'Unknown';
    }
  };

  // Get unique years for timeline bar - sort based on data order
  const getUniqueYears = () => {
    const years = data.map(event => getYearFromDate(event.date)).filter(year => year !== 'Unknown');
    const uniqueYears = [...new Set(years)];
    
    // Sort years based on the order they appear in the data (which reflects the sort order)
    const yearOrder: { [key: string]: number } = {};
    data.forEach((event, index) => {
      const year = getYearFromDate(event.date);
      if (year !== 'Unknown' && !(year in yearOrder)) {
        yearOrder[year] = index;
      }
    });
    
    return uniqueYears.sort((a, b) => yearOrder[a] - yearOrder[b]);
  };

  const handleYearClick = (year: string) => {
    const yearIndex = data.findIndex(event => getYearFromDate(event.date) === year);
    if (yearIndex !== -1 && swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slideTo(yearIndex);
    }
  };

  const handleSlideChange = (swiper: any) => {
    setActiveIndex(swiper.activeIndex);
  };

  const handlePrevSlide = () => {
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slidePrev();
    }
  };

  const handleNextSlide = () => {
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slideNext();
    }
  };

  if (loading) {
    return (
      <div className="timeline-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="timeline-container">
        <Filters 
          filters={filters}
          groups={groups}
          onFilterChange={handleFilterChange}
          onRefresh={handleRefresh}
        />
        <div className="timeline-empty">
          <h3>No timeline data available</h3>
          <p>Try adjusting your filters or check if the backend is running.</p>
        </div>
      </div>
    );
  }

  const uniqueYears = getUniqueYears();

  return (
    <div className="timeline-container w-full h-full">
      <Filters 
        filters={filters}
        groups={groups}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
      />
      
      {/* Timeline Bar with Years */}
      <div className="timeline-bar-container">
        <div className="timeline-line"></div>
        <div className="timeline-bar" ref={timelineBarRef}>
          {uniqueYears.map((year, index) => (
            <div
              key={year}
              className={`timeline-year-item ${getYearFromDate(data[activeIndex]?.date) === year ? 'active' : ''}`}
              onClick={() => handleYearClick(year)}
            >
              <div className="timeline-dot"></div>
              <span className="timeline-year-text">{year}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Content */}
      <div className="timeline">
        <Swiper
          ref={swiperRef}
          direction="vertical"
          loop={false}
          speed={1600}
          modules={[Navigation, Pagination]}
          navigation={{
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev'
          }}
          onSlideChange={handleSlideChange}
          breakpoints={{
            768: { direction: 'horizontal' }
          }}
          className="timeline-swiper"
        >
          {data.map((event, index) => (
            <SwiperSlide key={`${event.group_name}-${event.campaign}-${index}`}>
              <div className="swiper-slide-content">
                <div className="timeline-header">
                  <h4 className="timeline-title">{event.campaign}</h4>
                  <div className="timeline-meta">
                    <span className="timeline-group">{event.group_name}</span>
                    {event.country && event.country !== 'Unknown' && (
                      <span className="timeline-country">• {event.country}</span>
                    )}
                  </div>
                </div>
                
                <div className="timeline-text-container">
                  <p className="timeline-text">
                    {event.summary || 'No description available'}
                  </p>
                </div>
                
                <div className="timeline-footer">
                  <div className="timeline-links">
                    {event.mitre_url && (
                      <a 
                        href={event.mitre_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="timeline-link"
                      >
                        MITRE ATT&CK
                      </a>
                    )}
                    {event.source_url && (
                      <a 
                        href={event.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="timeline-link"
                      >
                        Source
                      </a>
                    )}
                  </div>
                  <div className="timeline-date">
                    {event.date_range?.first_seen && event.date_range?.last_seen ? (
                      <span>
                        {formatDate(event.date_range.first_seen)} - {formatDate(event.date_range.last_seen)}
                      </span>
                    ) : (
                      <span>{formatDate(event.date)}</span>
                    )}
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        
        {/* Left/Right Navigation Arrows */}
        <button className="timeline-nav-arrow timeline-nav-prev" onClick={handlePrevSlide}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="timeline-nav-arrow timeline-nav-next" onClick={handleNextSlide}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <div className="swiper-button-prev"></div>
        <div className="swiper-button-next"></div>
      </div>
    </div>
  );
};

export default Timeline;