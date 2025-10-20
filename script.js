
        const API_KEY = "AIzaSyCfnSym_wpPtzWL0P3-kslY1Y14B7nD-34";
        const SPREADSHEET_ID = "1s8R-WlC13aIf6aGIaIyVZH0Ci4torGQk81gzIGKCJi4";
        
        let allData = [];
        let filteredData = [];
        let headers = [];
        let uniqueValues = {
            produk: new Set(),
            packing: new Set(),
            brand: new Set(),
            po: new Set()
        };

        async function getLastModified() {
            try {
                const response = await fetch(`https://www.googleapis.com/drive/v3/files/${SPREADSHEET_ID}?fields=modifiedTime,name&key=${API_KEY}`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch file info');
                }
                
                const fileInfo = await response.json();
                const modifiedTime = new Date(fileInfo.modifiedTime);
                const now = new Date();
                const diffMs = now - modifiedTime;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);
                
                let timeAgo;
                if (diffMins < 1) {
                    timeAgo = 'Just now';
                } else if (diffMins < 60) {
                    timeAgo = `${diffMins}m ago`;
                } else if (diffHours < 24) {
                    timeAgo = `${diffHours}h ago`;
                } else {
                    timeAgo = `${diffDays}d ago`;
                }
                
                const lastModifiedEl = document.getElementById('lastModified');
                lastModifiedEl.innerHTML = `
                    <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Updated ${timeAgo}</span>
                `;
                
            } catch (error) {
                console.error('Error fetching last modified:', error);
                const lastModifiedEl = document.getElementById('lastModified');
                lastModifiedEl.innerHTML = `
                    <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span>Update info unavailable</span>
                `;
            }
        }

        async function loadData() {
            try {
                document.getElementById('loadingState').classList.remove('hidden');
                document.getElementById('dataContainer').classList.add('hidden');
                document.getElementById('errorState').classList.add('hidden');
                
                // Load both data and last modified info in parallel
                const [dataResponse] = await Promise.all([
                    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/TOTAL ORDER?key=${API_KEY}`),
                    getLastModified()
                ]);
                
                if (!dataResponse.ok) {
                    throw new Error('Failed to fetch data');
                }
                
                const data = await dataResponse.json();
                const rows = data.values || [];
                
                if (rows.length === 0) {
                    throw new Error('No data found');
                }
                
                headers = rows[0];
                allData = rows.slice(1).map(row => {
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = row[index] || '';
                    });
                    return rowData;
                });
                
                // Filter out rows where +/- column equals 0
                allData = allData.filter(row => {
                    const plusMinusCol = headers.find(h => h.includes('+') || h.includes('-') || h.toLowerCase().includes('difference'));
                    if (plusMinusCol && row[plusMinusCol] !== undefined) {
                        const value = parseFloat(row[plusMinusCol]) || 0;
                        return value !== 0;
                    }
                    return true;
                });
                
                // Build unique values for suggestions
                buildUniqueValues();
                
                filteredData = [...allData];
                renderTable();
                updateRecordCount();
                
                document.getElementById('loadingState').classList.add('hidden');
                document.getElementById('dataContainer').classList.remove('hidden');
                
            } catch (error) {
                console.error('Error loading data:', error);
                document.getElementById('loadingState').classList.add('hidden');
                document.getElementById('errorState').classList.remove('hidden');
            }
        }
        
        function buildUniqueValues() {
            uniqueValues.produk.clear();
            uniqueValues.packing.clear();
            uniqueValues.brand.clear();
            uniqueValues.po.clear();
            
            // Find the exact column names from headers
            const produkColumn = headers.find(h => 
                h.toLowerCase().includes('produk') || 
                h.toLowerCase().includes('product') || 
                h.toLowerCase().includes('kode') ||
                h.toLowerCase().includes('id')
            );
            
            const packingColumn = headers.find(h => 
                h.toLowerCase().includes('pack') ||
                h.toLowerCase().includes('kemasan') ||
                h.toLowerCase().includes('satuan')
            );
            
            const brandColumn = headers.find(h => 
                h.toLowerCase().includes('brand') || 
                h.toLowerCase().includes('merk') ||
                h.toLowerCase().includes('merek')
            );
            
            const poColumn = headers.find(h => 
                h.toLowerCase().includes('po') || 
                h.toLowerCase().includes('order') ||
                h.toLowerCase().includes('purchase')
            );
            
            // Store column names globally for interconnected filtering
            window.columnNames = {
                produk: produkColumn,
                packing: packingColumn,
                brand: brandColumn,
                po: poColumn
            };
            
            allData.forEach(row => {
                if (produkColumn && row[produkColumn]) {
                    uniqueValues.produk.add(row[produkColumn]);
                }
                if (packingColumn && row[packingColumn]) {
                    uniqueValues.packing.add(row[packingColumn]);
                }
                if (brandColumn && row[brandColumn]) {
                    uniqueValues.brand.add(row[brandColumn]);
                }
                if (poColumn && row[poColumn]) {
                    uniqueValues.po.add(row[poColumn]);
                }
            });
            
            // Update filter labels to match actual column names
            updateFilterLabels(produkColumn, packingColumn, brandColumn, poColumn);
        }
        
        function getFilteredUniqueValues(targetFilter) {
            const produkFilter = document.getElementById('produkFilter').value.toLowerCase();
            const packingFilter = document.getElementById('packingFilter').value.toLowerCase();
            const brandFilter = document.getElementById('brandFilter').value.toLowerCase();
            const poFilter = document.getElementById('poFilter').value.toLowerCase();
            
            // Get current filter values (excluding the target filter)
            const currentFilters = {
                produk: targetFilter === 'produk' ? '' : produkFilter,
                packing: targetFilter === 'packing' ? '' : packingFilter,
                brand: targetFilter === 'brand' ? '' : brandFilter,
                po: targetFilter === 'po' ? '' : poFilter
            };
            
            // Filter data based on current selections
            const relevantData = allData.filter(row => {
                const matchesProduk = !currentFilters.produk || (window.columnNames.produk && row[window.columnNames.produk] && 
                    row[window.columnNames.produk].toString().toLowerCase().includes(currentFilters.produk));
                const matchesPacking = !currentFilters.packing || (window.columnNames.packing && row[window.columnNames.packing] && 
                    row[window.columnNames.packing].toString().toLowerCase().includes(currentFilters.packing));
                const matchesBrand = !currentFilters.brand || (window.columnNames.brand && row[window.columnNames.brand] && 
                    row[window.columnNames.brand].toString().toLowerCase().includes(currentFilters.brand));
                const matchesPo = !currentFilters.po || (window.columnNames.po && row[window.columnNames.po] && 
                    row[window.columnNames.po].toString().toLowerCase().includes(currentFilters.po));
                
                return matchesProduk && matchesPacking && matchesBrand && matchesPo;
            });
            
            // Extract unique values for the target filter from relevant data
            const targetColumn = window.columnNames[targetFilter];
            const uniqueSet = new Set();
            
            if (targetColumn) {
                relevantData.forEach(row => {
                    if (row[targetColumn]) {
                        uniqueSet.add(row[targetColumn]);
                    }
                });
            }
            
            return Array.from(uniqueSet).sort();
        }
        
        function updateFilterLabels(produkColumn, packingColumn, brandColumn, poColumn) {
            const labels = document.querySelectorAll('label');
            if (produkColumn) labels[0].textContent = produkColumn;
            if (packingColumn) labels[1].textContent = packingColumn;
            if (brandColumn) labels[2].textContent = brandColumn;
            if (poColumn) labels[3].textContent = poColumn;
        }
        
        function renderTable() {
            const headerRow = document.getElementById('tableHeader');
            const tbody = document.getElementById('tableBody');
            
            // Render table headers
            headerRow.innerHTML = headers.map(header => 
                `<th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-700 transition-all duration-200 border-r border-slate-600 last:border-r-0" onclick="sortTable('${header}')">
                    <div class="flex items-center gap-2">
                        ${header}
                        <svg class="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
                        </svg>
                    </div>
                </th>`
            ).join('');
            
            // Render table data
            tbody.innerHTML = filteredData.map((row, index) => 
                `<tr class="hover:bg-blue-50/50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white/80' : 'bg-gray-50/80'}">
                    ${headers.map(header => 
                        `<td class="px-6 py-4 text-sm text-gray-800 border-r border-gray-100 last:border-r-0 font-medium">${row[header] || '-'}</td>`
                    ).join('')}
                </tr>`
            ).join('');
        }
        
        function sortTable(column) {
            const isNumeric = filteredData.some(row => !isNaN(parseFloat(row[column])));
            
            filteredData.sort((a, b) => {
                let aVal = a[column] || '';
                let bVal = b[column] || '';
                
                if (isNumeric) {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                    return aVal - bVal;
                } else {
                    return aVal.toString().localeCompare(bVal.toString());
                }
            });
            
            renderTable();
        }
        
        function toggleDropdown(suggestionId) {
            const suggestionsDiv = document.getElementById(suggestionId);
            const filterType = suggestionId.replace('Suggestions', '').toLowerCase();
            
            // Hide all other dropdowns
            ['produkSuggestions', 'packingSuggestions', 'brandSuggestions', 'poSuggestions'].forEach(id => {
                if (id !== suggestionId) {
                    document.getElementById(id).classList.add('hidden');
                }
            });
            
            if (suggestionsDiv.classList.contains('hidden')) {
                // Get interconnected filtered options
                const suggestions = getFilteredUniqueValues(filterType);
                
                if (suggestions.length > 0) {
                    suggestionsDiv.innerHTML = suggestions.map(suggestion => 
                        `<div class="suggestion-item px-3 py-2 cursor-pointer text-sm hover:bg-blue-50" onclick="selectSuggestion('${filterType}Filter', '${suggestion.replace(/'/g, "\\'")}')">${suggestion}</div>`
                    ).join('');
                    suggestionsDiv.classList.remove('hidden');
                } else {
                    suggestionsDiv.innerHTML = '<div class="px-3 py-2 text-sm text-gray-500">No options available</div>';
                    suggestionsDiv.classList.remove('hidden');
                }
            } else {
                suggestionsDiv.classList.add('hidden');
            }
        }

        function setupFilterSuggestions() {
            const filters = [
                { input: 'produkFilter', suggestions: 'produkSuggestions', values: 'produk' },
                { input: 'packingFilter', suggestions: 'packingSuggestions', values: 'packing' },
                { input: 'brandFilter', suggestions: 'brandSuggestions', values: 'brand' },
                { input: 'poFilter', suggestions: 'poSuggestions', values: 'po' }
            ];
            
            filters.forEach(filter => {
                const input = document.getElementById(filter.input);
                const suggestionsDiv = document.getElementById(filter.suggestions);
                
                input.addEventListener('input', (e) => {
                    const value = e.target.value.toLowerCase();
                    
                    if (value) {
                        // Get interconnected filtered options that match the input
                        const allSuggestions = getFilteredUniqueValues(filter.values);
                        const suggestions = allSuggestions.filter(item => 
                            item.toLowerCase().includes(value)
                        );
                        
                        if (suggestions.length > 0) {
                            suggestionsDiv.innerHTML = suggestions.map(suggestion => 
                                `<div class="suggestion-item px-3 py-2 cursor-pointer text-sm hover:bg-blue-50" onclick="selectSuggestion('${filter.input}', '${suggestion.replace(/'/g, "\\'")}')">${suggestion}</div>`
                            ).join('');
                            suggestionsDiv.classList.remove('hidden');
                        } else {
                            suggestionsDiv.innerHTML = '<div class="px-3 py-2 text-sm text-gray-500">No matching options</div>';
                            suggestionsDiv.classList.remove('hidden');
                        }
                    } else {
                        suggestionsDiv.classList.add('hidden');
                    }
                    
                    applyFilters();
                });
                
                input.addEventListener('focus', () => {
                    if (!input.value) {
                        toggleDropdown(filter.suggestions);
                    }
                });
                
                input.addEventListener('blur', () => {
                    setTimeout(() => suggestionsDiv.classList.add('hidden'), 200);
                });
            });
            
            // Close dropdowns when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.relative')) {
                    ['produkSuggestions', 'packingSuggestions', 'brandSuggestions', 'poSuggestions'].forEach(id => {
                        document.getElementById(id).classList.add('hidden');
                    });
                }
            });
        }
        
        function selectSuggestion(inputId, value) {
            document.getElementById(inputId).value = value;
            
            // Hide all dropdowns
            ['produkSuggestions', 'packingSuggestions', 'brandSuggestions', 'poSuggestions'].forEach(id => {
                document.getElementById(id).classList.add('hidden');
            });
            
            applyFilters();
            
            // Update other filter dropdowns to reflect interconnected options
            updateAllFilterDropdowns();
        }
        
        function updateAllFilterDropdowns() {
            // This function can be called to refresh dropdown options when filters change
            // Currently, dropdowns update when they are opened, so no immediate action needed
            // But this provides a hook for future enhancements
        }
        
        function applyFilters() {
            const produkFilter = document.getElementById('produkFilter').value.toLowerCase();
            const packingFilter = document.getElementById('packingFilter').value.toLowerCase();
            const brandFilter = document.getElementById('brandFilter').value.toLowerCase();
            const poFilter = document.getElementById('poFilter').value.toLowerCase();
            
            // Find the exact column names
            const produkColumn = headers.find(h => 
                h.toLowerCase().includes('produk') || 
                h.toLowerCase().includes('product') || 
                h.toLowerCase().includes('kode') ||
                h.toLowerCase().includes('id')
            );
            
            const packingColumn = headers.find(h => 
                h.toLowerCase().includes('pack') ||
                h.toLowerCase().includes('kemasan') ||
                h.toLowerCase().includes('satuan')
            );
            
            const brandColumn = headers.find(h => 
                h.toLowerCase().includes('brand') || 
                h.toLowerCase().includes('merk') ||
                h.toLowerCase().includes('merek')
            );
            
            const poColumn = headers.find(h => 
                h.toLowerCase().includes('po') || 
                h.toLowerCase().includes('order') ||
                h.toLowerCase().includes('purchase')
            );
            
            filteredData = allData.filter(row => {
                const matchesProduk = !produkFilter || (produkColumn && row[produkColumn] && 
                    row[produkColumn].toString().toLowerCase().includes(produkFilter));
                const matchesPacking = !packingFilter || (packingColumn && row[packingColumn] && 
                    row[packingColumn].toString().toLowerCase().includes(packingFilter));
                const matchesBrand = !brandFilter || (brandColumn && row[brandColumn] && 
                    row[brandColumn].toString().toLowerCase().includes(brandFilter));
                const matchesPo = !poFilter || (poColumn && row[poColumn] && 
                    row[poColumn].toString().toLowerCase().includes(poFilter));
                
                return matchesProduk && matchesPacking && matchesBrand && matchesPo;
            });
            
            renderTable();
            updateRecordCount();
        }
        
        function clearFilters() {
            document.getElementById('produkFilter').value = '';
            document.getElementById('packingFilter').value = '';
            document.getElementById('brandFilter').value = '';
            document.getElementById('poFilter').value = '';
            
            filteredData = [...allData];
            renderTable();
            updateRecordCount();
        }
        
        function updateRecordCount() {
            const recordCountEl = document.getElementById('recordCount');
            recordCountEl.innerHTML = `
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>${filteredData.length} records found</span>
            `;
        }
        
        function exportToExcel() {
            const ws = XLSX.utils.json_to_sheet(filteredData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Monitoring Order");
            XLSX.writeFile(wb, `monitoring_order_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
        
        function exportToPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');
            
            doc.setFontSize(16);
            doc.text('Monitoring Order Report', 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
            doc.text(`Records: ${filteredData.length}`, 14, 30);
            
            const tableData = filteredData.map(row => headers.map(header => row[header] || ''));
            
            doc.autoTable({
                head: [headers],
                body: tableData,
                startY: 35,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [59, 130, 246] },
                alternateRowStyles: { fillColor: [249, 250, 251] }
            });
            
            doc.save(`monitoring_order_${new Date().toISOString().split('T')[0]}.pdf`);
        }
        
        // Zoom functionality
        let currentZoom = 0.5;
        const minZoom = 0.24;
        const maxZoom = 1.5;
        const zoomStep = 0.1;
        
        function zoomIn() {
            if (currentZoom < maxZoom) {
                currentZoom = Math.min(currentZoom + zoomStep, maxZoom);
                applyZoom();
            }
        }
        
        function zoomOut() {
            if (currentZoom > minZoom) {
                currentZoom = Math.max(currentZoom - zoomStep, minZoom);
                applyZoom();
            }
        }
        
        function resetZoom() {
            currentZoom = 0.5;
            applyZoom();
        }
        
        function applyZoom() {
            const tableWrapper = document.getElementById('tableWrapper');
            const zoomLevelDisplay = document.getElementById('zoomLevel');
            
            if (tableWrapper) {
                tableWrapper.style.transform = `scale(${currentZoom})`;
                zoomLevelDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
            }
        }
        
        // Keyboard shortcuts for zoom
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === '=' || e.key === '+') {
                    e.preventDefault();
                    zoomIn();
                } else if (e.key === '-') {
                    e.preventDefault();
                    zoomOut();
                } else if (e.key === '0') {
                    e.preventDefault();
                    resetZoom();
                }
            }
        });
        
        // Mouse wheel zoom
        document.getElementById('dataContainer').addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    zoomIn();
                } else {
                    zoomOut();
                }
            }
        });
        
        // Touch zoom functionality
        let initialDistance = 0;
        let initialZoom = 1;
        let isZooming = false;
        
        function getDistance(touches) {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }
        
        document.getElementById('dataContainer').addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                isZooming = true;
                initialDistance = getDistance(e.touches);
                initialZoom = currentZoom;
            }
        }, { passive: false });
        
        document.getElementById('dataContainer').addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && isZooming) {
                e.preventDefault();
                const currentDistance = getDistance(e.touches);
                const scale = currentDistance / initialDistance;
                const newZoom = Math.max(minZoom, Math.min(maxZoom, initialZoom * scale));
                
                if (Math.abs(newZoom - currentZoom) > 0.01) {
                    currentZoom = newZoom;
                    applyZoom();
                }
            }
        }, { passive: false });
        
        document.getElementById('dataContainer').addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                isZooming = false;
            }
        });
        
        // Double tap to reset zoom on mobile
        let lastTap = 0;
        document.getElementById('dataContainer').addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 500 && tapLength > 0 && e.touches.length === 0) {
                e.preventDefault();
                resetZoom();
            }
            lastTap = currentTime;
        });
        
        // Initialize the application
        document.addEventListener('DOMContentLoaded', () => {
            // Set default zoom for mobile devices
            if (window.innerWidth <= 768) {
                currentZoom = 0.6;
                applyZoom();
            }
            
            loadData();
            setupFilterSuggestions();
        });
