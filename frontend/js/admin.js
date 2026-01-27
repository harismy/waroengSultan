// API Base URL
const API_BASE_URL = window.location.origin;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const adminUsername = document.getElementById('adminUsername');
const tabButtons = document.querySelectorAll('.sidebar-nav li');
const tabContents = document.querySelectorAll('.tab-content');

// State
let currentAdmin = null;
let addCakeFormInitialized = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    setupEventListeners();
});

// Check Admin Session
async function checkSession() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/check-session`);
        const data = await response.json();
        
        if (data.authenticated) {
            currentAdmin = data.user;
            showDashboard();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('Session check error:', error);
        showLoginScreen();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            switchTab(tabId);
        });
    });
    
    // Initialize tabs
    switchTab('dashboard');
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentAdmin = result.user;
            showDashboard();
        } else {
            showAlert('error', result.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('error', 'Terjadi kesalahan saat login');
    } finally {
        hideLoading();
    }
}

// Handle Logout
async function handleLogout() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/logout`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentAdmin = null;
            showLoginScreen();
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Show Login Screen
function showLoginScreen() {
    loginScreen.style.display = 'flex';
    adminDashboard.style.display = 'none';
    loginForm.reset();
}

// Show Dashboard
function showDashboard() {
    loginScreen.style.display = 'none';
    adminDashboard.style.display = 'flex';
    adminUsername.textContent = currentAdmin?.username || 'Admin';
    loadDashboardStats();
    loadCakesTable();
    loadRecentCakes();
}

// Switch Tab
function switchTab(tabId) {
    const tabIdMap = {
        'manage-cakes': 'manageCakesTab',
        'add-cake': 'addCakeTab'
    };
    const targetContentId = tabIdMap[tabId] || `${tabId}Tab`;

    // Update active tab button
    tabButtons.forEach(button => {
        button.classList.remove('active');
        if (button.dataset.tab === tabId) {
            button.classList.add('active');
        }
    });
    
    // Update active tab content
    tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === targetContentId) {
            content.classList.add('active');
        }
    });
    
    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    pageTitle.textContent = getTabTitle(tabId);
    
    // Load tab-specific data
    switch(tabId) {
        case 'dashboard':
            loadDashboardStats();
            loadRecentCakes();
            break;
        case 'manage-cakes':
            loadCakesTable();
            break;
        case 'add-cake':
            setupAddCakeForm();
            break;
        case 'orders':
            break;
    }
}

// Get Tab Title
function getTabTitle(tabId) {
    const titles = {
        'dashboard': 'Dashboard',
        'manage-cakes': 'Kelola Kue',
        'add-cake': 'Tambah Kue',
        'settings': 'Pengaturan'
    };
    return titles[tabId] || tabId;
}

// Show Loading
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'flex';
    }
}

// Hide Loading
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

// Show Alert
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? 
            'background-color: #d4edda; color: #155724;' : 
            'background-color: #f8d7da; color: #721c24;'
        }
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
}

// Load Dashboard Stats
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/stats`);
        const stats = await response.json();
        
        document.getElementById('totalCakes').textContent = stats.totalCakes;
        document.getElementById('availableCakes').textContent = stats.availableCakes;
        document.getElementById('totalStock').textContent = stats.totalStock;
        const totalFeaturedEl = document.getElementById('totalFeatured');
        if (totalFeaturedEl) {
            totalFeaturedEl.textContent = stats.availableCakes || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load Cakes Table
async function loadCakesTable() {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/cakes`);
        const cakes = await response.json();
        
        const tableBody = document.getElementById('cakesTable');
        tableBody.innerHTML = '';
        
        cakes.forEach(cake => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cake.id}</td>
                <td><img src="/uploads/${cake.image}" alt="${cake.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;"></td>
                <td>${cake.name}</td>
                <td>${getCategoryLabel(cake.category)}</td>
                <td>Rp ${cake.price.toLocaleString()}</td>
                <td>${cake.stock}</td>
                <td>
                    <span class="status-badge ${cake.is_available ? 'status-available' : 'status-unavailable'}">
                        ${cake.is_available ? 'Tersedia' : 'Habis'}
                    </span>
                </td>
                <td>
                    <button class="btn-action btn-edit" data-id="${cake.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-action btn-delete" data-id="${cake.id}">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', (e) => {
                const cakeId = e.target.closest('button').dataset.id;
                showEditModal(cakeId);
            });
        });
        
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', (e) => {
                const cakeId = e.target.closest('button').dataset.id;
                deleteCake(cakeId);
            });
        });
        
    } catch (error) {
        console.error('Error loading cakes table:', error);
        showAlert('error', 'Gagal memuat data kue');
    } finally {
        hideLoading();
    }
}

