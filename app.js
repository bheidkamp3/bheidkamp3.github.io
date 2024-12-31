let climbingData = [];
let startDateInput, endDateInput;
let gradeChart;
let csvInput, regenerateBtn, toggleCsvBtn;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    loadCSVData();
    initializeCharts();
    initializeMap();
});

function initializeUI() {
    initializeDateInputs();
    initializeCSVInput();
}

function initializeDateInputs() {
    startDateInput = document.getElementById('startDate');
    endDateInput = document.getElementById('endDate');
    
    // Add event listeners for date changes
    startDateInput.addEventListener('change', updateVisualizations);
    endDateInput.addEventListener('change', updateVisualizations);
}

function initializeCSVInput() {
    csvInput = document.getElementById('csvInput');
    regenerateBtn = document.getElementById('regenerateBtn');
    
    regenerateBtn.addEventListener('click', () => {
        const csvText = csvInput.value.trim();
        if (csvText) {
            // Parse the pasted CSV data
            Papa.parse(csvText, {
                header: true,
                complete: (results) => {
                    climbingData = results.data.filter(row => row.Date && row.Route);
                    console.log('Parsed CSV data count:', climbingData.length);
                    
                    if (climbingData.length > 0) {
                        updateDateInputs();
                        updateVisualizations();
                        // Hide the CSV input after successful generation
                        document.querySelector('.csv-input').classList.remove('active');
                    } else {
                        alert('No valid climbing data found in the CSV. Please check the format.');
                    }
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                    alert('Error parsing CSV data. Please check the format.');
                }
            });
        } else {
            alert('Please paste your Mountain Project CSV data first.');
        }
    });

    // Add toggle button to header
    const header = document.querySelector('header');
    header.classList.add('header-controls');
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-csv-btn';
    toggleBtn.textContent = 'See Your Climbs!';
    toggleBtn.onclick = () => {
        document.querySelector('.csv-input').classList.toggle('active');
    };
    header.appendChild(toggleBtn);
}

function loadCSVData() {
    // Only load the default CSV if no data has been imported
    if (climbingData.length === 0) {
        Papa.parse('ticks.csv', {
            header: true,
            download: true,
            complete: (results) => {
                climbingData = results.data.filter(row => row.Date && row.Route);
                console.log('Loaded default CSV data count:', climbingData.length);
                
                if (climbingData.length > 0) {
                    // Set start date to January 1st, 2024
                    const dates = climbingData.map(row => new Date(row.Date))
                                            .filter(date => !isNaN(date));
                    const maxDate = new Date(Math.max(...dates));
                    
                    startDateInput.value = '2024-01-01';
                    endDateInput.value = maxDate.toISOString().split('T')[0];
                    
                    startDateInput.min = '2024-01-01';
                    startDateInput.max = maxDate.toISOString().split('T')[0];
                    endDateInput.min = '2024-01-01';
                    endDateInput.max = maxDate.toISOString().split('T')[0];
                    
                    updateVisualizations();
                }
            },
            error: (error) => {
                console.error('Error loading default CSV:', error);
                // Show CSV input if default load fails
                document.querySelector('.csv-input').classList.add('active');
            }
        });
    }
}

