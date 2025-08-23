# CTI Timeline - React Frontend

A modern React-based frontend for the CTI Timeline application that displays Advanced Persistent Threat (APT) campaign timelines with a professional black and white design.

## Features

- **Interactive Timeline**: Swiper-based timeline with smooth animations
- **Advanced Filtering**: Filter by threat group, country, date range, and more
- **Real-time Data**: Connects to FastAPI backend for live CTI data
- **Professional Design**: Black and white CTI-themed interface
- **Responsive**: Works on desktop and mobile devices
- **MITRE ATT&CK Integration**: Direct links to MITRE ATT&CK entries

## Tech Stack

- **React 18** - Modern React with hooks
- **Swiper** - Touch slider for timeline navigation
- **Axios** - HTTP client for API calls
- **date-fns** - Date formatting utilities
- **CSS3** - Custom styling with CTI theme

## Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm start
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

## Backend Requirements

This frontend requires the FastAPI backend to be running on `http://localhost:8000`. Make sure the backend is started before running the frontend.

### Backend Endpoints Used

- `GET /groups` - Fetch threat groups for filtering
- `GET /timeline` - Fetch timeline events with optional filters
- `POST /refresh` - Force refresh backend data

## Usage

### Timeline Navigation

- **Desktop**: Use arrow keys or click navigation arrows
- **Mobile**: Swipe left/right or use touch navigation
- **Year Navigation**: Click on year indicators on the right side

### Filtering

1. Click "Show Filters" to expand the filter panel
2. Select filters:
   - **Threat Group**: Filter by specific APT groups
   - **Country**: Filter by origin country
   - **Date Range**: Set from/to dates
   - **Limit**: Number of events to display
   - **Sort**: Newest or oldest first
3. Click "Clear All Filters" to reset

### Data Refresh

Click the "Refresh" button to force the backend to reload data from MITRE ATT&CK and MISP Galaxy sources.

## Project Structure

```
src/
├── components/
│   ├── Timeline.js          # Main timeline component with Swiper
│   ├── Timeline.css         # Timeline styles
│   ├── Filters.js           # Filter controls component
│   ├── Filters.css          # Filter styles
│   ├── LoadingSpinner.js    # Loading indicator
│   └── LoadingSpinner.css   # Spinner styles
├── App.js                   # Main application component
├── App.css                  # App-level styles
├── index.js                 # React entry point
└── index.css                # Global styles
```

## Styling

The application uses a custom CTI theme with:

- **Primary Colors**: Black (#0b0b0d), White (#ffffff)
- **Accent Color**: Red (#ff4444) for highlights and active states
- **Typography**: Inter font family
- **Effects**: Subtle gradients and shadows for depth

## Development

### Adding New Features

1. Create new components in `src/components/`
2. Add corresponding CSS files
3. Import and use in `App.js`

### Customizing Styles

- Modify CSS files to change appearance
- Update color variables for theme changes
- Adjust responsive breakpoints as needed

## API Integration

The frontend automatically handles:

- **Error Handling**: Displays user-friendly error messages
- **Loading States**: Shows spinner during data fetching
- **Caching**: Browser-level caching of API responses
- **Proxy**: Development proxy to backend (see package.json)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the CTI Timeline application suite.
