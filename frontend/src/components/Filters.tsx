import React, { useState } from 'react';

interface FiltersProps {
  filters: any;
  groups: any[];
  onFilterChange: (filters: any) => void;
  onRefresh: () => void;
}

const Filters: React.FC<FiltersProps> = ({ filters, groups, onFilterChange, onRefresh }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showUnknownGroups, setShowUnknownGroups] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    onFilterChange({ [field]: value });
  };

  const handleClearFilters = () => {
    onFilterChange({
      group: '',
      country: '',
      fromDate: '',
      toDate: '',
      limit: 500,
      sort: 'date_asc'
    });
  };

  const getUniqueCountries = () => {
    const countries = groups
      .map(group => group.country)
      .filter(country => country && country !== 'Unknown')
      .sort();
    return [...new Set(countries)];
  };

  const getFilteredGroups = () => {
    if (showUnknownGroups) {
      return groups;
    }
    return groups.filter(group => group.name !== 'Unknown');
  };

  const countries = getUniqueCountries();
  const filteredGroups = getFilteredGroups();

  return (
    <div className="filters-container">
      <div className="filters-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3 className="filters-title">Filters</h3>
        <div className="filters-controls">
          <span className="filters-toggle">
            {isExpanded ? 'Hide' : 'Show'} Filters
          </span>
          <button 
            className="refresh-button"
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            title="Refresh data from backend"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="filters-content">
          <div className="filter-group">
            <label className="filter-label" htmlFor="group-filter">Threat Group</label>
            <select
              id="group-filter"
              className="filter-select"
              value={filters.group}
              onChange={(e) => handleInputChange('group', e.target.value)}
            >
              <option value="">All Groups</option>
              {filteredGroups.map(group => (
                <option key={group.name} value={group.name}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="country-filter">Country</label>
            <select
              id="country-filter"
              className="filter-select"
              value={filters.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
            >
              <option value="">All Countries</option>
              {countries.map(country => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="from-date">From Date</label>
            <input
              id="from-date"
              type="date"
              className="filter-input"
              value={filters.fromDate}
              onChange={(e) => handleInputChange('fromDate', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="to-date">To Date</label>
            <input
              id="to-date"
              type="date"
              className="filter-input"
              value={filters.toDate}
              onChange={(e) => handleInputChange('toDate', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="limit-filter">Limit</label>
            <select
              id="limit-filter"
              className="filter-select"
              value={filters.limit}
              onChange={(e) => handleInputChange('limit', parseInt(e.target.value))}
            >
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="sort-filter">Sort</label>
            <select
              id="sort-filter"
              className="filter-select"
              value={filters.sort}
              onChange={(e) => handleInputChange('sort', e.target.value)}
            >
              <option value="date_asc">Oldest First</option>
              <option value="date_desc">Newest First</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                className="filter-checkbox"
                checked={showUnknownGroups}
                onChange={(e) => setShowUnknownGroups(e.target.checked)}
              />
              <span>Include Unknown Groups</span>
            </label>
          </div>

          <div className="filter-actions">
            <button 
              className="filter-button secondary"
              onClick={handleClearFilters}
            >
              Clear All Filters
            </button>
            <button 
              className="filter-button primary"
              onClick={onRefresh}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Filters;