function updateDateInputs() {
    const dates = climbingData.map(row => new Date(row.Date))
                            .filter(date => !isNaN(date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    startDateInput.value = minDate.toISOString().split('T')[0];
    endDateInput.value = maxDate.toISOString().split('T')[0];
    
    startDateInput.min = minDate.toISOString().split('T')[0];
    startDateInput.max = maxDate.toISOString().split('T')[0];
    endDateInput.min = minDate.toISOString().split('T')[0];
    endDateInput.max = maxDate.toISOString().split('T')[0];
}

function initializeCharts() {
    // Initialize Grade Distribution Chart
    const gradeCtx = document.getElementById('gradeChart').getContext('2d');
    gradeChart = new Chart(gradeCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Routes by Grade',
                data: [],
                backgroundColor: '#2196F3'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false // Remove the legend
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateVisualizations() {
    try {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.warn('Invalid date range');
            return;
        }

        const filteredData = climbingData.filter(row => {
            const climbDate = new Date(row.Date);
            return climbDate >= startDate && climbDate <= endDate;
        });

        console.log('Filtered data for visualization:', filteredData.length);

        updateTotalStats(filteredData);
        updateGradeDistribution(filteredData);
        updateGeographicDistribution(filteredData);
        updateCragsList(filteredData);
        updateJournal(filteredData);
    } catch (error) {
        console.error('Error in updateVisualizations:', error);
    }
}

function cleanGrade(grade) {
    if (!grade) return 'N/A';
    // Remove PG13, R, and any other similar ratings
    return grade.split(' ')[0];
}

function updateTotalStats(filteredData) {
    const statsContainer = document.getElementById('totalStats');
    
    // Get all years from the complete dataset (not filtered)
    const years = Array.from(new Set(climbingData.map(row => new Date(row.Date).getFullYear())))
        .sort((a, b) => a - b);
    
    // Calculate stats for each year using complete dataset
    const yearlyStats = years.map(year => {
        const yearData = climbingData.filter(row => new Date(row.Date).getFullYear() === year);
        return {
            year,
            totalClimbs: yearData.length,
            uniqueCrags: new Set(yearData.map(row => row.Location)).size,
            daysOutdoors: new Set(yearData.map(row => row.Date)).size,
            totalFeet: yearData.reduce((sum, row) => sum + (parseInt(row.Length) || 0), 0),
            averageGrade: calculateAverageGrade(yearData),
            topGrade: calculateTopGrade(yearData)
        };
    });

    // Calculate total stats for all time
    const totalStats = {
        totalClimbs: climbingData.length,
        uniqueCrags: new Set(climbingData.map(row => row.Location)).size,
        daysOutdoors: new Set(climbingData.map(row => row.Date)).size,
        totalFeet: climbingData.reduce((sum, row) => sum + (parseInt(row.Length) || 0), 0),
        averageGrade: calculateAverageGrade(climbingData),
        topGrade: calculateTopGrade(climbingData)
    };

    // Calculate stats for selected date range
    const rangeStats = {
        totalClimbs: filteredData.length,
        uniqueCrags: new Set(filteredData.map(row => row.Location)).size,
        daysOutdoors: new Set(filteredData.map(row => row.Date)).size,
        totalFeet: filteredData.reduce((sum, row) => sum + (parseInt(row.Length) || 0), 0),
        averageGrade: calculateAverageGrade(filteredData),
        topGrade: calculateTopGrade(filteredData)
    };

    // Create HTML for the stats
    let html = `
        <div class="stats-header">
            <div class="stat-col">Year</div>
            <div class="stat-col">Climbs</div>
            <div class="stat-col">Days Out</div>
            <div class="stat-col">Crags</div>
            <div class="stat-col">Total Feet</div>
            <div class="stat-col">Avg Grade</div>
            <div class="stat-col">Top Grade</div>
        </div>
    `;

    // Add yearly stats
    yearlyStats.forEach(stat => {
        html += `
            <div class="stats-row">
                <div class="stat-col">${stat.year}</div>
                <div class="stat-col">${stat.totalClimbs}</div>
                <div class="stat-col">${stat.daysOutdoors}</div>
                <div class="stat-col">${stat.uniqueCrags}</div>
                <div class="stat-col">${stat.totalFeet.toLocaleString()}</div>
                <div class="stat-col">${stat.averageGrade}</div>
                <div class="stat-col">${stat.topGrade}</div>
            </div>
        `;
    });

    // Add selected range stats
    html += `
        <div class="stats-row range">
            <div class="stat-col">Selected Range</div>
            <div class="stat-col">${rangeStats.totalClimbs}</div>
            <div class="stat-col">${rangeStats.daysOutdoors}</div>
            <div class="stat-col">${rangeStats.uniqueCrags}</div>
            <div class="stat-col">${rangeStats.totalFeet.toLocaleString()}</div>
            <div class="stat-col">${rangeStats.averageGrade}</div>
            <div class="stat-col">${rangeStats.topGrade}</div>
        </div>
    `;

    // Add total stats
    html += `
        <div class="stats-row total">
            <div class="stat-col">All Time</div>
            <div class="stat-col">${totalStats.totalClimbs}</div>
            <div class="stat-col">${totalStats.daysOutdoors}</div>
            <div class="stat-col">${totalStats.uniqueCrags}</div>
            <div class="stat-col">${totalStats.totalFeet.toLocaleString()}</div>
            <div class="stat-col">${totalStats.averageGrade}</div>
            <div class="stat-col">${totalStats.topGrade}</div>
        </div>
    `;

    statsContainer.innerHTML = html;
}

function calculateAverageGrade(data) {
    if (data.length === 0) return 'N/A';
    
    // Simple mode calculation for grades
    const gradeCount = {};
    let maxCount = 0;
    let modeGrade = '';
    
    data.forEach(climb => {
        const grade = cleanGrade(climb.Rating);
        gradeCount[grade] = (gradeCount[grade] || 0) + 1;
        if (gradeCount[grade] > maxCount) {
            maxCount = gradeCount[grade];
            modeGrade = grade;
        }
    });
    
    return modeGrade;
}

function calculateTopGrade(data) {
    if (data.length === 0) return 'N/A';
    
    // Simple max grade finder
    const grades = data.map(climb => cleanGrade(climb.Rating))
                      .filter(grade => grade && grade.startsWith('5.'));
    
    return grades.sort((a, b) => {
        return b.localeCompare(a, undefined, {numeric: true, sensitivity: 'base'});
    })[0] || 'N/A';
}

function updateGradeDistribution(data) {
    const gradeCount = {};
    data.forEach(climb => {
        const grade = cleanGrade(climb.Rating);
        gradeCount[grade] = (gradeCount[grade] || 0) + 1;
    });

    const sortedGrades = Object.keys(gradeCount)
        .filter(grade => grade !== 'N/A')
        .sort((a, b) => {
            return a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});
        });

    gradeChart.data.labels = sortedGrades;
    gradeChart.data.datasets[0].data = sortedGrades.map(grade => gradeCount[grade]);
    gradeChart.update();
}

function updateCragsList(data) {
    const cragsContainer = document.getElementById('cragsContainer');
    
    // Get unique crags
    const uniqueCrags = Array.from(new Set(data.map(row => row.Location)))
        .sort((a, b) => a.localeCompare(b));
    
    // Create the crags list
    cragsContainer.innerHTML = uniqueCrags
        .map(crag => `<div class="crag-item">${crag}</div>`)
        .join('');
}

function updateJournal(data) {
    const journalContainer = document.getElementById('journalContainer');
    
    // Filter entries that have notes
    const entriesWithNotes = data.filter(entry => entry.Notes && entry.Notes.trim());
    
    // Sort by date, most recent first
    entriesWithNotes.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    
    // Create the journal entries
    journalContainer.innerHTML = entriesWithNotes.map(entry => `
        <div class="journal-entry">
            <div class="journal-entry-header">
                <span>${new Date(entry.Date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric'
                })}</span>
                <span>${entry.Route} (${cleanGrade(entry.Rating)})</span>
            </div>
            <div class="journal-entry-content">${entry.Notes}</div>
        </div>
    `).join('');
    
    // Show message if no entries with notes
    if (entriesWithNotes.length === 0) {
        journalContainer.innerHTML = '<div class="journal-entry">No journal entries found for this date range.</div>';
    }
}

let map;
function initializeMap() {
    map = L.map('map', {
        zoomControl: false,
        dragging: !L.Browser.mobile,
        tap: !L.Browser.mobile
    }).setView([39.8283, -98.5795], 4);

    // Use a colorful, modern map style
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap, ©CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Add zoom control to the top-right
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Enable dragging when user explicitly enables it
    if (L.Browser.mobile) {
        map.on('focus', function() {
            map.dragging.enable();
        });
    }
}

function updateGeographicDistribution(data) {
    // Clear existing markers
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    // Group climbs by top-level location
    const locationGroups = {};
    data.forEach(climb => {
        let topLocation;
        const parts = climb.Location.split(' > ');
        
        // Handle international format
        if (parts[0] === 'International') {
            // For international routes, use the country name (third part)
            topLocation = parts[2];
        } else {
            // For US routes, use the state name (first part)
            topLocation = parts[0];
        }

        if (!locationGroups[topLocation]) {
            locationGroups[topLocation] = [];
        }
        locationGroups[topLocation].push(climb);
    });

    // Base coordinates for major climbing areas
    const baseCoordinates = {
        // United States - Major climbing destinations
        'Kentucky': [37.7830, -83.6828], // Red River Gorge
        'Wisconsin': [43.4285, -89.7177], // Devil's Lake
        'Nevada': [36.1699, -115.4934], // Red Rock Canyon
        'California': [37.7379, -119.5466], // Yosemite
        'Utah': [38.5733, -109.5498], // Moab
        'Colorado': [39.9780, -105.2897], // Boulder Canyon
        'Arizona': [34.8697, -111.7610], // Sedona
        'Oregon': [44.3981, -121.1423], // Smith Rock
        'Washington': [47.5332, -121.0252], // Index
        'Wyoming': [43.7904, -107.3925], // Ten Sleep
        'New Mexico': [35.2106, -106.4559], // Sandia Mountains
        'Texas': [30.5571, -98.8198], // Enchanted Rock
        'Idaho': [43.6872, -114.3636], // Sun Valley
        'Montana': [45.8356, -111.5019], // Bozeman
        'New Hampshire': [44.0537, -71.1284], // North Conway
        'West Virginia': [38.4060, -79.3525], // Seneca Rocks
        'Tennessee': [35.0844, -85.3397], // Chattanooga
        'North Carolina': [35.7977, -82.2674], // Looking Glass
        'South Dakota': [43.8791, -103.4591], // Black Hills
        'Alabama': [33.9192, -86.3089], // Horse Pens 40
        'Arkansas': [35.7879, -93.1594], // Horseshoe Canyon Ranch

        // Europe
        'Spain': [41.5949, 1.8346], // Siurana
        'France': [45.8989, 6.9290], // Chamonix
        'Italy': [45.9027, 11.9784], // Arco
        'Switzerland': [46.5907, 7.9089], // Gimmelwald
        'Greece': [37.0833, 22.8500], // Kalymnos
        'Germany': [47.5622, 11.0767], // Frankenjura
        'United Kingdom': [54.4500, -3.0886], // Lake District
        'Austria': [47.2692, 11.4041], // Innsbruck

        // Asia
        'Thailand': [8.0863, 98.2543], // Krabi
        'Japan': [35.6762, 138.6386], // Ogawayama
        'China': [25.2867, 110.2892], // Yangshuo

        // Oceania
        'Australia': [-33.7179, 150.3223], // Blue Mountains
        'New Zealand': [-44.6414, 169.1477], // Wanaka

        // South America
        'Argentina': [-41.1335, -71.3103], // Bariloche
        'Brazil': [-22.9492, -43.1545], // Rio
        'Chile': [-33.4489, -70.6693], // Santiago

        // Canada
        'British Columbia': [49.6802, -123.1548], // Squamish
        'Alberta': [51.0486, -115.3617], // Canmore

        // Mexico
        'Mexico': [25.6866, -100.3161] // Monterrey
    };

    // Try to get coordinates for unknown locations using a geocoding service
    // Note: You might want to implement caching to avoid repeated API calls
    async function getCoordinates(location) {
        if (baseCoordinates[location]) {
            return baseCoordinates[location];
        }

        // Log unknown locations for future updates
        console.warn(`No coordinates found for location: ${location}`);
        return null;
    }

    // Custom marker icon
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: '',
        iconSize: [12, 12],
    });

    // Add markers for each location group
    Object.entries(locationGroups).forEach(async ([location, climbs]) => {
        const coords = await getCoordinates(location);
        if (coords) {
            const grades = Array.from(new Set(climbs.map(c => c.Rating)))
                .sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
            
            const marker = L.marker(coords, { icon: customIcon })
                .bindPopup(`
                    <div class="popup-content">
                        <h4>${location}</h4>
                        <p>
                            <strong>Total Climbs:</strong>
                            <span>${climbs.length}</span>
                        </p>
                        <p>
                            <strong>Grade Range:</strong>
                            <span>${grades[0]} - ${grades[grades.length-1]}</span>
                        </p>
                        <p>
                            <strong>Most Common:</strong>
                            <span>${getMostCommonGrade(climbs)}</span>
                        </p>
                    </div>
                `, {
                    closeButton: false
                });
            marker.addTo(map);
        }
    });

    // Adjust map bounds to show all markers
    const markers = Object.entries(locationGroups)
        .filter(([loc]) => baseCoordinates[loc])
        .map(([loc]) => baseCoordinates[loc]);
    
    if (markers.length > 0) {
        map.fitBounds(markers);
    }
}

// Helper function to find the most common grade
function getMostCommonGrade(climbs) {
    const gradeCount = {};
    climbs.forEach(climb => {
        gradeCount[climb.Rating] = (gradeCount[climb.Rating] || 0) + 1;
    });
    return Object.entries(gradeCount)
        .sort((a, b) => b[1] - a[1])[0][0];
} 