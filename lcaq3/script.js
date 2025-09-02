class DataGrid {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.pageSize = 25;
        this.sortColumn = null;
        this.sortDirection = 'none';
        this.columnFilters = {};
        this.globalFilter = '';
        
        this.init();
    }
    
    async init() {
        this.showLoading();
        await this.loadData();
        this.hideLoading();
        this.setupEventListeners();
        this.render();
    }
    
    async loadData() {
        try {
            const response = await fetch('LCA_2025_Q3.csv');
            const csvText = await response.text();
            this.data = this.parseCsv(csvText);
            this.filteredData = [...this.data];
            console.log(`Loaded ${this.data.length} records`);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Error loading data. Please make sure LCA_2025_Q3.csv is in the same directory.');
        }
    }
    
    parseCsv(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
        const records = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const values = this.parseCsvLine(lines[i]);
            const record = {};
            
            headers.forEach((header, index) => {
                record[header] = values[index] || '';
            });
            
            records.push(record);
        }
        
        return records;
    }
    
    parseCsvLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }
    
    setupEventListeners() {
        const globalSearch = document.getElementById('globalSearch');
        globalSearch.addEventListener('input', (e) => {
            this.globalFilter = e.target.value.toLowerCase();
            this.applyFilters();
        });
        
        const pageSize = document.getElementById('pageSize');
        pageSize.addEventListener('change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.currentPage = 1;
            this.render();
        });
        
        const sortButtons = document.querySelectorAll('.sort-btn');
        sortButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const column = e.target.closest('th').dataset.column;
                this.handleSort(column);
            });
        });
        
        const columnFilters = document.querySelectorAll('.column-filter');
        columnFilters.forEach(filter => {
            filter.addEventListener('input', (e) => {
                const column = e.target.closest('th').dataset.column;
                this.columnFilters[column] = e.target.value.toLowerCase();
                this.applyFilters();
            });
        });
        
        document.getElementById('firstPage').addEventListener('click', () => this.goToPage(1));
        document.getElementById('prevPage').addEventListener('click', () => this.goToPage(this.currentPage - 1));
        document.getElementById('nextPage').addEventListener('click', () => this.goToPage(this.currentPage + 1));
        document.getElementById('lastPage').addEventListener('click', () => this.goToPage(this.getTotalPages()));
        
        document.getElementById('downloadCsv').addEventListener('click', () => this.downloadCsv());
    }
    
    handleSort(column) {
        if (this.sortColumn === column) {
            if (this.sortDirection === 'none') {
                this.sortDirection = 'asc';
            } else if (this.sortDirection === 'asc') {
                this.sortDirection = 'desc';
            } else {
                this.sortDirection = 'none';
                this.sortColumn = null;
            }
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        
        this.updateSortButtons();
        this.applySorting();
        this.render();
    }
    
    updateSortButtons() {
        const sortButtons = document.querySelectorAll('.sort-btn');
        sortButtons.forEach(btn => {
            const column = btn.closest('th').dataset.column;
            if (column === this.sortColumn) {
                if (this.sortDirection === 'asc') {
                    btn.textContent = '↑';
                    btn.dataset.direction = 'asc';
                } else if (this.sortDirection === 'desc') {
                    btn.textContent = '↓';
                    btn.dataset.direction = 'desc';
                } else {
                    btn.textContent = '⇅';
                    btn.dataset.direction = 'none';
                }
            } else {
                btn.textContent = '⇅';
                btn.dataset.direction = 'none';
            }
        });
    }
    
    applySorting() {
        if (!this.sortColumn || this.sortDirection === 'none') {
            return;
        }
        
        this.filteredData.sort((a, b) => {
            let aVal = a[this.sortColumn] || a['\ufeff' + this.sortColumn] || '';
            let bVal = b[this.sortColumn] || b['\ufeff' + this.sortColumn] || '';
            
            if (this.sortColumn.includes('WAGE') || this.sortColumn.includes('DATE')) {
                if (this.sortColumn.includes('WAGE')) {
                    aVal = parseFloat(aVal.replace(/[$,\s]/g, '')) || 0;
                    bVal = parseFloat(bVal.replace(/[$,\s]/g, '')) || 0;
                } else {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                }
                
                if (this.sortDirection === 'asc') {
                    return aVal - bVal;
                } else {
                    return bVal - aVal;
                }
            } else {
                aVal = aVal.toString().toLowerCase();
                bVal = bVal.toString().toLowerCase();
                
                if (this.sortDirection === 'asc') {
                    return aVal.localeCompare(bVal);
                } else {
                    return bVal.localeCompare(aVal);
                }
            }
        });
    }
    
    applyFilters() {
        this.filteredData = this.data.filter(record => {
            if (this.globalFilter) {
                const searchText = Object.values(record).join(' ').toLowerCase();
                if (!searchText.includes(this.globalFilter)) {
                    return false;
                }
            }
            
            for (const [column, filterValue] of Object.entries(this.columnFilters)) {
                if (filterValue) {
                    const cellValue = record[column] || record['\ufeff' + column] || '';
                    if (!cellValue.toString().toLowerCase().includes(filterValue)) {
                        return false;
                    }
                }
            }
            
            return true;
        });
        
        this.currentPage = 1;
        this.applySorting();
        this.render();
    }
    
    getTotalPages() {
        return Math.ceil(this.filteredData.length / this.pageSize);
    }
    
    goToPage(page) {
        const totalPages = this.getTotalPages();
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.render();
        }
    }
    
    render() {
        this.renderTable();
        this.renderPagination();
    }
    
    renderTable() {
        const tbody = document.getElementById('tableBody');
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        tbody.innerHTML = '';
        
        pageData.forEach(record => {
            const row = document.createElement('tr');
            
            const employerName = record['EMPLOYER_NAME'] || '';
            const jobTitle = record['JOB_TITLE'] || '';
            const employmentStatus = record['EMPLOYMENT_STATUS'] || '';
            const city = record['WORKSITE_CITY'] || '';
            const state = record['WORKSITE_STATE'] || '';
            const wageFrom = record['WAGE_RATE_OF_PAY_FROM'] || '';
            const wageTo = record['WAGE_RATE_OF_PAY_TO'] || '';
            const beginDate = record['BEGIN_DATE'] || '';
            const endDate = record['END_DATE'] || '';
            
            row.innerHTML = `
                <td title="${employerName}">${employerName}</td>
                <td title="${jobTitle}">${jobTitle}</td>
                <td title="${employmentStatus}">${employmentStatus}</td>
                <td title="${city}">${city}</td>
                <td title="${state}">${state}</td>
                <td title="${wageFrom}">${wageFrom}</td>
                <td title="${wageTo}">${wageTo}</td>
                <td title="${beginDate}">${beginDate}</td>
                <td title="${endDate}">${endDate}</td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    renderPagination() {
        const totalPages = this.getTotalPages();
        const startRecord = (this.currentPage - 1) * this.pageSize + 1;
        const endRecord = Math.min(this.currentPage * this.pageSize, this.filteredData.length);
        
        document.getElementById('paginationInfo').textContent = 
            `Showing ${startRecord} - ${endRecord} of ${this.filteredData.length} records`;
        
        document.getElementById('firstPage').disabled = this.currentPage === 1;
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === totalPages || totalPages === 0;
        document.getElementById('lastPage').disabled = this.currentPage === totalPages || totalPages === 0;
        
        const pageNumbers = document.getElementById('pageNumbers');
        pageNumbers.innerHTML = '';
        
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = i === this.currentPage ? 'page-btn active' : 'page-btn';
            pageBtn.addEventListener('click', () => this.goToPage(i));
            pageNumbers.appendChild(pageBtn);
        }
    }
    
    downloadCsv() {
        const headers = [
            'Employer Name',
            'Job Title', 
            'Employment Status',
            'City',
            'State',
            'Wage From',
            'Wage To',
            'Begin Date',
            'End Date'
        ];
        
        const csvContent = [headers.join(',')];
        
        this.filteredData.forEach(record => {
            const row = [
                this.escapeCsvField(record['EMPLOYER_NAME'] || ''),
                this.escapeCsvField(record['JOB_TITLE'] || ''),
                this.escapeCsvField(record['EMPLOYMENT_STATUS'] || ''),
                this.escapeCsvField(record['WORKSITE_CITY'] || ''),
                this.escapeCsvField(record['WORKSITE_STATE'] || ''),
                this.escapeCsvField(record['WAGE_RATE_OF_PAY_FROM'] || ''),
                this.escapeCsvField(record['WAGE_RATE_OF_PAY_TO'] || ''),
                this.escapeCsvField(record['BEGIN_DATE'] || ''),
                this.escapeCsvField(record['END_DATE'] || '')
            ];
            csvContent.push(row.join(','));
        });
        
        const csvString = csvContent.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `lca_filtered_data_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    
    escapeCsvField(field) {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }
    
    showLoading() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const dataTable = document.getElementById('dataTable');
        loadingIndicator.style.display = 'flex';
        dataTable.style.display = 'none';
    }
    
    hideLoading() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const dataTable = document.getElementById('dataTable');
        loadingIndicator.style.display = 'none';
        dataTable.style.display = 'table';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DataGrid();
});