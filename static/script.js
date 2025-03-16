/**
 * Flood Monitoring System
 * 
 * This script handles the visualization of flood monitoring data
 *  displaying both a chart and tabular representation of water level readings.
 */
document.addEventListener('DOMContentLoaded', function() {
    // DOM element references
    const stationSelect = document.getElementById('stationSelect');
    const chartLoading = document.getElementById('chartLoading');
    const stationLoading = document.getElementById('stationLoading');
    const tableWrapper = document.getElementById('table-wrapper');
    const tableContainer = document.getElementById('readings-table-container');
    const container = document.querySelector('.container');
    
    // Chart reference
    let chartInstance = null;

    /**
     * Initialize the application by loading available stations
     */
    loadStations();
    
    /**
     * Fetches and populates the dropdown with available monitoring stations
     */
    async function loadStations() {
        stationLoading.style.display = 'block';
        
        try {
            const response = await fetch('/api/stations');
            
            if (!response.ok) {
                throw new Error(`Failed to load stations: ${response.status}`);
            }
            
            const stations = await response.json();
            
            // Sort stations alphabetically by label
            stations.sort((a, b) => a.label.localeCompare(b.label));
            
            // Populate dropdown
            stations.forEach(station => {
                const option = document.createElement('option');
                option.value = station.stationReference;
                option.textContent = `${station.label} (${station.riverName})`;
                stationSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading stations:', error);
            displayError('Failed to load stations. Please try again later.');
        } finally {
            stationLoading.style.display = 'none';
        }
    }

    /**
     * Event handler for station selection
     */
    stationSelect.addEventListener('change', function() {
        const stationId = this.value;
        
        if (!stationId) return;
        
        loadStationData(stationId);
    });
    
    /**
     * Loads and displays data for the selected station
     * @param {string} stationId - The ID of the selected station
     */
    async function loadStationData(stationId) {
        // Show loading indicator
        chartLoading.style.display = 'block';
        
        // Hide table until new data is loaded
        tableWrapper.style.display = 'none';
        
        try {
            // Fetch readings
            const response = await fetch(`/api/readings/${stationId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load readings: ${response.status} :(`);
            }
            
            const readings = await response.json();
            
            if (!readings || readings.length === 0) {
                throw new Error('No readings available for this station');
            }
            
            // Update title with station name
            updateChartTitle();
            
            // Clear existing chart
            if (chartInstance) {
                chartInstance.destroy();
                chartInstance = null;
            }
            
            // Create new chart and table
            createChart(readings);
            createTable(readings);
            
            // Show the table
            tableWrapper.style.display = 'block';
            
        } catch (error) {
            console.error('Error loading station data:', error);
            displayError(error.message);
        } finally {
            chartLoading.style.display = 'none';
        }
    }
    
    /**
     * Updates the chart title based on selected station
     */
    function updateChartTitle() {
        const selectedOption = stationSelect.options[stationSelect.selectedIndex];
        document.getElementById('chartTitle').textContent = 
            `Water Level Readings - ${selectedOption.textContent}`;
    }
    
    /**
     * Creates a chart with the provided readings data
     * @param {Array} readings - Array of reading objects
     */
    function createChart(readings) {
        const ctx = document.getElementById('readingsChart').getContext('2d');
        const unit = readings[0]?.unit || 'Unknown';
        
        // Prepare chart data
        const data = readings.map(reading => ({
            x: new Date(reading.dateTime),
            y: reading.value
        }));
        
        // Create chart with responsiveness to container
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: `Water Level (${unit})`,
                    data: data,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 3, // Thicker line for larger chart
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Hide the legend
                    },
                    tooltip: {
                        titleFont: { size: 14 }, // Larger font
                        bodyFont: { size: 14 },  // Larger font
                        callbacks: {
                            title: context => new Date(context[0].parsed.x).toLocaleString(),
                            label: context => `Level: ${context.parsed.y.toFixed(4)} ${unit}`
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
                            text: 'Time',
                            font: {
                                size: 14 // Larger font
                            }
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            autoSkip: true,
                            maxRotation: 0,
                            padding: 10,
                            font: {
                                size: 12 // Larger font
                            }
                        },
                        border: {
                            display: true
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: `Water Level (${unit})`,
                            font: {
                                size: 14 // Larger font
                            }
                        },
                        beginAtZero: false,
                        ticks: {
                            font: {
                                size: 12 // Larger font
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 10,
                        right: 15,
                        top: 15,
                        bottom: 15 // Add padding to avoid axis label cutoff
                    }
                },
                elements: {
                    point: {
                        radius: 4, // Larger points
                        hoverRadius: 6 // Larger hover points
                    }
                }
            }
        });
    }
    
    /**
     * Creates a table with the provided readings data
     * @param {Array} readings - Array of reading objects
     */
    function createTable(readings) {
        // Clear previous content
        tableContainer.innerHTML = '';
        
        // Get unit for reference
        const unit = readings[0]?.unit || '';
        
        // Create table HTML directly
        let tableHTML = '<table class="readings-table">';
        
        // Add header - without Unit column
        tableHTML += `
            <thead>
                <tr>
                    <th>Date & Time</th>
                    <th>Water Level (${unit})</th>
                </tr>
            </thead>
        `;
        
        // Add body
        tableHTML += '<tbody>';
        
        readings.forEach(reading => {
            const dateTime = new Date(reading.dateTime).toLocaleString();
            const value = reading.value.toFixed(4); // 4 decimal places
            
            tableHTML += `
                <tr>
                    <td>${dateTime}</td>
                    <td>${value}</td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table>';
        
        // Set container HTML
        tableContainer.innerHTML = tableHTML;
    }
    
    /**
     * Displays an error message to the user
     * @param {string} message - The error message to display
     */
    function displayError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        // Add to page at the top
        container.insertBefore(errorElement, container.firstChild);
        
        // Remove after 5 seconds
        setTimeout(() => {
            errorElement.remove();
        }, 5000);
    }
});
