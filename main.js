
        // Configuration
        const CONFIG = {
            SHEET_ID: '18ga4stLBiKWujBryPQHUHrUzgYjprFJEKvUWSd3Zcks',
            SHEET_NAME: 'WKB',
            API_KEY: 'AIzaSyBBY9oqeEjjpVnIXOhdkhR6xuTsCr5gYU8',
            ITEMS_PER_PAGE: 10,
            REFRESH_INTERVAL: 300000,
            TARGET_DATE_CELL: 'J1'
        };

        // Authentication System
        const Auth = {
            users: {
                'admin': { password: '1', role: 'admin', name: 'Administrator' },
                'ppic': { password: '4', role: 'ppic', name: 'ppic' },
                'cs': { password: '2', role: 'cs', name: 'cs' }
            },
            
            currentUser: null,
            
            init() {
                const savedUser = localStorage.getItem('dashboardUser');
                if (savedUser) {
                    try {
                        this.currentUser = JSON.parse(savedUser);
                        this.showDashboard();
                    } catch (e) {
                        localStorage.removeItem('dashboardUser');
                        this.showLogin();
                    }
                } else {
                    this.showLogin();
                }
                
                const loginForm = document.getElementById('loginForm');
                if (loginForm) {
                    loginForm.addEventListener('submit', (e) => {
                        e.preventDefault();
                        this.handleLogin();
                    });
                }
            },
            
            showLogin() {
                const modal = document.getElementById('loginModal');
                if (modal) {
                    modal.classList.remove('hidden');
                    document.body.style.overflow = 'hidden';
                }
            },
            
            hideLogin() {
                const modal = document.getElementById('loginModal');
                if (modal) {
                    modal.classList.add('hidden');
                    document.body.style.overflow = 'auto';
                }
            },
            
            showDashboard() {
                this.hideLogin();
                this.updateUserInfo();
                setTimeout(() => {
                    Utils.setCurrentDate();
                    Charts.init();
                    DataManager.fetchData();
                }, 100);
            },
            
            async handleLogin() {
                const usernameInput = document.getElementById('username');
                const passwordInput = document.getElementById('password');
                const errorDiv = document.getElementById('loginError');
                const buttonText = document.getElementById('loginButtonText');
                const spinner = document.getElementById('loginSpinner');
                
                if (!usernameInput || !passwordInput || !errorDiv || !buttonText || !spinner) {
                    console.error('Login form elements not found');
                    return;
                }
                
                const username = usernameInput.value.trim();
                const password = passwordInput.value;
                
                buttonText.classList.add('hidden');
                spinner.classList.remove('hidden');
                errorDiv.classList.add('hidden');
                
                // Simulate loading
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                if (this.users[username] && this.users[username].password === password) {
                    this.currentUser = {
                        username: username,
                        name: this.users[username].name,
                        role: this.users[username].role,
                        loginTime: new Date().toISOString()
                    };
                    
                    localStorage.setItem('dashboardUser', JSON.stringify(this.currentUser));
                    
                    buttonText.innerHTML = '<i class="fas fa-check mr-2"></i>Login Berhasil!';
                    buttonText.classList.remove('hidden');
                    spinner.classList.add('hidden');
                    
                    setTimeout(() => {
                        this.showDashboard();
                    }, 500);
                    
                } else {
                    buttonText.classList.remove('hidden');
                    spinner.classList.add('hidden');
                    errorDiv.classList.remove('hidden');
                    passwordInput.value = '';
                }
            },
            
            updateUserInfo() {
                if (!this.currentUser) return;
                
                const sidebar = document.querySelector('.sidebar');
                if (!sidebar) return;
                
                // Remove existing user info if any
                const existingUserInfo = sidebar.querySelector('.user-info');
                if (existingUserInfo) {
                    existingUserInfo.remove();
                }
                
                const userInfo = document.createElement('div');
                userInfo.className = 'user-info px-4 py-3 border-b border-gray-200';
                userInfo.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <i class="fas fa-user text-blue-600 text-sm"></i>
                            </div>
                            <div>
                                <div class="text-sm font-medium text-gray-800">${this.currentUser.name}</div>
                                <div class="text-xs text-gray-500 capitalize">${this.currentUser.role}</div>
                            </div>
                        </div>
                        <button onclick="Auth.logout()" class="text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                `;
                
                const header = sidebar.querySelector('.p-6');
                if (header) {
                    header.parentNode.insertBefore(userInfo, header.nextSibling);
                }
            },
            
            logout() {
                if (confirm('Yakin ingin keluar dari dashboard?')) {
                    localStorage.removeItem('dashboardUser');
                    this.currentUser = null;
                    location.reload();
                }
            },
            
            togglePassword() {
                const passwordInput = document.getElementById('password');
                const toggleIcon = document.getElementById('passwordToggle');
                
                if (!passwordInput || !toggleIcon) return;
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    toggleIcon.className = 'fas fa-eye-slash';
                } else {
                    passwordInput.type = 'password';
                    toggleIcon.className = 'fas fa-eye';
                }
            }
        };

        // Data Management
        const DataManager = {
            stockData: [],
            filteredData: [],
            currentPage: 1,
            isLoading: false,
            sortColumn: -1,
            sortDirection: 'asc',
            showAllPOs: false,
            targetDate: null,
            kodeSearchTerm: '',
            brandSizeData: [],
            filteredBrandSizeData: [],
            brandSizeCurrentPage: 1,
            brandSizeSortColumn: -1,
            brandSizeSortDirection: 'asc',
            brandSizeSearchTerm: '',
            sizeFilter: '',
            kodeFilterBrandSize: '',

            async fetchTargetDate() {
                try {
                    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${CONFIG.TARGET_DATE_CELL}?key=${CONFIG.API_KEY}`;
                    const response = await fetch(url);
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.values && data.values[0] && data.values[0][0]) {
                            this.targetDate = data.values[0][0];
                        }
                    }
                } catch (error) {
                    console.error('Error fetching target date:', error);
                    this.targetDate = new Date().toISOString().split('T')[0];
                }
            },

            async fetchData() {
                if (this.isLoading) return;
                
                this.isLoading = true;
                UI.showLoading();
                
                try {
                    await this.fetchTargetDate();
                    
                    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${CONFIG.SHEET_NAME}?key=${CONFIG.API_KEY}`;
                    const response = await fetch(url);
                    
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    
                    const data = await response.json();
                    
                    if (data.values && data.values.length > 1) {
                        this.stockData = data.values.slice(1).map(row => {
                            const processedRow = [];
                            for (let i = 0; i < 9; i++) {
                                processedRow[i] = row[i] || '-';
                            }
                            return processedRow;
                        });
                        
                        this.filteredData = [...this.stockData];
                        this.updateUI();
                        UI.setConnectionStatus(true);
                    } else {
                        throw new Error('No data found');
                    }
                } catch (error) {
                    console.error('Fetch error:', error);
                    UI.showError(error.message);
                    UI.setConnectionStatus(false);
                    this.loadSampleData();
                } finally {
                    this.isLoading = false;
                    UI.hideLoading();
                }
            },

            loadSampleData() {
                if (!this.targetDate) {
                    this.targetDate = new Date().toISOString().split('T')[0];
                }
                
                this.stockData = [
                    ['2024-01-15', 'Beras Premium', '25kg', 'Brand A', 'BP001', 'PO-2024-001', '20', '500', 'Gudang A'],
                    ['2024-01-15', 'Gula Pasir', '1kg', 'Brand B', 'GP002', 'PO-2024-001', '100', '100', 'Gudang B'],
                    ['2024-01-16', 'Minyak Goreng', '2L', 'Brand C', 'MG003', 'PO-2024-002', '50', '100', 'Gudang A'],
                    ['2024-01-16', 'Tepung Terigu', '1kg', 'Brand A', 'TT004', 'PO-2024-002', '75', '75', 'Gudang C'],
                    ['2024-01-17', 'Beras Premium', '25kg', 'Brand B', 'BP005', 'PO-2024-003', '15', '375', 'Gudang B'],
                    ['2024-01-17', 'Gula Pasir', '1kg', 'Brand A', 'GP006', 'PO-2024-003', '80', '80', 'Gudang A'],
                    ['2024-01-18', 'Minyak Goreng', '2L', 'Brand B', 'MG007', 'PO-2024-004', '30', '60', 'Gudang C'],
                    ['2024-01-18', 'Tepung Terigu', '1kg', 'Brand C', 'TT008', 'PO-2024-004', '60', '60', 'Gudang B']
                ];
                this.filteredData = [...this.stockData];
                this.updateUI();
            },

            updateUI() {
                this.populateFilters();
                this.populateTable();
                this.updateStats();
                this.updateSummaries();
                this.updateBrandSizeData();
                Charts.updateCharts();
                Utils.updateCurrentDate();
            },

            populateFilters() {
                const products = [...new Set(this.stockData.map(row => row[1]).filter(item => item && item !== '-'))];
                const brands = [...new Set(this.stockData.map(row => row[3]).filter(item => item && item !== '-'))];
                const kodes = [...new Set(this.stockData.map(row => row[4]).filter(item => item && item !== '-'))];
                const locations = [...new Set(this.stockData.map(row => row[8]).filter(item => item && item !== '-'))];
                
                const productFilter = document.getElementById('productFilter');
                const brandFilter = document.getElementById('brandFilter');
                const kodeFilter = document.getElementById('kodeFilter');
                const locationFilter = document.getElementById('locationFilter');
                
                if (productFilter) {
                    productFilter.innerHTML = '<option value="">Semua Produk</option>' + 
                        products.map(p => `<option value="${p}">${p}</option>`).join('');
                }
                
                if (brandFilter) {
                    brandFilter.innerHTML = '<option value="">Semua Brand</option>' + 
                        brands.map(b => `<option value="${b}">${b}</option>`).join('');
                }
                
                if (kodeFilter) {
                    kodeFilter.innerHTML = '<option value="">Semua Kode</option>' + 
                        kodes.map(k => `<option value="${k}">${k}</option>`).join('');
                }
                
                if (locationFilter) {
                    locationFilter.innerHTML = '<option value="">Semua Lokasi</option>' + 
                        locations.map(l => `<option value="${l}">${l}</option>`).join('');
                }
            },

            populateTable() {
                const tbody = document.getElementById('stockTableBody');
                if (!tbody) return;
                
                const start = (this.currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
                const end = Math.min(start + CONFIG.ITEMS_PER_PAGE, this.filteredData.length);
                
                tbody.innerHTML = this.filteredData.slice(start, end).map(row => `
                    <tr class="table-row">
                        <td class="px-4 py-3 text-sm text-gray-900">${row[0]}</td>
                        <td class="px-4 py-3 text-sm font-medium text-gray-900">${row[1]}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${row[2]}</td>
                        <td class="px-4 py-3 text-sm">
                            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">${row[3]}</span>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-900 font-mono">${row[4]}</td>
                        <td class="px-4 py-3 text-sm text-gray-900 font-mono">${row[5]}</td>
                        <td class="px-4 py-3 text-sm text-gray-900 text-right">${row[6]}</td>
                        <td class="px-4 py-3 text-sm text-gray-900 text-right font-medium">${row[7]} kg</td>
                        <td class="px-4 py-3 text-sm text-gray-900">
                            <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">${row[8] || '-'}</span>
                        </td>
                    </tr>
                `).join('');
                
                this.updatePagination();
            },

            updatePagination() {
                const total = this.filteredData.length;
                const start = (this.currentPage - 1) * CONFIG.ITEMS_PER_PAGE + 1;
                const end = Math.min(this.currentPage * CONFIG.ITEMS_PER_PAGE, total);
                const maxPages = Math.ceil(total / CONFIG.ITEMS_PER_PAGE);
                
                const showingStart = document.getElementById('showingStart');
                const showingEnd = document.getElementById('showingEnd');
                const totalRecords = document.getElementById('totalRecords');
                const pageInfo = document.getElementById('pageInfo');
                const prevBtn = document.getElementById('prevBtn');
                const nextBtn = document.getElementById('nextBtn');
                
                if (showingStart) showingStart.textContent = total > 0 ? start : 0;
                if (showingEnd) showingEnd.textContent = end;
                if (totalRecords) totalRecords.textContent = total;
                if (pageInfo) pageInfo.textContent = `${this.currentPage} / ${maxPages}`;
                
                if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
                if (nextBtn) nextBtn.disabled = this.currentPage >= maxPages;
            },

            updateStats() {
                const totalItems = this.filteredData.reduce((sum, row) => sum + (parseInt(row[6]) || 0), 0);
                const totalKg = this.filteredData.reduce((sum, row) => sum + (parseInt(row[7]) || 0), 0);
                const uniqueProducts = new Set(this.filteredData.map(row => row[1])).size;
                const uniqueBrands = new Set(this.filteredData.map(row => row[3])).size;
                
                const totalItemsEl = document.getElementById('totalItems');
                const totalKgEl = document.getElementById('totalKg');
                const uniqueProductsEl = document.getElementById('uniqueProducts');
                const uniqueBrandsEl = document.getElementById('uniqueBrands');
                
                if (totalItemsEl) totalItemsEl.textContent = totalItems.toLocaleString();
                if (totalKgEl) totalKgEl.textContent = totalKg.toLocaleString();
                if (uniqueProductsEl) uniqueProductsEl.textContent = uniqueProducts;
                if (uniqueBrandsEl) uniqueBrandsEl.textContent = uniqueBrands;
                
                const targetDateData = this.getTargetDateData();
                const targetItemsMc = targetDateData.reduce((sum, row) => sum + (parseInt(row[6]) || 0), 0);
                const targetKg = targetDateData.reduce((sum, row) => sum + (parseInt(row[7]) || 0), 0);
                
                const todayItemsEl = document.getElementById('todayItems');
                const todayKgEl = document.getElementById('todayKg');
                const todayProductsEl = document.getElementById('todayProducts');
                const todayBrandsEl = document.getElementById('todayBrands');
                
                if (todayItemsEl) todayItemsEl.textContent = targetItemsMc.toLocaleString();
                if (todayKgEl) todayKgEl.textContent = targetKg.toLocaleString();
                if (todayProductsEl) todayProductsEl.textContent = new Set(targetDateData.map(row => row[1])).size;
                if (todayBrandsEl) todayBrandsEl.textContent = new Set(targetDateData.map(row => row[3])).size;
            },

            updateSummaries() {
                // PO Summary
                const poSummary = {};
                this.filteredData.forEach(row => {
                    const po = row[5];
                    if (!poSummary[po]) poSummary[po] = { items: 0, kg: 0, products: new Set() };
                    poSummary[po].items += parseInt(row[6]) || 0;
                    poSummary[po].kg += parseInt(row[7]) || 0;
                    poSummary[po].products.add(row[1]);
                });
                
                const sortedPOs = Object.entries(poSummary).sort((a, b) => b[1].kg - a[1].kg);
                const totalPOs = sortedPOs.length;
                const displayLimit = this.showAllPOs ? totalPOs : 6;
                const displayedPOs = sortedPOs.slice(0, displayLimit);
                
                const totalPOItems = sortedPOs.reduce((sum, [po, data]) => sum + data.items, 0);
                const totalPOKg = sortedPOs.reduce((sum, [po, data]) => sum + data.kg, 0);
                const avgItemsPerPO = totalPOs > 0 ? Math.round(totalPOItems / totalPOs) : 0;
                const avgKgPerPO = totalPOs > 0 ? Math.round(totalPOKg / totalPOs) : 0;
                
                const totalPOCountEl = document.getElementById('totalPOCount');
                const displayedPOCountEl = document.getElementById('displayedPOCount');
                const totalPOItemsEl = document.getElementById('totalPOItems');
                const totalPOKgEl = document.getElementById('totalPOKg');
                const avgItemsPerPOEl = document.getElementById('avgItemsPerPO');
                const avgKgPerPOEl = document.getElementById('avgKgPerPO');
                
                if (totalPOCountEl) totalPOCountEl.textContent = totalPOs;
                if (displayedPOCountEl) displayedPOCountEl.textContent = displayedPOs.length;
                if (totalPOItemsEl) totalPOItemsEl.textContent = totalPOItems.toLocaleString();
                if (totalPOKgEl) totalPOKgEl.textContent = totalPOKg.toLocaleString();
                if (avgItemsPerPOEl) avgItemsPerPOEl.textContent = avgItemsPerPO;
                if (avgKgPerPOEl) avgKgPerPOEl.textContent = avgKgPerPO;
                
                const showAllBtn = document.getElementById('showAllPOsBtn');
                const displayInfo = document.getElementById('poDisplayInfo');
                
                if (showAllBtn && displayInfo) {
                    if (this.showAllPOs) {
                        showAllBtn.innerHTML = '<i class="fas fa-eye-slash mr-2"></i>Tampilkan 6 Teratas';
                        displayInfo.textContent = `Menampilkan semua ${totalPOs} PO`;
                    } else {
                        showAllBtn.innerHTML = '<i class="fas fa-eye mr-2"></i>Tampilkan Semua PO';
                        displayInfo.textContent = `Menampilkan ${Math.min(6, totalPOs)} dari ${totalPOs} PO`;
                    }
                }
                
                const poSummaryEl = document.getElementById('poSummary');
                if (poSummaryEl) {
                    poSummaryEl.innerHTML = displayedPOs
                        .map(([po, data], index) => `
                            <div class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                                <div class="flex justify-between items-start mb-4">
                                    <h3 class="text-lg font-semibold text-gray-800">${po}</h3>
                                    <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">#${index + 1}</span>
                                </div>
                                <div class="space-y-3">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Total MC:</span>
                                        <span class="font-medium text-blue-600">${data.items}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Total Kg:</span>
                                        <span class="font-medium text-green-600">${data.kg.toLocaleString()} kg</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Jenis Produk:</span>
                                        <span class="font-medium text-purple-600">${data.products.size}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Rata-rata/Item:</span>
                                        <span class="font-medium text-orange-600">${Math.round(data.kg / data.items)} kg</span>
                                    </div>
                                    <div class="pt-2 border-t">
                                        <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Aktif</span>
                                    </div>
                                </div>
                            </div>
                        `).join('');
                }
                
                // Brand Summary
                const brandSummary = {};
                const brandItemCount = {};
                this.filteredData.forEach(row => {
                    const brand = row[3];
                    const product = row[1];
                    if (!brandSummary[brand]) {
                        brandSummary[brand] = {};
                        brandItemCount[brand] = 0;
                    }
                    if (!brandSummary[brand][product]) brandSummary[brand][product] = 0;
                    brandSummary[brand][product] += parseInt(row[7]) || 0;
                    brandItemCount[brand] += parseInt(row[6]) || 0;
                });
                
                const totalBrands = Object.keys(brandSummary).length;
                const totalBrandItems = Object.values(brandItemCount).reduce((sum, count) => sum + count, 0);
                const totalBrandWeight = Object.values(brandSummary).reduce((sum, products) => 
                    sum + Object.values(products).reduce((pSum, kg) => pSum + kg, 0), 0);
                const avgProductsPerBrand = totalBrands > 0 ? Math.round(
                    Object.values(brandSummary).reduce((sum, products) => sum + Object.keys(products).length, 0) / totalBrands
                ) : 0;
                const avgKgPerBrand = totalBrands > 0 ? Math.round(totalBrandWeight / totalBrands) : 0;
                
                const totalBrandCountEl = document.getElementById('totalBrandCount');
                const totalBrandKgEl = document.getElementById('totalBrandKg');
                const totalBrandItemsEl = document.getElementById('totalBrandItems');
                const totalBrandWeightEl = document.getElementById('totalBrandWeight');
                const avgProductsPerBrandEl = document.getElementById('avgProductsPerBrand');
                const avgKgPerBrandEl = document.getElementById('avgKgPerBrand');
                
                if (totalBrandCountEl) totalBrandCountEl.textContent = totalBrands;
                if (totalBrandKgEl) totalBrandKgEl.textContent = totalBrandWeight.toLocaleString() + ' kg';
                if (totalBrandItemsEl) totalBrandItemsEl.textContent = totalBrandItems.toLocaleString();
                if (totalBrandWeightEl) totalBrandWeightEl.textContent = totalBrandWeight.toLocaleString();
                if (avgProductsPerBrandEl) avgProductsPerBrandEl.textContent = avgProductsPerBrand;
                if (avgKgPerBrandEl) avgKgPerBrandEl.textContent = avgKgPerBrand;
                
                const sortedBrands = Object.entries(brandSummary).sort((a, b) => {
                    const totalA = Object.values(a[1]).reduce((sum, kg) => sum + kg, 0);
                    const totalB = Object.values(b[1]).reduce((sum, kg) => sum + kg, 0);
                    return totalB - totalA;
                });
                
                const brandSummaryEl = document.getElementById('brandSummary');
                if (brandSummaryEl) {
                    brandSummaryEl.innerHTML = sortedBrands
                        .map(([brand, products], index) => {
                            const total = Object.values(products).reduce((sum, kg) => sum + kg, 0);
                            const productCount = Object.keys(products).length;
                            const itemCount = brandItemCount[brand];
                            const avgPerProduct = productCount > 0 ? Math.round(total / productCount) : 0;
                            
                            return `
                                <div class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                                    <div class="flex justify-between items-start mb-4">
                                        <h3 class="text-lg font-semibold text-gray-800">${brand}</h3>
                                        <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">#${index + 1}</span>
                                    </div>
                                    <div class="space-y-3">
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Total MC:</span>
                                            <span class="font-medium text-blue-600">${itemCount}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Total Kg:</span>
                                            <span class="font-medium text-green-600">${total.toLocaleString()} kg</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Jenis Produk:</span>
                                            <span class="font-medium text-purple-600">${productCount}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Rata-rata/Produk:</span>
                                            <span class="font-medium text-orange-600">${avgPerProduct} kg</span>
                                        </div>
                                        <div class="pt-2 border-t">
                                            <div class="text-xs text-gray-500 mb-2">Top 3 Produk:</div>
                                            ${Object.entries(products)
                                                .sort((a, b) => b[1] - a[1])
                                                .slice(0, 3)
                                                .map(([product, kg]) => `
                                                    <div class="flex justify-between text-sm">
                                                        <span class="text-gray-600 truncate mr-2">${product}</span>
                                                        <span class="font-medium">${kg.toLocaleString()} kg</span>
                                                    </div>
                                                `).join('')}
                                        </div>
                                        <div class="pt-2 border-t">
                                            <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Aktif</span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('');
                }

                // Location Summary
                const locationSummary = {};
                const locationItemCount = {};
                this.filteredData.forEach(row => {
                    const location = row[8] || 'Tidak Diketahui';
                    const product = row[1];
                    if (!locationSummary[location]) {
                        locationSummary[location] = {};
                        locationItemCount[location] = 0;
                    }
                    if (!locationSummary[location][product]) locationSummary[location][product] = 0;
                    locationSummary[location][product] += parseInt(row[7]) || 0;
                    locationItemCount[location] += parseInt(row[6]) || 0;
                });
                
                const totalLocations = Object.keys(locationSummary).length;
                const totalLocationItems = Object.values(locationItemCount).reduce((sum, count) => sum + count, 0);
                const totalLocationWeight = Object.values(locationSummary).reduce((sum, products) => 
                    sum + Object.values(products).reduce((pSum, kg) => pSum + kg, 0), 0);
                const avgProductsPerLocation = totalLocations > 0 ? Math.round(
                    Object.values(locationSummary).reduce((sum, products) => sum + Object.keys(products).length, 0) / totalLocations
                ) : 0;
                const avgKgPerLocation = totalLocations > 0 ? Math.round(totalLocationWeight / totalLocations) : 0;
                
                const totalLocationCountEl = document.getElementById('totalLocationCount');
                const totalLocationKgEl = document.getElementById('totalLocationKg');
                const totalLocationItemsEl = document.getElementById('totalLocationItems');
                const totalLocationWeightEl = document.getElementById('totalLocationWeight');
                const avgProductsPerLocationEl = document.getElementById('avgProductsPerLocation');
                const avgKgPerLocationEl = document.getElementById('avgKgPerLocation');
                
                if (totalLocationCountEl) totalLocationCountEl.textContent = totalLocations;
                if (totalLocationKgEl) totalLocationKgEl.textContent = totalLocationWeight.toLocaleString() + ' kg';
                if (totalLocationItemsEl) totalLocationItemsEl.textContent = totalLocationItems.toLocaleString();
                if (totalLocationWeightEl) totalLocationWeightEl.textContent = totalLocationWeight.toLocaleString();
                if (avgProductsPerLocationEl) avgProductsPerLocationEl.textContent = avgProductsPerLocation;
                if (avgKgPerLocationEl) avgKgPerLocationEl.textContent = avgKgPerLocation;
                
                const sortedLocations = Object.entries(locationSummary).sort((a, b) => {
                    const totalA = Object.values(a[1]).reduce((sum, kg) => sum + kg, 0);
                    const totalB = Object.values(b[1]).reduce((sum, kg) => sum + kg, 0);
                    return totalB - totalA;
                });
                
                const locationSummaryEl = document.getElementById('locationSummary');
                if (locationSummaryEl) {
                    locationSummaryEl.innerHTML = sortedLocations
                        .map(([location, products], index) => {
                            const total = Object.values(products).reduce((sum, kg) => sum + kg, 0);
                            const productCount = Object.keys(products).length;
                            const itemCount = locationItemCount[location];
                            const avgPerProduct = productCount > 0 ? Math.round(total / productCount) : 0;
                            
                            return `
                                <div class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                                    <div class="flex justify-between items-start mb-4">
                                        <h3 class="text-lg font-semibold text-gray-800">${location}</h3>
                                        <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">#${index + 1}</span>
                                    </div>
                                    <div class="space-y-3">
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Total MC:</span>
                                            <span class="font-medium text-blue-600">${itemCount}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Total Kg:</span>
                                            <span class="font-medium text-green-600">${total.toLocaleString()} kg</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Jenis Produk:</span>
                                            <span class="font-medium text-purple-600">${productCount}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Rata-rata/Produk:</span>
                                            <span class="font-medium text-orange-600">${avgPerProduct} kg</span>
                                        </div>
                                        <div class="pt-2 border-t">
                                            <div class="text-xs text-gray-500 mb-2">Top 3 Produk:</div>
                                            ${Object.entries(products)
                                                .sort((a, b) => b[1] - a[1])
                                                .slice(0, 3)
                                                .map(([product, kg]) => `
                                                    <div class="flex justify-between text-sm">
                                                        <span class="text-gray-600 truncate mr-2">${product}</span>
                                                        <span class="font-medium">${kg.toLocaleString()} kg</span>
                                                    </div>
                                                `).join('')}
                                        </div>
                                        <div class="pt-2 border-t">
                                            <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Aktif</span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('');
                }

                // Kode Summary
                this.updateKodeSummary();
            },

            updateKodeSummary() {
                const kodeSummary = {};
                const kodeItemCount = {};
                
                // Filter data based on search term
                let filteredKodeData = this.filteredData;
                if (this.kodeSearchTerm) {
                    filteredKodeData = this.filteredData.filter(row => 
                        row[4] && row[4].toLowerCase().includes(this.kodeSearchTerm.toLowerCase())
                    );
                }
                
                filteredKodeData.forEach(row => {
                    const kode = row[4] || 'Tidak Diketahui';
                    const product = row[1];
                    if (!kodeSummary[kode]) {
                        kodeSummary[kode] = {};
                        kodeItemCount[kode] = 0;
                    }
                    if (!kodeSummary[kode][product]) kodeSummary[kode][product] = 0;
                    kodeSummary[kode][product] += parseInt(row[7]) || 0;
                    kodeItemCount[kode] += parseInt(row[6]) || 0;
                });
                
                const totalKodes = Object.keys(kodeSummary).length;
                const totalKodeItems = Object.values(kodeItemCount).reduce((sum, count) => sum + count, 0);
                const totalKodeWeight = Object.values(kodeSummary).reduce((sum, products) => 
                    sum + Object.values(products).reduce((pSum, kg) => pSum + kg, 0), 0);
                
                const totalKodeCountEl = document.getElementById('totalKodeCount');
                const totalKodeKgEl = document.getElementById('totalKodeKg');
                const totalKodeItemsEl = document.getElementById('totalKodeItems');
                const totalKodeWeightEl = document.getElementById('totalKodeWeight');
                
                if (totalKodeCountEl) totalKodeCountEl.textContent = totalKodes;
                if (totalKodeKgEl) totalKodeKgEl.textContent = totalKodeWeight.toLocaleString() + ' kg';
                if (totalKodeItemsEl) totalKodeItemsEl.textContent = totalKodeItems.toLocaleString();
                if (totalKodeWeightEl) totalKodeWeightEl.textContent = totalKodeWeight.toLocaleString();
                
                const sortedKodes = Object.entries(kodeSummary).sort((a, b) => {
                    const totalA = Object.values(a[1]).reduce((sum, kg) => sum + kg, 0);
                    const totalB = Object.values(b[1]).reduce((sum, kg) => sum + kg, 0);
                    return totalB - totalA;
                });
                
                const kodeSummaryEl = document.getElementById('kodeSummary');
                if (kodeSummaryEl) {
                    kodeSummaryEl.innerHTML = sortedKodes
                        .map(([kode, products], index) => {
                            const total = Object.values(products).reduce((sum, kg) => sum + kg, 0);
                            const productCount = Object.keys(products).length;
                            const itemCount = kodeItemCount[kode];
                            
                            return `
                                <div class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                                    <div class="flex justify-between items-start mb-4">
                                        <h3 class="text-lg font-semibold text-gray-800 font-mono">${kode}</h3>
                                        <span class="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">#${index + 1}</span>
                                    </div>
                                    <div class="space-y-3">
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Total MC:</span>
                                            <span class="font-medium text-blue-600">${itemCount}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Total Kg:</span>
                                            <span class="font-medium text-green-600">${total.toLocaleString()} kg</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Jenis Produk:</span>
                                            <span class="font-medium text-purple-600">${productCount}</span>
                                        </div>
                                        <div class="pt-2 border-t">
                                            <div class="text-xs text-gray-500 mb-2">Top 3 Produk:</div>
                                            ${Object.entries(products)
                                                .sort((a, b) => b[1] - a[1])
                                                .slice(0, 3)
                                                .map(([product, kg]) => `
                                                    <div class="flex justify-between text-sm">
                                                        <span class="text-gray-600 truncate mr-2">${product}</span>
                                                        <span class="font-medium">${kg.toLocaleString()} kg</span>
                                                    </div>
                                                `).join('')}
                                        </div>
                                        <div class="pt-2 border-t">
                                            <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Aktif</span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('');
                }
            },

            searchKode() {
                const searchInput = document.getElementById('kodeSearchInput');
                if (searchInput) {
                    this.kodeSearchTerm = searchInput.value.trim();
                    this.updateKodeSummary();
                }
            },

            resetKodeSearch() {
                const searchInput = document.getElementById('kodeSearchInput');
                if (searchInput) {
                    searchInput.value = '';
                    this.kodeSearchTerm = '';
                    this.updateKodeSummary();
                }
            },

            applyFilters() {
                const startDate = document.getElementById('startDate')?.value;
                const endDate = document.getElementById('endDate')?.value;
                const product = document.getElementById('productFilter')?.value;
                const brand = document.getElementById('brandFilter')?.value;
                const kode = document.getElementById('kodeFilter')?.value;
                const location = document.getElementById('locationFilter')?.value;
                const searchTerm = document.getElementById('searchProduct')?.value?.toLowerCase() || '';
                
                this.filteredData = this.stockData.filter(row => {
                    let matchesDate = true;
                    
                    if (startDate || endDate) {
                        const rowDate = this.parseDate(row[0]);
                        const filterStartDate = startDate ? new Date(startDate) : null;
                        const filterEndDate = endDate ? new Date(endDate) : null;
                        
                        if (filterStartDate && rowDate < filterStartDate) {
                            matchesDate = false;
                        }
                        if (filterEndDate && rowDate > filterEndDate) {
                            matchesDate = false;
                        }
                    }
                    
                    const matchesProduct = !product || row[1] === product;
                    const matchesBrand = !brand || row[3] === brand;
                    const matchesKode = !kode || row[4] === kode;
                    const matchesLocation = !location || row[8] === location;
                    
                    const matchesSearch = !searchTerm || 
                        row[1].toLowerCase().includes(searchTerm) ||
                        row[3].toLowerCase().includes(searchTerm);
                    
                    return matchesDate && matchesProduct && matchesBrand && matchesKode && matchesLocation && matchesSearch;
                });
                
                this.currentPage = 1;
                this.updateUI();
            },

            parseDate(dateString) {
                if (!dateString || dateString === '-') return new Date(0);
                
                let date;
                
                if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    date = new Date(dateString);
                }
                else if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                    const parts = dateString.split('/');
                    date = new Date(parts[2], parts[1] - 1, parts[0]);
                }
                else if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
                    const parts = dateString.split('-');
                    date = new Date(parts[2], parts[1] - 1, parts[0]);
                }
                else if (dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                    date = new Date(dateString);
                }
                else {
                    date = new Date(dateString);
                }
                
                return isNaN(date.getTime()) ? new Date(0) : date;
            },

            resetFilters() {
                const startDateEl = document.getElementById('startDate');
                const endDateEl = document.getElementById('endDate');
                const productFilterEl = document.getElementById('productFilter');
                const brandFilterEl = document.getElementById('brandFilter');
                const kodeFilterEl = document.getElementById('kodeFilter');
                const locationFilterEl = document.getElementById('locationFilter');
                const searchProductEl = document.getElementById('searchProduct');
                
                if (startDateEl) startDateEl.value = '';
                if (endDateEl) endDateEl.value = '';
                if (productFilterEl) productFilterEl.value = '';
                if (brandFilterEl) brandFilterEl.value = '';
                if (kodeFilterEl) kodeFilterEl.value = '';
                if (locationFilterEl) locationFilterEl.value = '';
                if (searchProductEl) searchProductEl.value = '';
                
                this.filteredData = [...this.stockData];
                this.currentPage = 1;
                this.updateUI();
            },

            sortTable(columnIndex) {
                if (this.sortColumn === columnIndex) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortColumn = columnIndex;
                    this.sortDirection = 'asc';
                }
                
                this.filteredData.sort((a, b) => {
                    let aVal = a[columnIndex];
                    let bVal = b[columnIndex];
                    
                    if (columnIndex === 6 || columnIndex === 7) {
                        aVal = parseInt(aVal) || 0;
                        bVal = parseInt(bVal) || 0;
                    }
                    
                    if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
                    if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
                    return 0;
                });
                
                this.populateTable();
            },

            previousPage() {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.populateTable();
                }
            },

            nextPage() {
                const maxPages = Math.ceil(this.filteredData.length / CONFIG.ITEMS_PER_PAGE);
                if (this.currentPage < maxPages) {
                    this.currentPage++;
                    this.populateTable();
                }
            },

            refreshData() {
                this.fetchData();
            },

            toggleShowAllPOs() {
                this.showAllPOs = !this.showAllPOs;
                this.updateSummaries();
            },

            getTargetDateData() {
                if (!this.targetDate) return [];
                
                const normalizedTargetDate = this.normalizeDate(this.targetDate);
                
                return this.filteredData.filter(row => {
                    const rowDate = this.normalizeDate(row[0]);
                    return rowDate === normalizedTargetDate;
                });
            },

            normalizeDate(dateString) {
                if (!dateString || dateString === '-') return '';
                
                const date = this.parseDate(dateString);
                if (isNaN(date.getTime())) return '';
                
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                
                return `${year}-${month}-${day}`;
            },

            getFormattedTargetDate() {
                if (!this.targetDate) return new Date().toLocaleDateString('id-ID');
                
                const date = this.parseDate(this.targetDate);
                if (isNaN(date.getTime())) return new Date().toLocaleDateString('id-ID');
                
                return date.toLocaleDateString('id-ID');
            },

            updateBrandSizeData() {
                // Process data to create brand-size-kode combinations
                const brandSizeMap = {};
                
                this.stockData.forEach(row => {
                    const brand = row[3] || 'Tidak Diketahui';
                    const size = row[2] || 'Tidak Diketahui';
                    const kode = row[4] || 'Tidak Diketahui';
                    const product = row[1] || 'Tidak Diketahui';
                    const mc = parseInt(row[6]) || 0;
                    const kg = parseInt(row[7]) || 0;
                    
                    const key = `${brand}|${size}|${kode}`;
                    
                    if (!brandSizeMap[key]) {
                        brandSizeMap[key] = {
                            brand: brand,
                            size: size,
                            kode: kode,
                            totalMc: 0,
                            totalKg: 0,
                            products: new Set()
                        };
                    }
                    
                    brandSizeMap[key].totalMc += mc;
                    brandSizeMap[key].totalKg += kg;
                    brandSizeMap[key].products.add(product);
                });
                
                // Convert to array format
                this.brandSizeData = Object.values(brandSizeMap).map(item => [
                    item.brand,
                    item.size,
                    item.kode,
                    item.totalMc,
                    item.totalKg,
                    Array.from(item.products).join(', ')
                ]);
                
                this.filteredBrandSizeData = [...this.brandSizeData];
                this.populateBrandSizeFilters();
                this.populateBrandSizeTable();
                this.updateBrandSizeStats();
            },

            populateBrandSizeFilters() {
                const sizes = [...new Set(this.brandSizeData.map(row => row[1]).filter(item => item && item !== 'Tidak Diketahui'))];
                const kodes = [...new Set(this.brandSizeData.map(row => row[2]).filter(item => item && item !== 'Tidak Diketahui'))];
                
                const sizeFilter = document.getElementById('sizeFilterSelect');
                const kodeFilter = document.getElementById('kodeFilterSelect');
                
                if (sizeFilter) {
                    sizeFilter.innerHTML = '<option value="">Semua Size</option>' + 
                        sizes.map(s => `<option value="${s}">${s}</option>`).join('');
                }
                
                if (kodeFilter) {
                    kodeFilter.innerHTML = '<option value="">Semua Kode</option>' + 
                        kodes.map(k => `<option value="${k}">${k}</option>`).join('');
                }
            },

            populateBrandSizeTable() {
                const tbody = document.getElementById('brandSizeTableBody');
                if (!tbody) return;
                
                const start = (this.brandSizeCurrentPage - 1) * CONFIG.ITEMS_PER_PAGE;
                const end = Math.min(start + CONFIG.ITEMS_PER_PAGE, this.filteredBrandSizeData.length);
                
                tbody.innerHTML = this.filteredBrandSizeData.slice(start, end).map(row => `
                    <tr class="table-row">
                        <td class="px-4 py-3 text-sm">
                            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">${row[0]}</span>
                        </td>
                        <td class="px-4 py-3 text-sm font-medium text-gray-900">${row[1]}</td>
                        <td class="px-4 py-3 text-sm text-gray-900 font-mono">${row[2]}</td>
                        <td class="px-4 py-3 text-sm text-gray-900 text-right font-bold text-blue-600">${row[3]}</td>
                        <td class="px-4 py-3 text-sm text-gray-900 text-right font-medium text-green-600">${row[4]} kg</td>
                        <td class="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title="${row[5]}">${row[5]}</td>
                    </tr>
                `).join('');
                
                this.updateBrandSizePagination();
            },

            updateBrandSizePagination() {
                const total = this.filteredBrandSizeData.length;
                const start = (this.brandSizeCurrentPage - 1) * CONFIG.ITEMS_PER_PAGE + 1;
                const end = Math.min(this.brandSizeCurrentPage * CONFIG.ITEMS_PER_PAGE, total);
                const maxPages = Math.ceil(total / CONFIG.ITEMS_PER_PAGE);
                
                const showingStart = document.getElementById('brandSizeShowingStart');
                const showingEnd = document.getElementById('brandSizeShowingEnd');
                const totalRecords = document.getElementById('brandSizeTotalRecords');
                const pageInfo = document.getElementById('brandSizePageInfo');
                const prevBtn = document.getElementById('brandSizePrevBtn');
                const nextBtn = document.getElementById('brandSizeNextBtn');
                
                if (showingStart) showingStart.textContent = total > 0 ? start : 0;
                if (showingEnd) showingEnd.textContent = end;
                if (totalRecords) totalRecords.textContent = total;
                if (pageInfo) pageInfo.textContent = `${this.brandSizeCurrentPage} / ${maxPages}`;
                
                if (prevBtn) prevBtn.disabled = this.brandSizeCurrentPage <= 1;
                if (nextBtn) nextBtn.disabled = this.brandSizeCurrentPage >= maxPages;
            },

            updateBrandSizeStats() {
                const totalCombinations = this.filteredBrandSizeData.length;
                const totalItems = this.filteredBrandSizeData.reduce((sum, row) => sum + (parseInt(row[3]) || 0), 0);
                const totalKg = this.filteredBrandSizeData.reduce((sum, row) => sum + (parseInt(row[4]) || 0), 0);
                const uniqueBrands = new Set(this.filteredBrandSizeData.map(row => row[0])).size;
                const uniqueSizes = new Set(this.filteredBrandSizeData.map(row => row[1])).size;
                
                const totalCombinationsEl = document.getElementById('totalBrandSizeCombinations');
                const totalItemsEl = document.getElementById('totalBrandSizeItems');
                const totalKgEl = document.getElementById('totalBrandSizeKg');
                const uniqueBrandsEl = document.getElementById('uniqueBrandSizeBrands');
                const uniqueSizesEl = document.getElementById('uniqueBrandSizeSizes');
                
                if (totalCombinationsEl) totalCombinationsEl.textContent = totalCombinations;
                if (totalItemsEl) totalItemsEl.textContent = totalItems.toLocaleString();
                if (totalKgEl) totalKgEl.textContent = totalKg.toLocaleString();
                if (uniqueBrandsEl) uniqueBrandsEl.textContent = uniqueBrands;
                if (uniqueSizesEl) uniqueSizesEl.textContent = uniqueSizes;
            },

            searchBrandSize() {
                const searchInput = document.getElementById('brandSizeSearchInput');
                const sizeFilter = document.getElementById('sizeFilterSelect');
                const kodeFilter = document.getElementById('kodeFilterSelect');
                
                this.brandSizeSearchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
                this.sizeFilter = sizeFilter ? sizeFilter.value : '';
                this.kodeFilterBrandSize = kodeFilter ? kodeFilter.value : '';
                
                this.filteredBrandSizeData = this.brandSizeData.filter(row => {
                    const matchesBrand = !this.brandSizeSearchTerm || 
                        row[0].toLowerCase().includes(this.brandSizeSearchTerm);
                    const matchesSize = !this.sizeFilter || row[1] === this.sizeFilter;
                    const matchesKode = !this.kodeFilterBrandSize || row[2] === this.kodeFilterBrandSize;
                    
                    return matchesBrand && matchesSize && matchesKode;
                });
                
                this.brandSizeCurrentPage = 1;
                this.populateBrandSizeTable();
                this.updateBrandSizeStats();
            },

            resetBrandSizeSearch() {
                const searchInput = document.getElementById('brandSizeSearchInput');
                const sizeFilter = document.getElementById('sizeFilterSelect');
                const kodeFilter = document.getElementById('kodeFilterSelect');
                
                if (searchInput) searchInput.value = '';
                if (sizeFilter) sizeFilter.value = '';
                if (kodeFilter) kodeFilter.value = '';
                
                this.brandSizeSearchTerm = '';
                this.sizeFilter = '';
                this.kodeFilterBrandSize = '';
                this.filteredBrandSizeData = [...this.brandSizeData];
                this.brandSizeCurrentPage = 1;
                
                this.populateBrandSizeTable();
                this.updateBrandSizeStats();
            },

            sortBrandSizeTable(columnIndex) {
                if (this.brandSizeSortColumn === columnIndex) {
                    this.brandSizeSortDirection = this.brandSizeSortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.brandSizeSortColumn = columnIndex;
                    this.brandSizeSortDirection = 'asc';
                }
                
                this.filteredBrandSizeData.sort((a, b) => {
                    let aVal = a[columnIndex];
                    let bVal = b[columnIndex];
                    
                    if (columnIndex === 3 || columnIndex === 4) {
                        aVal = parseInt(aVal) || 0;
                        bVal = parseInt(bVal) || 0;
                    }
                    
                    if (aVal < bVal) return this.brandSizeSortDirection === 'asc' ? -1 : 1;
                    if (aVal > bVal) return this.brandSizeSortDirection === 'asc' ? 1 : -1;
                    return 0;
                });
                
                this.populateBrandSizeTable();
            },

            previousBrandSizePage() {
                if (this.brandSizeCurrentPage > 1) {
                    this.brandSizeCurrentPage--;
                    this.populateBrandSizeTable();
                }
            },

            nextBrandSizePage() {
                const maxPages = Math.ceil(this.filteredBrandSizeData.length / CONFIG.ITEMS_PER_PAGE);
                if (this.brandSizeCurrentPage < maxPages) {
                    this.brandSizeCurrentPage++;
                    this.populateBrandSizeTable();
                }
            }
        };

        // UI Management
        const UI = {
            showLoading() {
                const tbody = document.getElementById('stockTableBody');
                if (tbody) {
                    tbody.innerHTML = `
                        <tr><td colspan="9" class="px-6 py-12 text-center">
                            <div class="flex flex-col items-center">
                                <div class="loading-spinner w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                                <p class="text-gray-600">Memuat data...</p>
                            </div>
                        </td></tr>
                    `;
                }
            },

            hideLoading() {
                // Loading will be replaced by actual data
            },

            showError(message) {
                const tbody = document.getElementById('stockTableBody');
                if (tbody) {
                    tbody.innerHTML = `
                        <tr><td colspan="9" class="px-6 py-12 text-center">
                            <div class="flex flex-col items-center">
                                <i class="fas fa-exclamation-triangle text-yellow-500 text-3xl mb-4"></i>
                                <p class="text-gray-600 mb-2">Gagal memuat data</p>
                                <p class="text-sm text-gray-500 mb-4">${message}</p>
                                <button onclick="DataManager.refreshData()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                                    <i class="fas fa-refresh mr-2"></i>Coba Lagi
                                </button>
                            </div>
                        </td></tr>
                    `;
                }
            },

            setConnectionStatus(connected) {
                const status = document.getElementById('connectionStatus');
                const statusText = status?.nextElementSibling;
                
                if (status && statusText) {
                    if (connected) {
                        status.className = 'w-2 h-2 bg-green-500 rounded-full mr-2';
                        statusText.textContent = 'Terhubung';
                    } else {
                        status.className = 'w-2 h-2 bg-red-500 rounded-full mr-2';
                        statusText.textContent = 'Terputus';
                    }
                }
            },

            toggleSidebar() {
                const sidebar = document.querySelector('.sidebar');
                const overlay = document.querySelector('.mobile-overlay');
                
                if (sidebar) sidebar.classList.toggle('open');
                if (overlay) overlay.classList.toggle('show');
            },

            closeSidebar() {
                const sidebar = document.querySelector('.sidebar');
                const overlay = document.querySelector('.mobile-overlay');
                
                if (sidebar) sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('show');
            },

            showSection(sectionName) {
                document.querySelectorAll('.section').forEach(section => {
                    section.classList.add('hidden');
                });
                
                const targetSection = document.getElementById(sectionName + '-section');
                if (targetSection) {
                    targetSection.classList.remove('hidden');
                }
                
                document.querySelectorAll('.sidebar-item').forEach(item => {
                    item.classList.remove('bg-gradient-to-r', 'from-blue-500', 'to-purple-600', 'text-white');
                    item.classList.add('text-gray-700');
                });
                
                if (event && event.target) {
                    const sidebarItem = event.target.closest('.sidebar-item');
                    if (sidebarItem) {
                        sidebarItem.classList.add('bg-gradient-to-r', 'from-blue-500', 'to-purple-600', 'text-white');
                        sidebarItem.classList.remove('text-gray-700');
                    }
                }
                
                if (window.innerWidth <= 768) {
                    this.closeSidebar();
                }
            }
        };

        // Charts Management
        const Charts = {
            brandChart: null,
            trendChart: null,

            init() {
                this.initBrandChart();
                this.initTrendChart();
            },

            initBrandChart() {
                const ctx = document.getElementById('brandChart');
                if (!ctx) return;
                
                this.brandChart = new Chart(ctx.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: [],
                        datasets: [{
                            data: [],
                            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { position: 'bottom' } }
                    }
                });
            },

            initTrendChart() {
                const ctx = document.getElementById('trendChart');
                if (!ctx) return;
                
                this.trendChart = new Chart(ctx.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Total Stok (kg)',
                            data: [],
                            borderColor: '#3B82F6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: '#3B82F6',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            pointRadius: 5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { 
                            y: { 
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return value.toLocaleString() + ' kg';
                                    }
                                }
                            },
                            x: {
                                ticks: {
                                    maxRotation: 45
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} kg`;
                                    }
                                }
                            },
                            legend: {
                                display: true,
                                position: 'top'
                            }
                        }
                    }
                });
            },

            updateCharts() {
                if (!this.brandChart || !DataManager.filteredData.length) return;
                
                const brandData = {};
                DataManager.filteredData.forEach(row => {
                    const brand = row[3];
                    const kg = parseInt(row[7]) || 0;
                    brandData[brand] = (brandData[brand] || 0) + kg;
                });
                
                const brands = Object.keys(brandData).slice(0, 5);
                const values = brands.map(brand => brandData[brand]);
                
                this.brandChart.data.labels = brands;
                this.brandChart.data.datasets[0].data = values;
                this.brandChart.update();
                
                this.updateTrendChart();
            },

            updateTrendChart() {
                if (!this.trendChart || !DataManager.filteredData.length) return;
                
                const dailyData = {};
                DataManager.filteredData.forEach(row => {
                    const date = row[0];
                    const kg = parseInt(row[7]) || 0;
                    
                    if (date && date !== '-') {
                        if (!dailyData[date]) dailyData[date] = 0;
                        dailyData[date] += kg;
                    }
                });
                
                const sortedDates = Object.keys(dailyData).sort();
                const last7Days = sortedDates.slice(-7);
                
                const labels = [];
                const data = [];
                
                if (last7Days.length > 0) {
                    last7Days.forEach(date => {
                        const dateObj = DataManager.parseDate(date);
                        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
                        labels.push(formattedDate);
                        data.push(dailyData[date]);
                    });
                } else {
                    const today = new Date();
                    for (let i = 6; i >= 0; i--) {
                        const date = new Date(today);
                        date.setDate(today.getDate() - i);
                        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                        labels.push(formattedDate);
                        data.push(0);
                    }
                }
                
                this.trendChart.data.labels = labels;
                this.trendChart.data.datasets[0].data = data;
                this.trendChart.update();
            }
        };

        // Utilities
        const Utils = {
            exportToPDF() {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('Dashboard Stok WKB', 14, 20);
                
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.text(`Diekspor: ${new Date().toLocaleDateString('id-ID')}`, 14, 30);
                
                const headers = ['Tanggal', 'Produk', 'Packing', 'Brand', 'Kode', 'PO', 'mc', 'Kg', 'Lokasi'];
                const tableData = DataManager.filteredData.map(row => [
                    row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8] || '-'
                ]);
                
                doc.autoTable({
                    head: [headers],
                    body: tableData,
                    startY: 40,
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
                    alternateRowStyles: { fillColor: [248, 250, 252] }
                });
                
                const finalY = doc.lastAutoTable.finalY + 10;
                const totalKg = DataManager.filteredData.reduce((sum, row) => sum + (parseInt(row[7]) || 0), 0);
                
                doc.setFont(undefined, 'bold');
                doc.text(`Total: ${DataManager.filteredData.length} item, ${totalKg.toLocaleString()} kg`, 14, finalY);
                
                doc.save('Breakdown kode.pdf');
            },

            exportBrandSizeToPDF() {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('Breakdown kode', 14, 20);
                
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.text(`Diekspor: ${new Date().toLocaleDateString('id-ID')}`, 14, 30);
                
                const headers = ['Brand', 'Size/Packing', 'Kode', 'Jumlah MC', 'Total Kg', 'Produk'];
                const tableData = DataManager.filteredBrandSizeData.map(row => [
                    row[0], row[1], row[2], row[3], row[4] + ' kg', 
                    row[5].length > 50 ? row[5].substring(0, 50) + '...' : row[5]
                ]);
                
                doc.autoTable({
                    head: [headers],
                    body: tableData,
                    startY: 40,
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [147, 51, 234], textColor: 255 },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    columnStyles: {
                        3: { halign: 'right' },
                        4: { halign: 'right' }
                    }
                });
                
                const finalY = doc.lastAutoTable.finalY + 10;
                const totalMc = DataManager.filteredBrandSizeData.reduce((sum, row) => sum + (parseInt(row[3]) || 0), 0);
                const totalKg = DataManager.filteredBrandSizeData.reduce((sum, row) => sum + (parseInt(row[4]) || 0), 0);
                
                doc.setFont(undefined, 'bold');
                doc.text(`Total: ${DataManager.filteredBrandSizeData.length} kombinasi, ${totalMc.toLocaleString()} MC, ${totalKg.toLocaleString()} kg`, 14, finalY);
                
                doc.save('brand-size-per-kode.pdf');
            },

            setCurrentDate() {
                const currentDateEl = document.getElementById('currentDate');
                if (currentDateEl) {
                    currentDateEl.textContent = 'Memuat...';
                }
            },

            updateCurrentDate() {
                const formattedDate = DataManager.getFormattedTargetDate();
                const currentDateEl = document.getElementById('currentDate');
                const targetDateEl = document.getElementById('targetDateDisplay');
                
                if (currentDateEl) currentDateEl.textContent = formattedDate;
                if (targetDateEl) targetDateEl.textContent = formattedDate;
            }
        };

        // Initialize Application
        document.addEventListener('DOMContentLoaded', () => {
            Auth.init();
            
            const searchInput = document.getElementById('searchProduct');
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    clearTimeout(this.searchTimeout);
                    this.searchTimeout = setTimeout(() => {
                        DataManager.applyFilters();
                    }, 300);
                });
            }

            const kodeSearchInput = document.getElementById('kodeSearchInput');
            if (kodeSearchInput) {
                kodeSearchInput.addEventListener('input', function() {
                    clearTimeout(this.kodeSearchTimeout);
                    this.kodeSearchTimeout = setTimeout(() => {
                        DataManager.searchKode();
                    }, 300);
                });
            }

            const brandSizeSearchInput = document.getElementById('brandSizeSearchInput');
            if (brandSizeSearchInput) {
                brandSizeSearchInput.addEventListener('input', function() {
                    clearTimeout(this.brandSizeSearchTimeout);
                    this.brandSizeSearchTimeout = setTimeout(() => {
                        DataManager.searchBrandSize();
                    }, 300);
                });
            }
            
            setInterval(() => {
                if (Auth.currentUser) {
                    DataManager.refreshData();
                }
            }, CONFIG.REFRESH_INTERVAL);
        });
    </script>
<script>(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'967e21f830172c28',t:'MTc1Mzk3NTc4MS4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();</script></body>
</html>