// Setup Add Cake Form
function setupAddCakeForm() {
    const form = document.getElementById('addCakeForm');
    const imageInput = document.getElementById('cakeImage');
    const imagePreview = document.getElementById('imagePreview');
    
    // Reset form
    form.reset();
    imagePreview.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <p>Klik untuk upload gambar</p>
    `;

    if (addCakeFormInitialized) return;
    addCakeFormInitialized = true;

    // Image preview
    imagePreview.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <p>${file.name}</p>
                `;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        
        showLoading();
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/cakes`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                await response.json();
                showAlert('success', 'Kue berhasil ditambahkan');
                form.reset();
                imagePreview.innerHTML = `
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Klik untuk upload gambar</p>
                `;
                
                // Reload cakes table
                switchTab('manage-cakes');
            } else {
                const error = await response.json();
                throw new Error(error.message);
            }
        } catch (error) {
            console.error('Error adding cake:', error);
            showAlert('error', error.message || 'Gagal menambahkan kue');
        } finally {
            hideLoading();
        }
    });
}

// Show Edit Modal
async function showEditModal(cakeId) {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/cakes/${cakeId}`);
        const cake = await response.json();
        
        // Fill form
        document.getElementById('editCakeId').value = cake.id;
        document.getElementById('editCakeName').value = cake.name;
        document.getElementById('editCakeDescription').value = cake.description;
        document.getElementById('editCakePrice').value = cake.price;
        document.getElementById('editCakeStock').value = cake.stock;
        document.getElementById('editCakeCategory').value = cake.category;
        document.getElementById('editCakeAvailable').checked = cake.is_available;
        
        // Set image preview
        const currentImage = document.getElementById('currentImage');
        currentImage.src = `/uploads/${cake.image}`;
        
        // Show modal
        const modal = document.getElementById('editModal');
        modal.style.display = 'flex';
        
        // Setup form submission
        const form = document.getElementById('editCakeForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await updateCake(cakeId);
        };
        
        // Setup delete button
        const deleteBtn = document.getElementById('deleteCakeBtn');
        deleteBtn.onclick = () => {
            if (confirm('Apakah Anda yakin ingin menghapus kue ini?')) {
                deleteCake(cakeId);
            }
        };
        
        // Close modal
        document.querySelector('#editModal .close-modal').onclick = () => {
            modal.style.display = 'none';
        };
        
        // Image preview for edit
    const editImageInput = document.getElementById('editCakeImage');
    const editImagePreview = document.getElementById('editImagePreview');
    
    editImagePreview.addEventListener('click', () => {
        editImageInput.click();
    });

    editImageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
                reader.onload = function(e) {
                    currentImage.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
        
    } catch (error) {
        console.error('Error loading cake for edit:', error);
        showAlert('error', 'Gagal memuat data kue');
    } finally {
        hideLoading();
    }
}

// Update Cake
async function updateCake(cakeId) {
    const form = document.getElementById('editCakeForm');
    const formData = new FormData(form);
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/cakes/${cakeId}`, {
            method: 'PUT',
            body: formData
        });
        
        if (response.ok) {
            const updatedCake = await response.json();
            showAlert('success', 'Kue berhasil diperbarui');
            
            // Close modal
            document.getElementById('editModal').style.display = 'none';
            
            // Reload tables
            loadCakesTable();
            loadDashboardStats();
        } else {
            const error = await response.json();
            throw new Error(error.message);
        }
    } catch (error) {
        console.error('Error updating cake:', error);
        showAlert('error', error.message || 'Gagal memperbarui kue');
    } finally {
        hideLoading();
    }
}

// Delete Cake
async function deleteCake(cakeId) {
    if (!confirm('Apakah Anda yakin ingin menghapus kue ini?')) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/cakes/${cakeId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('success', 'Kue berhasil dihapus');
            
            // Close modal if open
            document.getElementById('editModal').style.display = 'none';
            
            // Reload tables
            loadCakesTable();
            loadDashboardStats();
        } else {
            const error = await response.json();
            throw new Error(error.message);
        }
    } catch (error) {
        console.error('Error deleting cake:', error);
        showAlert('error', error.message || 'Gagal menghapus kue');
    } finally {
        hideLoading();
    }
}

async function loadRecentCakes() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/cakes`);
        const cakes = await response.json();
        const recentCakes = cakes.slice(0, 5);

        const tableBody = document.getElementById('recentCakesTable');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (!recentCakes.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 1.5rem;">
                        Belum ada kue.
                    </td>
                </tr>
            `;
            return;
        }

        recentCakes.forEach(cake => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${cake.id}</td>
                <td>${cake.name}</td>
                <td>${getCategoryLabel(cake.category)}</td>
                <td>Rp ${Number(cake.price || 0).toLocaleString()}</td>
                <td>${new Date(cake.created_at).toLocaleDateString()}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading recent cakes:', error);
    }
}
// Get Category Label (duplicate from main.js, but needed here)
function getCategoryLabel(category) {
    const labels = {
        'kue_basah': 'Kue Basah',
        'kue_basah_populer': 'Kue Basah Populer',
        'kue_basah_tradisional': 'Kue Basah Tradisional',
        'kue_basah_modern': 'Kue Basah Modern'
    };
    return labels[category] || category;
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
