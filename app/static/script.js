document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const stationSelect = document.getElementById('stationSelect');
    const chartLoading = document.getElementById('chartLoading');
    const stationLoading = document.getElementById('stationLoading');
    const tableWrapper = document.getElementById('table-wrapper');
    const tableContainer = document.getElementById('readings-table-container');
    
    // Chart instance reference
    let chartInstance = null;
    
    // Debug flag - set to true to see detailed console logs
    const DEBUG = true;
    
    function log(message) {
        if (DEBUG) console.log(`[DEBUG] ${message}`);
    }

    // Load stations
    loadStations();
    
    async function loadStations() {
        stationLoading.style.display = 'block';
        try {
            const response = await fetch('/api/stations');
            if (!response.ok) throw new Error(`Failed to load stations: ${response.status}`);
            
            const stations = await response.json();
            log(`Loaded ${stations.length} stations`);
            
            // Sort and populate dropdown
            stations.sort((a, b) => a.label.localeCompare(b.label));
            stations.forEach(station => {
                const option = document.createElement('option');
                option.value = station.stationReference;
                option.textContent = `${station.label} (${station.riverName})`;
                stationSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading stations:', error);
            alert(`Failed to load stations: ${error.message}`);
        } finally {
            stationLoading.style.display = 'none';
        }
    }

    // Handle station selection
    stationSelect.addEventListener('change', function() {
        const stationId = this.value;
        if (!stationId) return;
        
        loadStationData(stationId);
    });
    
    // Load data for selected station
    async function loadStationData(stationId) {
        log(`Loading data for station: ${stationId}`);
        
        // Show loading indicator
        chartLoading.style.display = 'block';
        
        // Hide table until new data is loaded
        tableWrapper.style.display = 'none';
        
        try {
            // Fetch readings
            const response = await fetch(`/api/readings/${stationId}`);
            if (!response.ok) throw new Error(`Failed to load readings: ${response.status}`);
            
            const readings = await response.json();
            log(`Loaded ${readings.length} readings`);
            
            if (readings.length === 0) {
                throw new Error('No readings available for this station');
            }
            
            // Update title
            const stationName = stationSelect.options[stationSelect.selectedIndex].text;
            document.getElementById('chartTitle').textContent = `Water Level Readings - ${stationName}`;
            
            // Clear existing chart
            if (chartInstance) {
                chartInstance.destroy();
                chartInstance = null;
            }
            
            // Create new chart
            createChart(readings);
            
            // Create table and make visible
            createTable(readings);
            tableWrapper.style.display = 'block';
            log('Table wrapper is now visible');
            
        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            chartLoading.style.display = 'none';
        }
    }
    
    // Create chart
    function createChart(readings) {
        const ctx = document.getElementById('readingsChart').getContext('2d');
        const unit = readings[0]?.unit || 'Unknown';
        
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: `Water Level (${unit})`,
                    data: readings.map(r => ({
                        x: new Date(r.dateTime),
                        y: r.value
                    })),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: context => new Date(context[0].parsed.x).toLocaleString(),
                            label: context => `Level: ${context.parsed.y.toFixed(2)} ${unit}`
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'hour',
                            displayFormats: {
                                hour: 'HH:mm'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: `Water Level (${unit})`
                        }
                    }
                }
            }
        });
        
        log('Chart created');
    }
    
    // Create table
    function createTable(readings) {
        // Clear previous content
        tableContainer.innerHTML = '';
        
        log(`Creating table with ${readings.length} readings`);
        
        // Create table HTML directly
        let tableHTML = '<table class="readings-table" style="width:100%; border-collapse:collapse">';
        
        // Add header
        tableHTML += `
            <thead>
                <tr>
                    <th>Date & Time</th>
                    <th>Water Level</th>
                    <th>Unit</th>
                </tr>
            </thead>
        `;
        
        // Add body
        tableHTML += '<tbody>';
        
        readings.forEach(reading => {
            const dateTime = new Date(reading.dateTime).toLocaleString();
            const value = reading.value.toFixed(2);
            const unit = reading.unit;
            
            tableHTML += `
                <tr>
                    <td>${dateTime}</td>
                    <td>${value}</td>
                    <td>${unit}</td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table>';
        
        // Set container HTML
        tableContainer.innerHTML = tableHTML;
        
        log('Table HTML set: ' + tableHTML.substring(0, 100) + '...');
    }
});
