// API Base URL
const API_BASE_URL = window.location.origin;

// DOM Elements
const cakesContainer = document.getElementById('cakesContainer');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const filterButtons = document.querySelectorAll('.filter-btn');
const categoryCards = document.querySelectorAll('.category-card');
const loadingOverlay = document.getElementById('loading');
const cakeModal = document.getElementById('cakeModal');
const modalContent = document.getElementById('modalContent');
const closeModal = document.querySelector('.close-modal');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const orderItemsList = document.getElementById('orderItemsList');
const orderTotalQty = document.getElementById('orderTotalQty');
const orderTotalPrice = document.getElementById('orderTotalPrice');
const orderAddress = document.getElementById('orderAddress');
const orderNotes = document.getElementById('orderNotes');
const orderNowBtn = document.getElementById('orderNowBtn');
const shippingNote = document.getElementById('shippingNote');
const viewAllMenuBtn = document.getElementById('viewAllMenuBtn');
const addMoreMenuBtn = document.getElementById('addMoreMenuBtn');

// State
let currentCategory = 'semua';
let allCakes = [];
let lastCakesFetch = 0;
let orderCart = new Map();
let showAllMenus = false;
const MENU_PREVIEW_COUNT = 5;

const ADMIN_WA_NUMBER = '6283130580669';
const FREE_SHIPPING_MIN_QTY = 100;
const FREE_SHIPPING_AREAS = ['pasir jambu', 'ciwidey'];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCakes();
    setupEventListeners();
    setupMobileMenu();
    setupAutoRefresh();
    setupOrderPanel();
});

// Setup Event Listeners
function setupEventListeners() {
    // Search functionality
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Filter buttons
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentCategory = button.dataset.category;
            filterCakes();
        });
    });

    // Category cards
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            filterButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.category === category) {
                    btn.classList.add('active');
                    currentCategory = category;
                    filterCakes();
                }
            });
        });
    });

    // Modal close
    closeModal.addEventListener('click', () => {
        cakeModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === cakeModal) {
            cakeModal.style.display = 'none';
        }
    });

    if (viewAllMenuBtn) {
        viewAllMenuBtn.addEventListener('click', () => {
            showAllMenus = true;
            renderCakes(getVisibleCakes());
            viewAllMenuBtn.style.display = 'none';
        });
    }
}

function setupOrderPanel() {
    if (!orderAddress || !orderNowBtn) return;
    orderAddress.addEventListener('input', updateOrderSummary);
    if (orderNotes) {
        orderNotes.addEventListener('input', updateOrderSummary);
    }
    orderNowBtn.addEventListener('click', handleOrderNow);
    if (addMoreMenuBtn) {
        addMoreMenuBtn.addEventListener('click', () => {
            showAllMenus = true;
            renderCakes(getVisibleCakes());
            if (viewAllMenuBtn) viewAllMenuBtn.style.display = 'none';
            scrollToMenu();
        });
    }
}

// Setup Mobile Menu
function setupMobileMenu() {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.innerHTML = navMenu.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });

    // Close menu when clicking on a link
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.innerHTML = '<i class="fas fa-bars"></i>';
        });
    });
}

// Show Loading
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

// Hide Loading
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Load Cakes from API
async function loadCakes() {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/api/cakes`);
        if (response.ok) {
            allCakes = await response.json();
            lastCakesFetch = Date.now();
            renderCakes(getVisibleCakes());
            if (viewAllMenuBtn) {
                viewAllMenuBtn.style.display = allCakes.length > MENU_PREVIEW_COUNT ? 'inline-flex' : 'none';
            }
        } else {
            throw new Error('Failed to load cakes');
        }
    } catch (error) {
        console.error('Error loading cakes:', error);
        showError('Gagal memuat data kue. Silakan refresh halaman.');
    } finally {
        hideLoading();
    }
}

function setupAutoRefresh() {
    const refreshIfStale = () => {
        const now = Date.now();
        if (now - lastCakesFetch > 60000) {
            loadCakes();
        }
    };

    window.addEventListener('focus', refreshIfStale);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            refreshIfStale();
        }
    });
}

// Render Cakes to Grid
function renderCakes(cakes) {
    cakesContainer.innerHTML = '';
    
    if (cakes.length === 0) {
        cakesContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-cookie-bite"></i>
                <h3>Tidak ada kue ditemukan</h3>
                <p>Coba cari dengan kata kunci lain</p>
            </div>
        `;
        return;
    }
    
    cakes.forEach(cake => {
        const cakeCard = document.createElement('div');
        cakeCard.className = 'cake-card';
        cakeCard.innerHTML = `
            <img src="/uploads/${cake.image}" alt="${cake.name}" class="cake-image" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
            <div class="cake-info">
                <h3 class="cake-name">${cake.name}</h3>
                <p class="cake-description">${cake.description}</p>
                <div class="cake-price">Rp ${cake.price.toLocaleString()}</div>
                <span class="cake-category">${getCategoryLabel(cake.category)}</span>
                <span class="cake-status ${cake.is_available ? 'status-available' : 'status-unavailable'}">
                    ${cake.is_available ? 'Tersedia' : 'Habis'}
                </span>
                <div class="cake-actions">
                    <button class="btn-secondary btn-details" data-id="${cake.id}">
                        <i class="fas fa-circle-info"></i> Lihat Detail
                    </button>
                    <button class="btn-secondary btn-add ${cake.is_available ? '' : 'btn-disabled'}" data-id="${cake.id}" ${cake.is_available ? '' : 'disabled'}>
                        <i class="fas fa-plus"></i> Tambah
                    </button>
                </div>
            </div>
        `;
        cakesContainer.appendChild(cakeCard);
    });
    
    // Add event listeners to detail buttons
    document.querySelectorAll('.btn-details').forEach(button => {
        button.addEventListener('click', (e) => {
            const cakeId = e.target.dataset.id;
            showCakeDetails(cakeId);
        });
    });

    document.querySelectorAll('.btn-add').forEach(button => {
        button.addEventListener('click', (e) => {
            const cakeId = e.target.closest('button').dataset.id;
            if (e.target.closest('button').disabled) return;
            addToOrder(cakeId);
            scrollToOrderPanel();
        });
    });
}

// Get Category Label
function getCategoryLabel(category) {
    const labels = {
        'kue_basah': 'Kue Basah',
        'kue_basah_populer': 'Kue Basah Populer',
        'kue_basah_tradisional': 'Kue Basah Tradisional',
        'kue_basah_modern': 'Kue Basah Modern',
        'semua': 'Semua Kue Basah'
    };
    return labels[category] || category;
}

// Filter Cakes
function filterCakes() {
    let filteredCakes = allCakes;
    
    if (currentCategory !== 'semua') {
        filteredCakes = allCakes.filter(cake => cake.category === currentCategory);
    }
    
    if (!showAllMenus) {
        renderCakes(filteredCakes.slice(0, MENU_PREVIEW_COUNT));
    } else {
        renderCakes(filteredCakes);
    }

    if (viewAllMenuBtn) {
        viewAllMenuBtn.style.display = !showAllMenus && filteredCakes.length > MENU_PREVIEW_COUNT
            ? 'inline-flex'
            : 'none';
    }
}

// Handle Search
function handleSearch() {
    const query = searchInput.value.trim();
    
    if (query) {
        showLoading();
        fetch(`${API_BASE_URL}/api/cakes/search/${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(cakes => {
                renderCakes(cakes);
            })
            .catch(error => {
                console.error('Search error:', error);
                showError('Gagal melakukan pencarian');
            })
            .finally(() => {
                hideLoading();
            });
    } else {
        renderCakes(getVisibleCakes());
    }
}

// Show Cake Details in Modal
async function showCakeDetails(cakeId) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/api/cakes/${cakeId}`);
        if (response.ok) {
            const cake = await response.json();
            
            modalContent.innerHTML = `
                <div class="cake-details">
                    <img src="/uploads/${cake.image}" alt="${cake.name}" class="details-image">
                    <div class="details-content">
                        <h2>${cake.name}</h2>
                        <p class="details-description">${cake.description}</p>
                        <div class="details-meta">
                            <div class="meta-item">
                                <i class="fas fa-tag"></i>
                                <span>${getCategoryLabel(cake.category)}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-box"></i>
                                <span>Stok: ${cake.stock}</span>
                            </div>
                        </div>
                        <div class="details-price">Rp ${cake.price.toLocaleString()}</div>
                        ${cake.is_available ? 
                            '<div class="availability available"><i class="fas fa-check"></i> Tersedia</div>' : 
                            '<div class="availability unavailable"><i class="fas fa-times"></i> Habis</div>'
                        }
                        <div class="cake-actions">
                            <button class="btn-secondary btn-add" data-id="${cake.id}">
                                <i class="fas fa-plus"></i> Tambah ke Pesanan
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            cakeModal.style.display = 'flex';

            const modalAddBtn = modalContent.querySelector('.btn-add');
            if (modalAddBtn) {
                modalAddBtn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    addToOrder(id);
                    cakeModal.style.display = 'none';
                });
            }
        }
    } catch (error) {
        console.error('Error loading cake details:', error);
        showError('Gagal memuat detail kue');
    } finally {
        hideLoading();
    }
}

// Show Error Message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
    `;
    errorDiv.style.cssText = `
        background-color: #ffebee;
        color: #c62828;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.firstChild);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function addToOrder(cakeId) {
    const cake = allCakes.find(item => String(item.id) === String(cakeId));
    if (!cake) return;

    const existing = orderCart.get(cake.id) || { ...cake, quantity: 0 };
    existing.quantity += 1;
    orderCart.set(cake.id, existing);
    renderOrderItems();
    updateOrderSummary();
}

function getVisibleCakes() {
    let list = allCakes;
    if (currentCategory !== 'semua') {
        list = allCakes.filter(cake => cake.category === currentCategory);
    }
    if (!showAllMenus) {
        return list.slice(0, MENU_PREVIEW_COUNT);
    }
    return list;
}

function scrollToOrderPanel() {
    const panel = document.getElementById('orderPanel');
    if (!panel) return;
    const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
    const targetPosition = panel.offsetTop - headerHeight - 20;
    window.scrollTo({ top: targetPosition, behavior: 'smooth' });
}

function scrollToMenu() {
    const menu = document.getElementById('menu');
    if (!menu) return;
    const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
    const targetPosition = menu.offsetTop - headerHeight - 20;
    window.scrollTo({ top: targetPosition, behavior: 'smooth' });
}

function updateOrderQuantity(cakeId, delta) {
    const item = orderCart.get(cakeId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
        orderCart.delete(cakeId);
    } else {
        orderCart.set(cakeId, item);
    }
    renderOrderItems();
    updateOrderSummary();
}

function removeFromOrder(cakeId) {
    orderCart.delete(cakeId);
    renderOrderItems();
    updateOrderSummary();
}

function renderOrderItems() {
    if (!orderItemsList) return;
    orderItemsList.innerHTML = '';

    if (orderCart.size === 0) {
        orderItemsList.innerHTML = `
            <div class="order-empty">
                <i class="fas fa-basket-shopping"></i>
                <p>Belum ada menu yang dipilih.</p>
            </div>
        `;
        return;
    }

    Array.from(orderCart.values()).forEach(item => {
        const row = document.createElement('div');
        row.className = 'order-item';
        row.innerHTML = `
            <div class="order-item__name">${item.name}</div>
            <div class="order-item__price">Rp ${item.price.toLocaleString()}</div>
            <div class="order-qty">
                <button type="button" data-action="minus">-</button>
                <span>${item.quantity}</span>
                <button type="button" data-action="plus">+</button>
            </div>
            <button class="order-remove" type="button" aria-label="Hapus item">
                <i class="fas fa-trash"></i>
            </button>
        `;

        row.querySelector('[data-action="minus"]').addEventListener('click', () => {
            updateOrderQuantity(item.id, -1);
        });
        row.querySelector('[data-action="plus"]').addEventListener('click', () => {
            updateOrderQuantity(item.id, 1);
        });
        row.querySelector('.order-remove').addEventListener('click', () => {
            removeFromOrder(item.id);
        });

        orderItemsList.appendChild(row);
    });
}

function updateOrderSummary() {
    const items = Array.from(orderCart.values());
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    if (orderTotalQty) orderTotalQty.textContent = totalQty.toString();
    if (orderTotalPrice) orderTotalPrice.textContent = `Rp ${totalPrice.toLocaleString()}`;

    const addressValue = (orderAddress?.value || '').toLowerCase();
    const isFreeArea = FREE_SHIPPING_AREAS.some(area => addressValue.includes(area));
    const isFreeShipping = totalQty >= FREE_SHIPPING_MIN_QTY && isFreeArea;

    if (shippingNote) {
        shippingNote.textContent = isFreeShipping
            ? 'Gratis ongkir berlaku untuk pesanan ini.'
            : `Gratis ongkir area Pasir Jambu/Ciwidey dengan minimal ${FREE_SHIPPING_MIN_QTY} pcs.`;
    }

    if (orderNowBtn) {
        orderNowBtn.disabled = totalQty === 0 || !orderAddress?.value.trim();
    }
}

function handleOrderNow() {
    if (orderCart.size === 0) return;
    const address = orderAddress?.value.trim();
    if (!address) {
        showError('Mohon isi alamat lengkap untuk melanjutkan order.');
        return;
    }

    const items = Array.from(orderCart.values());
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const notes = orderNotes?.value.trim();

    const itemLines = items.map(item => `- ${item.name} x${item.quantity} (Rp ${item.price.toLocaleString()})`);
    const messageParts = [
        'Halo Admin Waroeng Sultan, saya mau order:',
        '',
        ...itemLines,
        '',
        `Total Item: ${totalQty}`,
        `Total Harga: Rp ${totalPrice.toLocaleString()}`,
        '',
        `Alamat: ${address}`
    ];

    if (notes) {
        messageParts.push(`Catatan: ${notes}`);
    }

    const freeShippingEligible = totalQty >= FREE_SHIPPING_MIN_QTY &&
        FREE_SHIPPING_AREAS.some(area => address.toLowerCase().includes(area));
    messageParts.push(
        freeShippingEligible
            ? 'Gratis ongkir: YA (Pasir Jambu/Ciwidey, min 100 pcs)'
            : 'Gratis ongkir: TIDAK'
    );

    const whatsappUrl = `https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent(messageParts.join('\n'))}`;
    window.open(whatsappUrl, '_blank');
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPosition = targetElement.offsetTop - headerHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});
