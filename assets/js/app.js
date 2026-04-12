import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDJnPttS9UJyA9R6YpFoQlKRb7TX7z8kV0",
    authDomain: "gregori-joyeria.firebaseapp.com",
    projectId: "gregori-joyeria",
    storageBucket: "gregori-joyeria.firebasestorage.app",
    messagingSenderId: "601596692788",
    appId: "1:601596692788:web:af86f4e942884067ac3d61"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById('year').textContent = new Date().getFullYear();

// --- ESTADO DE LA APLICACIÓN ---
const WHATSAPP_NUMBER = "573003216602"; // Número actualizado
const tabs = ['inicio', 'catalogo', 'carrito', 'nosotros', 'trabaja', 'contacto'];
const categories = ["Todos", "Cadenas", "Aretes", "Anillos", "Pulseras", "Combos"];
const materials = ["Todos", "Oro laminado", "Plata"];
const COP_PRICE_FORMATTER = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
});

// Guardamos los productos por defecto para poder inicializar la base de datos
const INITIAL_PRODUCTS = [
    { name: "Anillo de Compromiso Eternidad", category: "Anillos", material: "Oro laminado", price: 2500000, description: "Anillo de compromiso en oro laminado con un diamante central corte princesa de 1.5 quilates. Una pieza seleccionada de las mejores casas joyeras del mundo.", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=800", status: "disponible" },
    { name: "Cadena Lágrima de Zafiro", category: "Cadenas", material: "Plata", price: 1850000, description: "Elegante cadena con un zafiro azul profundo en forma de lágrima, con montura en oro laminado y detalles en pequeños diamantes.", image: "https://images.unsplash.com/photo-1599643478514-4a4208a650d9?auto=format&fit=crop&q=80&w=800", status: "disponible" },
    { name: "Pulsera Tenis Diamantes", category: "Pulseras", material: "Plata", price: 3200000, description: "La clásica pulsera tenis, un símbolo de lujo atemporal. Diamantes corte brillante montados sobre base en oro laminado.", image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=800", status: "agotado" },
    { name: "Aretes Perla Cultivada", category: "Aretes", material: "Oro laminado", price: 850000, description: "Sofisticados aretes con perlas cultivadas del Mar del Sur, rematados con engaste en oro laminado y un pequeño diamante en la base.", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800", status: "disponible" },
    { name: "Combo Reloj y Pulsera Onyx", category: "Combos", material: "Oro laminado", price: 5100000, description: "Combo exclusivo de reloj de precisión con esfera de ónix negro y pulsera a juego en oro laminado. Elegancia y puntualidad en un solo conjunto.", image: "https://images.unsplash.com/photo-1524592094714-a5764260bdcb?auto=format&fit=crop&q=80&w=800", status: "disponible" },
    { name: "Anillo Sello minimalista", category: "Anillos", material: "Oro laminado", price: 1950000, description: "Anillo tipo sello con acabado en oro laminado. Un diseño minimalista y rotundo, ideal para personalizar con iniciales.", image: "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?auto=format&fit=crop&q=80&w=800", status: "disponible" }
];

let state = {
    activeTab: 'inicio',
    isMobileMenuOpen: false,
    filter: 'Todos',
    materialFilter: 'Todos',
    sortOrder: 'recent',
    searchQuery: '',
    shouldFocusSearch: false,
    shouldSelectSearch: false,
    searchCursorPosition: null,
    selectedProduct: null,
    selectedProductImageIndex: 0,
    isAdminAuthenticated: false, // Estado de autenticación
    editingProductId: null,
    adminUser: 'Gregori',
    adminPassHash: '', // Se calculará de forma segura al iniciar
    products: [], // Iniciamos vacío, Firebase se encarga de llenarlo en tiempo real
    cart: []
};

// --- SINCRONIZACIÓN CON FIREBASE EN TIEMPO REAL ---
let isFirstLoad = true;
onSnapshot(collection(db, "products"), (snapshot) => {
    state.products = snapshot.docs.map(doc => normalizeProductRecord({
        id: doc.id,
        ...doc.data()
    }));
    syncCartWithProducts();
    renderNav();
    // Ordenar por fecha (más recientes primero)
    state.products.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (isFirstLoad) {
        renderApp(); // Carga la página completa solo la primera vez
        isFirstLoad = false;
    } else {
        // Actualizaciones dirigidas (Smart Updates) para evitar que la página parpadee en otros dispositivos
        if (state.activeTab === 'inicio') {
            const grid = document.getElementById('inicio-destacados-grid');
            if (grid) grid.innerHTML = state.products.slice(0, 3).map(p => renderProductCard(p)).join('');
        } else if (state.activeTab === 'catalogo') {
            updateCatalogSearchUI();
        } else if (state.activeTab === 'carrito') {
            renderApp();
        } else if (state.activeTab === 'admin' && state.isAdminAuthenticated) {
            const tbody = document.getElementById('admin-table-body');
            if (tbody) tbody.innerHTML = renderAdminTableRows();
            const emptyMsg = document.getElementById('admin-empty-msg');
            if (emptyMsg) emptyMsg.style.display = state.products.length === 0 ? 'block' : 'none';
        }

        // Actualizar la vista de Detalles (Modal) si el cliente lo está mirando y tú lo modificaste
        if (state.selectedProduct) {
            const updatedProduct = state.products.find(p => p.id === state.selectedProduct.id);
            if (updatedProduct && JSON.stringify(updatedProduct) !== JSON.stringify(state.selectedProduct)) {
                openModal(updatedProduct.id);
            } else if (!updatedProduct) {
                closeModal(); // Se cierra si eliminaste el producto
            }
        }
    }
}, (error) => {
    console.error("Error al leer de Firebase: ", error);
});

// Función para cargar los datos de prueba a la nube la primera vez
async function seedInitialData() {
    try {
        for (const p of INITIAL_PRODUCTS) {
            await addDoc(collection(db, "products"), normalizeProductRecord({ ...p, timestamp: Date.now() }));
        }
        showToast("Productos de prueba cargados correctamente.", 'success');
    } catch (error) {
        console.error("Error al cargar datos:", error);
        showToast("Hubo un error cargando los datos. Revisa la consola.", 'error');
    }
}

// --- INICIALIZACIÓN DE SEGURIDAD ---
// Genera el hash de la contraseña de administrador usando una versión ofuscada en Base64.
// Esto evita que la contraseña sea visible al leer el código fuente.
(async function () {
    const secret = atob('Z3JlZ29yaTE4aw=='); // Desofusca la contraseña temporalmente en memoria
    const msgBuffer = new TextEncoder().encode(secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    state.adminPassHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
})();

// --- FUNCIONES DE NAVEGACIÓN Y RENDERIZADO ---
function navigate(tab) {
    state.activeTab = tab;
    state.selectedProduct = null;
    state.isMobileMenuOpen = false;
    window.scrollTo(0, 0);
    renderNav();
    renderApp();
    closeModal();
}

function toggleMobileMenu() {
    state.isMobileMenuOpen = !state.isMobileMenuOpen;
    renderNav();
}

function openSearch() {
    state.filter = 'Todos';
    state.materialFilter = 'Todos';
    state.shouldFocusSearch = true;
    state.shouldSelectSearch = true;
    state.searchCursorPosition = null;
    navigate('catalogo');
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeText(value) {
    return String(value == null ? '' : value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function parsePriceToNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.round(value);
    }

    const rawValue = String(value == null ? '' : value).trim();
    if (!rawValue) return null;

    const cleanedValue = rawValue.replace(/[^\d.,-]/g, '');
    if (!cleanedValue) return null;

    const lastDot = cleanedValue.lastIndexOf('.');
    const lastComma = cleanedValue.lastIndexOf(',');
    const lastSeparatorIndex = Math.max(lastDot, lastComma);

    let normalizedNumber = cleanedValue;

    if (lastSeparatorIndex !== -1) {
        const decimalSeparator = cleanedValue[lastSeparatorIndex];
        const digitsAfterSeparator = cleanedValue.length - lastSeparatorIndex - 1;
        const usesDecimals = digitsAfterSeparator > 0 && digitsAfterSeparator <= 2;

        if (usesDecimals) {
            const thousandsSeparator = decimalSeparator === '.' ? ',' : '.';
            normalizedNumber = cleanedValue
                .replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '')
                .replace(decimalSeparator, '.');
        } else {
            normalizedNumber = cleanedValue.replace(/[.,]/g, '');
        }
    }

    const parsedValue = Number(normalizedNumber);
    if (!Number.isFinite(parsedValue)) return null;

    return Math.round(parsedValue);
}

function formatPriceCOP(value) {
    const parsedValue = parsePriceToNumber(value);
    if (parsedValue == null) {
        return String(value == null ? '' : value).trim();
    }

    return `$ ${COP_PRICE_FORMATTER.format(parsedValue)}`;
}

function formatPriceForInput(value) {
    const parsedValue = parsePriceToNumber(value);
    return parsedValue == null ? '' : COP_PRICE_FORMATTER.format(parsedValue);
}

function formatAdminPriceInput() {
    const priceInput = document.getElementById('add-price');
    if (!priceInput) return;

    const formattedValue = formatPriceForInput(priceInput.value);
    if (formattedValue) {
        priceInput.value = formattedValue;
    }
}

function getProductImages(product) {
    const rawImages = [
        product?.image,
        ...(Array.isArray(product?.images) ? product.images : [])
    ];

    return [...new Set(rawImages
        .map(image => normalizeImageUrl(image))
        .filter(Boolean))];
}

function normalizeProductRecord(product) {
    const normalizedImages = getProductImages(product);
    const parsedPrice = parsePriceToNumber(product?.price);
    const material = product?.material === 'Plata' ? 'Plata' : (product?.material === 'Oro' ? 'Oro laminado' : (product?.material || 'Oro laminado'));

    return {
        ...product,
        material,
        price: parsedPrice == null ? product?.price : parsedPrice,
        image: normalizedImages[0] || '',
        images: normalizedImages
    };
}

function syncCartWithProducts() {
    const productIds = new Set(state.products.map(product => product.id));
    state.cart = state.cart.filter(item => productIds.has(item.id) && item.quantity > 0);
}

function getCartCount() {
    return state.cart.reduce((acc, item) => acc + item.quantity, 0);
}

function shouldShowFloatingCartFab() {
    if (state.activeTab === 'carrito' || state.activeTab === 'admin') return false;
    const modal = document.getElementById('product-modal');
    const modalOpen = modal && !modal.classList.contains('hidden');
    return state.activeTab === 'catalogo' || modalOpen;
}

function updateFloatingCartFab() {
    const el = document.getElementById('floating-cart-fab');
    if (!el) return;
    if (!shouldShowFloatingCartFab()) {
        el.classList.add('hidden');
        el.innerHTML = '';
        el.setAttribute('aria-hidden', 'true');
        return;
    }
    const count = getCartCount();
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
    el.innerHTML = `
        <button type="button" onclick="navigate('carrito')" class="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-gold text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 hover:bg-yellow-700 md:h-16 md:w-16" title="Ir al carrito" aria-label="Ir al carrito de compra">
            <i class="fas fa-cart-shopping text-lg md:text-xl"></i>
            ${count > 0 ? `<span class="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-black px-1.5 text-[11px] font-bold text-white">${count > 99 ? '99+' : count}</span>` : ''}
        </button>`;
}

function getCartDetailedItems() {
    return state.cart
        .map(item => {
            const product = state.products.find(p => p.id === item.id);
            if (!product) return null;
            const unitPrice = parsePriceToNumber(product.price) ?? 0;
            return {
                ...item,
                product,
                unitPrice,
                subtotal: unitPrice * item.quantity
            };
        })
        .filter(Boolean);
}

function getCartTotal() {
    return getCartDetailedItems().reduce((acc, item) => acc + item.subtotal, 0);
}

function getPrimaryProductImage(product) {
    return getProductImages(product)[0] || createPlaceholderImage(product?.category, 'product');
}

function getSortedCatalogProducts(products) {
    const sortedProducts = [...products];

    if (state.sortOrder === 'price-asc') {
        return sortedProducts.sort((a, b) => (parsePriceToNumber(a.price) ?? 0) - (parsePriceToNumber(b.price) ?? 0));
    }

    if (state.sortOrder === 'price-desc') {
        return sortedProducts.sort((a, b) => (parsePriceToNumber(b.price) ?? 0) - (parsePriceToNumber(a.price) ?? 0));
    }

    return sortedProducts;
}

function getRelatedProducts(product, limit = 3) {
    return state.products
        .filter(item => item.id !== product.id && item.category === product.category)
        .slice(0, limit);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const styles = {
        success: {
            wrapper: 'border-emerald-200 bg-white/95 text-zinc-800 shadow-[0_18px_50px_rgba(16,185,129,0.14)]',
            icon: 'fa-check',
            accent: 'bg-emerald-50 text-emerald-600'
        },
        error: {
            wrapper: 'border-rose-200 bg-white/95 text-zinc-800 shadow-[0_18px_50px_rgba(244,63,94,0.14)]',
            icon: 'fa-exclamation',
            accent: 'bg-rose-50 text-rose-600'
        },
        info: {
            wrapper: 'border-zinc-200 bg-white/95 text-zinc-800 shadow-[0_18px_50px_rgba(24,24,27,0.12)]',
            icon: 'fa-gem',
            accent: 'bg-yellow-50 text-gold'
        }
    };

    const style = styles[type] || styles.info;
    const toast = document.createElement('div');
    toast.className = `toast-card pointer-events-auto rounded-2xl border px-4 py-4 backdrop-blur-sm ${style.wrapper}`;
    toast.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.accent}">
                <i class="fas ${style.icon} text-sm"></i>
            </div>
            <div class="min-w-0 flex-1">
                <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">Gregori Joyería</p>
                <p class="mt-1 text-sm leading-relaxed text-zinc-600">${escapeHtml(message)}</p>
            </div>
            <button type="button" class="text-zinc-300 transition-colors hover:text-zinc-600" aria-label="Cerrar notificación">
                <i class="fas fa-times text-xs"></i>
            </button>
        </div>
    `;

    const closeToast = () => {
        if (!toast.isConnected) return;
        toast.classList.add('toast-leaving');
        setTimeout(() => toast.remove(), 220);
    };

    toast.querySelector('button')?.addEventListener('click', closeToast);
    container.appendChild(toast);

    setTimeout(closeToast, 3800);
}

function createPlaceholderImage(label, kind = 'product') {
    const safeLabel = String(label == null ? 'Gregori Joyeria' : label).replace(/[<>&"]/g, '');
    const palettes = {
        hero: { start: '#18181b', end: '#3f3f46', accent: '#d4af37', subtitle: 'Alta joyeria digital' },
        about: { start: '#f4f4f5', end: '#d4d4d8', accent: '#d4af37', subtitle: 'Elegancia y confianza' },
        product: { start: '#fafaf9', end: '#e4e4e7', accent: '#d4af37', subtitle: 'Gregori Joyeria' }
    };
    const palette = palettes[kind] || palettes.product;
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="${palette.start}" />
                    <stop offset="100%" stop-color="${palette.end}" />
                </linearGradient>
            </defs>
            <rect width="1200" height="900" fill="url(#bg)" />
            <circle cx="930" cy="220" r="170" fill="${palette.accent}" opacity="0.14" />
            <circle cx="240" cy="720" r="220" fill="${palette.accent}" opacity="0.1" />
            <rect x="260" y="180" width="680" height="540" rx="36" fill="none" stroke="${palette.accent}" stroke-opacity="0.45" stroke-width="4" />
            <text x="600" y="410" text-anchor="middle" fill="${kind === 'hero' ? '#ffffff' : '#18181b'}" font-family="Georgia, serif" font-size="70" letter-spacing="4">${safeLabel}</text>
            <text x="600" y="490" text-anchor="middle" fill="${kind === 'hero' ? '#f4f4f5' : '#52525b'}" font-family="Arial, sans-serif" font-size="26" letter-spacing="8">${palette.subtitle.toUpperCase()}</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function handleImageError(img) {
    if (!img) return;

    const originalSrc = img.dataset.imageSource || '';

    if (!img.dataset.imageRetried && originalSrc) {
        img.dataset.imageRetried = '1';
        img.src = originalSrc.includes('%28') || originalSrc.includes('%29')
            ? originalSrc.replace(/%28/gi, '(').replace(/%29/gi, ')')
            : originalSrc.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/ /g, '%20');
        return;
    }

    img.onerror = null;
    img.src = createPlaceholderImage(img.dataset.imageLabel, img.dataset.imageKind);
}

function handleProductZoomMove(event) {
    const surface = event.currentTarget;
    const image = surface?.querySelector('[data-product-zoom-image]');
    if (!surface || !image) return;

    const rect = surface.getBoundingClientRect();
    const offsetX = ((event.clientX - rect.left) / rect.width) * 100;
    const offsetY = ((event.clientY - rect.top) / rect.height) * 100;

    image.style.transformOrigin = `${offsetX}% ${offsetY}%`;
    image.style.transform = 'scale(2.2)';
}

function resetProductZoom(event) {
    const surface = event.currentTarget;
    const image = surface?.querySelector('[data-product-zoom-image]');
    if (!image) return;

    image.style.transformOrigin = 'center center';
    image.style.transform = 'scale(1)';
}

function productMatchesSearch(product, query) {
    if (!query) return true;

    const normalizedPrice = parsePriceToNumber(product.price);

    const searchableText = [
        product.name,
        product.category,
        product.material,
        product.description,
        product.price,
        formatPriceCOP(product.price),
        normalizedPrice == null ? '' : String(normalizedPrice),
        product.status
    ].map(normalizeText).join(' ');

    return searchableText.includes(query);
}

function getCatalogFilteredProducts() {
    const normalizedQuery = normalizeText(state.searchQuery.trim());
    const filteredByCategory = state.filter === 'Todos'
        ? state.products
        : state.products.filter(p => p.category === state.filter);
    const filteredByMaterial = state.materialFilter === 'Todos'
        ? filteredByCategory
        : filteredByCategory.filter(p => p.material === state.materialFilter);

    return getSortedCatalogProducts(
        filteredByMaterial.filter(product => productMatchesSearch(product, normalizedQuery))
    );
}

function getCatalogResultsLabel(filteredProducts) {
    const resultsLabel = `${filteredProducts.length} resultado${filteredProducts.length === 1 ? '' : 's'}`;
    const activeCollectionLabel = state.filter === 'Todos' ? 'toda la coleccion' : state.filter;
    const activeMaterialLabel = state.materialFilter === 'Todos' ? '' : ` · ${state.materialFilter.toLowerCase()}`;

    if (state.searchQuery.trim()) {
        return `${resultsLabel} para "${state.searchQuery.trim()}"`;
    }

    return `${resultsLabel} en ${activeCollectionLabel}${activeMaterialLabel}`;
}

function renderCatalogProducts(products) {
    if (products.length > 0) {
        return products.map(p => renderProductCard(p, true)).join('');
    }

    return `<div class="col-span-full text-center py-20">
                <p class="text-zinc-500 text-lg">No se encontraron productos.</p>
                <p class="text-zinc-400 text-sm mt-3">Prueba otra busqueda o cambia la categoria seleccionada.</p>
            </div>`;
}

function renderClearSearchButton() {
    if (!state.searchQuery) return '';

    return `<button onclick="clearSearch()" class="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors" aria-label="Limpiar busqueda">
                <i class="fas fa-times text-xs"></i>
            </button>`;
}

function updateCatalogSearchUI() {
    if (state.activeTab !== 'catalogo') return;

    const filteredProducts = getCatalogFilteredProducts();
    const searchInput = document.getElementById('catalog-search');
    const sortSelect = document.getElementById('catalog-sort');
    const resultsLabel = document.getElementById('catalog-results-label');
    const productsGrid = document.getElementById('catalog-products-grid');
    const clearButton = document.getElementById('catalog-clear-button');

    if (searchInput && searchInput.value !== state.searchQuery) {
        searchInput.value = state.searchQuery;
    }

    if (resultsLabel) {
        resultsLabel.textContent = getCatalogResultsLabel(filteredProducts);
    }

    if (sortSelect && sortSelect.value !== state.sortOrder) {
        sortSelect.value = state.sortOrder;
    }

    if (productsGrid) {
        productsGrid.innerHTML = renderCatalogProducts(filteredProducts);
    }

    if (clearButton) {
        clearButton.innerHTML = renderClearSearchButton();
    }

    if (state.shouldFocusSearch) {
        state.shouldFocusSearch = false;
        focusCatalogSearch();
    }
}

function focusCatalogSearch() {
    requestAnimationFrame(() => {
        const searchInput = document.getElementById('catalog-search');
        if (!searchInput) return;
        searchInput.focus();
        if (state.shouldSelectSearch) {
            searchInput.select();
        } else if (typeof state.searchCursorPosition === 'number') {
            const cursorPosition = Math.max(0, Math.min(state.searchCursorPosition, searchInput.value.length));
            searchInput.setSelectionRange(cursorPosition, cursorPosition);
        }
        state.shouldSelectSearch = false;
        state.searchCursorPosition = null;
    });
}

function renderNav() {
    const deskMenu = document.getElementById('desktop-menu');
    const mobMenu = document.getElementById('mobile-menu-links');
    const mobContainer = document.getElementById('mobile-menu');
    const mobIcon = document.getElementById('mobile-menu-icon');

    // Render Desktop Links
    let deskHtml = '';
    tabs.forEach(tab => {
        const isActive = state.activeTab === tab ? 'text-gold' : 'text-zinc-500';
        const label = tab === 'trabaja' ? 'trabaja con nosotros' : tab;
        deskHtml += `<button onclick="navigate('${tab}')" class="uppercase tracking-widest text-xs font-semibold transition-colors duration-300 hover:text-gold ${isActive}">${label}</button>`;
    });

    // Botón de búsqueda (Admin eliminado de aquí para mayor discreción)
    deskHtml += `
        <div class="pl-4 border-l border-zinc-300 flex space-x-4 items-center">
            <button onclick="navigate('carrito')" title="Carrito" class="relative text-zinc-500 hover:text-black transition-colors" aria-label="Carrito de compra">
                <i class="fas fa-cart-shopping"></i>
                ${getCartCount() > 0 ? `<span class="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-gold text-white text-[10px] font-bold flex items-center justify-center">${getCartCount()}</span>` : ''}
            </button>
            <button onclick="openSearch()" title="Buscar productos" class="text-zinc-500 hover:text-black transition-colors" aria-label="Buscar productos">
                <i class="fas fa-search"></i>
            </button>
        </div>`;
    deskMenu.innerHTML = deskHtml;

    // Render Mobile Links
    let mobHtml = '';
    tabs.forEach(tab => {
        const label = tab === 'trabaja' ? 'trabaja con nosotros' : tab;
        mobHtml += `<button onclick="navigate('${tab}')" class="block w-full text-left px-3 py-4 uppercase tracking-widest text-sm text-zinc-600 hover:bg-zinc-50 hover:text-black border-b border-zinc-100">${label}</button>`;
    });
    mobMenu.innerHTML = mobHtml;

    // Toggle Mobile menu visibility
    if (state.isMobileMenuOpen) {
        mobContainer.classList.remove('hidden');
        mobIcon.className = 'fas fa-times text-2xl';
    } else {
        mobContainer.classList.add('hidden');
        mobIcon.className = 'fas fa-bars text-2xl';
    }

    updateFloatingCartFab();
}

function setSearchQuery(value, cursorPosition = value.length) {
    state.searchQuery = value;
    state.shouldFocusSearch = true;
    state.shouldSelectSearch = false;
    state.searchCursorPosition = cursorPosition;
    updateCatalogSearchUI();
}

function clearSearch() {
    state.searchQuery = '';
    state.shouldFocusSearch = true;
    state.shouldSelectSearch = false;
    state.searchCursorPosition = 0;
    updateCatalogSearchUI();
}

function setSortOrder(value) {
    state.sortOrder = value;
    updateCatalogSearchUI();
}

// --- AUTENTICACIÓN ADMIN ---
async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    // Crear hash SHA-256 de la contraseña ingresada mediante Web Crypto API
    const msgBuffer = new TextEncoder().encode(pass);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Validar verificando si el hash ingresado coincide con el esperado
    if (user === state.adminUser && hashHex === state.adminPassHash) {
        state.isAdminAuthenticated = true;
        renderApp();
        showToast("Bienvenido al panel administrativo.", 'success');
    } else {
        document.getElementById('login-pass').value = '';
        showToast("Credenciales incorrectas. Intenta nuevamente.", 'error');
    }
}

function handleLogout() {
    state.isAdminAuthenticated = false;
    navigate('inicio');
}

// --- VISTAS PRINCIPALES ---
function renderApp() {
    const content = document.getElementById('app-content');
    let html = '';

    if (state.activeTab === 'inicio') {
        html = `
            <div class="fade-in">
                <!-- Hero Section -->
                <div class="relative min-h-[70vh] md:h-[85vh] w-full bg-zinc-900 overflow-hidden flex items-center justify-center">
                    <img src="https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&q=80&w=2000" alt="Joyería Fina" class="absolute inset-0 w-full h-full object-cover opacity-60" data-image-label="Gregori Joyeria" data-image-kind="hero" onerror="handleImageError(this)"/>
                    <div class="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80"></div>
                    <div class="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center mt-6 md:mt-10">
                        <span class="uppercase tracking-[0.4em] text-xs md:text-sm mb-6 font-semibold text-gold border-b border-gold/30 pb-2">Comercialización Exclusiva</span>
                        <h2 class="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-serif text-white mb-5 md:mb-6 leading-tight drop-shadow-lg">Detalles que <br/><span class="italic font-light text-zinc-200">brillan contigo</span></h2>
                        <p class="text-zinc-300 max-w-2xl text-sm sm:text-base md:text-lg font-light mb-8 md:mb-10 drop-shadow-md">Hecho para tu estilo</p>
                        <button onclick="navigate('catalogo')" class="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 uppercase tracking-widest text-xs font-bold text-white border border-white/40 hover:border-gold hover:bg-gold transition-all duration-500 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] bg-black/20 backdrop-blur-sm">Explorar Colección</button>
                    </div>
                </div>

                <!-- Banner de Confianza -->
                <div class="bg-black text-white py-8 border-b border-zinc-800">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-zinc-800">
                            <div class="py-2 md:py-0 flex flex-col items-center justify-center space-y-2">
                                <i class="fas fa-shield-alt text-gold text-xl mb-1"></i>
                                <h4 class="uppercase tracking-widest text-[10px] font-bold">Compra Segura</h4>
                                <p class="text-zinc-400 text-xs font-light">Transacciones 100% protegidas</p>
                            </div>
                            <div class="py-2 md:py-0 flex flex-col items-center justify-center space-y-2">
                                <i class="fas fa-gem text-gold text-xl mb-1"></i>
                                <h4 class="uppercase tracking-widest text-[10px] font-bold">Autenticidad</h4>
                                <p class="text-zinc-400 text-xs font-light">Piezas certificadas de alta gama</p>
                            </div>
                            <div class="py-2 md:py-0 flex flex-col items-center justify-center space-y-2">
                                <i class="fas fa-box-open text-gold text-xl mb-1"></i>
                                <h4 class="uppercase tracking-widest text-[10px] font-bold">Envíos Asegurados</h4>
                                <p class="text-zinc-400 text-xs font-light">Cobertura total a nivel nacional</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Categorías Destacadas -->
                <div class="py-14 md:py-20 bg-zinc-50 border-b border-zinc-200">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div class="relative aspect-[4/5] group cursor-pointer overflow-hidden bg-zinc-200" onclick="setFilter('Anillos'); navigate('catalogo')">
                                <img src="https://images.unsplash.com/photo-1631982690223-8aa4be0a2497?q=80&w=764&auto=format&fit=crop" class="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Anillos">
                                <div class="absolute inset-0 bg-black/35 group-hover:bg-black/55 transition-colors duration-500"></div>
                                <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                                    <h3 class="text-3xl font-serif text-white mb-3">Anillos</h3>
                                    <span class="uppercase tracking-widest text-xs text-white border-b border-gold pb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500">Ver colección</span>
                                </div>
                            </div>
                            <div class="relative aspect-[4/5] group cursor-pointer overflow-hidden bg-zinc-200" onclick="setFilter('Cadenas'); navigate('catalogo')">
                                <img src="https://images.unsplash.com/photo-1643236027686-399d6ebbbae0?q=80&w=687&auto=format&fit=crop" class="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Cadenas">
                                <div class="absolute inset-0 bg-black/35 group-hover:bg-black/55 transition-colors duration-500"></div>
                                <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                                    <h3 class="text-3xl font-serif text-white mb-3">Cadenas</h3>
                                    <span class="uppercase tracking-widest text-xs text-white border-b border-gold pb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500">Ver colección</span>
                                </div>
                            </div>
                            <div class="relative aspect-[4/5] group cursor-pointer overflow-hidden bg-zinc-200" onclick="setFilter('Aretes'); navigate('catalogo')">
                                <img src="https://images.unsplash.com/photo-1617038220319-276d3cfab638?q=80&w=880&auto=format&fit=crop" class="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Aretes">
                                <div class="absolute inset-0 bg-black/35 group-hover:bg-black/55 transition-colors duration-500"></div>
                                <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                                    <h3 class="text-3xl font-serif text-white mb-3">Aretes</h3>
                                    <span class="uppercase tracking-widest text-xs text-white border-b border-gold pb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500">Ver colección</span>
                                </div>
                            </div>
                            <div class="relative aspect-[4/5] group cursor-pointer overflow-hidden bg-zinc-200" onclick="setFilter('Pulseras'); navigate('catalogo')">
                                <img src="https://plus.unsplash.com/premium_photo-1709033404514-c3953af680b4?q=80&w=687&auto=format&fit=crop" class="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Pulseras">
                                <div class="absolute inset-0 bg-black/35 group-hover:bg-black/55 transition-colors duration-500"></div>
                                <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                                    <h3 class="text-3xl font-serif text-white mb-3">Pulseras</h3>
                                    <span class="uppercase tracking-widest text-xs text-white border-b border-gold pb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500">Ver colección</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Destacados -->
                <div class="py-16 md:py-24 bg-white">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div class="flex flex-col items-center justify-center mb-16">
                            <i class="fas fa-gem text-gold text-2xl mb-4 opacity-50"></i>
                            <h3 class="text-3xl md:text-5xl font-serif text-black mb-4">Piezas Destacadas</h3>
                            <div class="w-20 h-[1px] bg-gold"></div>
                        </div>
                        <div id="inicio-destacados-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
                            ${state.products.slice(0, 3).map(p => renderProductCard(p)).join('')}
                        </div>
                        <div class="mt-20">
                            <button onclick="navigate('catalogo')" class="inline-flex items-center space-x-3 text-black border border-black px-8 py-4 hover:bg-black hover:text-white transition-colors duration-300 uppercase tracking-widest text-sm font-bold">
                                <span>Ver toda la colección</span> <i class="fas fa-chevron-right text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    else if (state.activeTab === 'catalogo') {
        const filtered = getCatalogFilteredProducts();

        let filtersHtml = categories.map(cat => {
            const isActive = state.filter === cat ? 'bg-gold text-white shadow-md' : 'bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-400 hover:text-black';
            return `<button onclick="setFilter('${cat}')" class="px-6 py-2 rounded-full uppercase tracking-widest text-xs font-semibold transition-all duration-300 ${isActive}">${cat}</button>`;
        }).join('');
        const materialFiltersHtml = materials.map(material => {
            const isActive = state.materialFilter === material ? 'bg-black text-white shadow-md' : 'bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-400 hover:text-black';
            return `<button onclick="setMaterialFilter('${material}')" class="px-5 py-2 rounded-full uppercase tracking-widest text-xs font-semibold transition-all duration-300 ${isActive}">${material}</button>`;
        }).join('');

        let productsHtml = renderCatalogProducts(filtered);

        html = `
            <div class="py-10 md:py-20">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="text-center mb-16">
                        <h2 class="text-3xl md:text-5xl font-serif text-black mb-5 md:mb-6">Nuestra Colección</h2>
                        <p class="text-zinc-500 max-w-2xl mx-auto">Explora nuestra selección completa de joyas finas. Cada pieza es elegida bajo estrictos estándares de calidad internacional.</p>
                    </div>
                    <div class="max-w-5xl mx-auto mb-10">
                        <div class="relative">
                            <i class="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400"></i>
                            <input
                                id="catalog-search"
                                type="text"
                                value="${escapeHtml(state.searchQuery)}"
                                oninput="setSearchQuery(this.value, this.selectionStart)"
                                placeholder="Busca por nombre, categoría o descripción"
                                class="w-full rounded-full border border-zinc-200 bg-white py-4 pl-14 pr-14 text-sm text-zinc-700 placeholder:text-zinc-400 shadow-sm transition-all focus:border-gold focus:outline-none focus:ring-4 focus:ring-yellow-100"
                                autocomplete="off"
                            />
                            <div id="catalog-clear-button">${renderClearSearchButton()}</div>
                        </div>
                        <div class="mt-4 flex justify-center md:justify-end">
                            <label class="flex w-full max-w-xs items-center gap-3 rounded-full border border-zinc-200 bg-white px-5 py-4 text-xs uppercase tracking-widest text-zinc-400 shadow-sm">
                                <i class="fas fa-arrow-down-wide-short text-zinc-400"></i>
                                <span class="shrink-0 font-semibold">Ordenar</span>
                                <select id="catalog-sort" onchange="setSortOrder(this.value)" class="w-full bg-transparent text-right text-xs font-semibold uppercase tracking-widest text-zinc-700 outline-none">
                                    <option value="recent" ${state.sortOrder === 'recent' ? 'selected' : ''}>Recientes</option>
                                    <option value="price-asc" ${state.sortOrder === 'price-asc' ? 'selected' : ''}>Menor a mayor precio</option>
                                    <option value="price-desc" ${state.sortOrder === 'price-desc' ? 'selected' : ''}>Mayor a menor precio</option>
                                </select>
                            </label>
                        </div>
                        <p id="catalog-results-label" class="mt-4 text-center text-xs uppercase tracking-widest text-zinc-400">${escapeHtml(getCatalogResultsLabel(filtered))}</p>
                    </div>
                    <div class="mb-6">
                        <p class="mb-3 text-center text-[11px] uppercase tracking-[0.2em] text-zinc-400">Categoría</p>
                        <div class="flex flex-wrap justify-center gap-4">${filtersHtml}</div>
                    </div>
                    <div class="mb-16">
                        <p class="mb-3 text-center text-[11px] uppercase tracking-[0.2em] text-zinc-400">Material</p>
                        <div class="flex flex-wrap justify-center gap-3">${materialFiltersHtml}</div>
                    </div>
                    <div id="catalog-products-grid" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">${productsHtml}</div>
                </div>
            </div>`;
    }
    else if (state.activeTab === 'carrito') {
        const cartItems = getCartDetailedItems();
        html = `
            <div class="py-10 md:py-20 bg-zinc-50 min-h-[70vh]">
                <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 class="text-3xl md:text-5xl font-serif text-black">Carrito de compra</h2>
                            <p class="mt-3 text-zinc-500">Agrega varios productos y envía un solo pedido por WhatsApp.</p>
                        </div>
                        ${cartItems.length ? `<button onclick="clearCart()" class="w-fit rounded-full border border-zinc-300 px-5 py-2 text-xs font-bold uppercase tracking-widest text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-black">Vaciar carrito</button>` : ''}
                    </div>
                    ${cartItems.length ? `
                        <div class="space-y-4">
                            ${cartItems.map(item => `
                                <div class="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                                    <div class="flex items-center gap-4">
                                        <img src="${getPrimaryProductImage(item.product)}" alt="${item.product.name}" class="h-20 w-20 rounded-xl object-cover" data-image-source="${escapeHtml(getPrimaryProductImage(item.product))}" data-image-label="${escapeHtml(item.product.category)}" data-image-kind="product" referrerpolicy="no-referrer" onerror="handleImageError(this)" />
                                        <div>
                                            <p class="font-serif text-xl text-black">${item.product.name}</p>
                                            <p class="text-xs uppercase tracking-widest text-zinc-400">${item.product.category} · ${item.product.material}</p>
                                            <p class="mt-1 text-sm text-zinc-500">${formatPriceCOP(item.unitPrice)} c/u</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <button onclick="changeCartQuantity('${item.id}', -1)" class="h-9 w-9 rounded-full border border-zinc-300 text-zinc-600 hover:bg-zinc-100">-</button>
                                        <span class="min-w-8 text-center text-sm font-semibold">${item.quantity}</span>
                                        <button onclick="changeCartQuantity('${item.id}', 1)" class="h-9 w-9 rounded-full border border-zinc-300 text-zinc-600 hover:bg-zinc-100">+</button>
                                        <p class="ml-3 min-w-28 text-right text-sm font-semibold text-zinc-700">${formatPriceCOP(item.subtotal)}</p>
                                        <button onclick="removeFromCart('${item.id}')" class="ml-2 text-zinc-400 transition-colors hover:text-red-600" aria-label="Eliminar producto">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                            <div class="flex items-center justify-between">
                                <p class="text-sm uppercase tracking-widest text-zinc-500">Total estimado</p>
                                <p class="text-2xl font-serif text-black">${formatPriceCOP(getCartTotal())}</p>
                            </div>
                            <button onclick="checkoutCartWhatsApp()" class="mt-6 w-full rounded-full bg-gold px-8 py-4 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-yellow-700">
                                Enviar pedido por WhatsApp
                            </button>
                        </div>
                    ` : `
                        <div class="rounded-2xl border border-dashed border-zinc-300 bg-white p-14 text-center">
                            <i class="fas fa-cart-shopping text-4xl text-zinc-300"></i>
                            <p class="mt-6 text-lg text-zinc-500">Tu carrito está vacío.</p>
                            <button onclick="navigate('catalogo')" class="mt-8 rounded-full border border-black px-7 py-3 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-white">
                                Ir al catálogo
                            </button>
                        </div>
                    `}
                </div>
            </div>`;
    }
    else if (state.activeTab === 'nosotros') {
        html = `
            <div class="py-12 md:py-20 fade-in bg-white">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex flex-col lg:flex-row gap-16 items-center">
                        <div class="w-full lg:w-1/2 relative h-[360px] sm:h-[460px] lg:h-[600px] overflow-hidden">
                            <img src="assets/images/Nosotrosimg.png" alt="Curaduría"
                                class="w-full h-full object-cover object-center scale-110"
                                 onerror="handleImageError(this)"/>
                        </div>
                        <div class="w-full lg:w-1/2 lg:pl-10">
                            <span class="uppercase tracking-[0.2em] text-xs font-bold mb-4 block text-gold">Nuestra Filosofía</span>
                            <h2 class="text-3xl md:text-5xl font-serif text-black mb-6 md:mb-8 leading-tight">Alta Joyería con<br/>respaldo y exclusividad</h2>
                            <div class="space-y-6 text-zinc-600 font-light leading-relaxed">
                                <p>En <strong>Gregori Joyería</strong> somos una joyería especializada en la comercialización de piezas exclusivas, pensadas para clientes que valoran la elegancia, la distinción y la confianza en cada compra.</p>
                                <p>Brindamos una experiencia <strong>100% </strong>personalizada, acercando alta joyería a todo el país con atención directa, acompañamiento experto y un proceso de compra seguro.</p>
                                <p>Cada joya de nuestro catálogo representa calidad, diseño y prestigio, respaldada por un servicio serio y una presentación a la altura de una marca de lujo.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    else if (state.activeTab === 'trabaja') {
        html = `
            <div class="py-12 md:py-20 fade-in bg-zinc-900 text-white">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="text-center mb-16">
                        <i class="fas fa-briefcase text-4xl mb-6 text-gold"></i>
                        <h2 class="text-3xl md:text-5xl font-serif mb-6">Únete a Nuestro Equipo</h2>
                        <p class="text-zinc-400 max-w-2xl mx-auto text-lg font-light">Buscamos talento apasionado por el lujo para comercializar nuestras colecciones exclusivas.</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
                        <div class="bg-zinc-800/50 p-10 border border-zinc-700 hover:border-gold transition-colors">
                            <h3 class="text-2xl font-serif mb-4">Asesores de Ventas Digitales</h3>
                            <p class="text-zinc-400 mb-6 font-light">Maneja tu propio tiempo ofreciendo nuestro catálogo a clientes de alto perfil con atractivas comisiones.</p>
                            <ul class="space-y-2 mb-8 text-sm text-zinc-300">
                                <li>✓ Comisiones desde el primer mes.</li>
                                <li>✓ Trabajo 100% remoto.</li>
                                <li>✓ Capacitación en alta joyería.</li>
                            </ul>
                        </div>
                        <div class="bg-zinc-800/50 p-10 border border-zinc-700 hover:border-gold transition-colors">
                            <h3 class="text-2xl font-serif mb-4">Embajadores de Marca</h3>
                            <p class="text-zinc-400 mb-6 font-light">¿Tienes una audiencia alineada con el lujo? Conviértete en embajador y promociona nuestras piezas.</p>
                            <ul class="space-y-2 mb-8 text-sm text-zinc-300">
                                <li>✓ Códigos de descuento personalizados.</li>
                                <li>✓ Beneficios por volumen de referidos.</li>
                                <li>✓ Posibilidad de recibir piezas para contenido.</li>
                            </ul>
                        </div>
                    </div>
                    <div class="mt-16 text-center">
                        <button onclick="openWorkWithUsWhatsApp()" class="px-10 py-4 uppercase tracking-widest text-sm font-bold text-zinc-900 bg-gold hover:bg-yellow-600 transition-colors inline-flex items-center space-x-2">
                            <i class="fab fa-whatsapp"></i> <span>Enviar Propuesta / CV por WhatsApp</span>
                        </button>
                    </div>
                </div>
            </div>`;
    }
    else if (state.activeTab === 'contacto') {
        html = `
            <div class="py-12 md:py-20 fade-in bg-zinc-50">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="text-center mb-16">
                        <h2 class="text-4xl font-serif text-black mb-4">Asesoría Personalizada</h2>
                        <p class="text-zinc-500 max-w-2xl mx-auto">Nuestra operación es en línea, lo que nos permite dedicarte el tiempo que mereces desde tu hogar.</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        <div class="bg-white p-10 flex flex-col items-center text-center shadow-lg border-t-4 border-gold transform md:-translate-y-4">
                            <div class="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center mb-6 text-gold text-2xl"><i class="fab fa-whatsapp"></i></div>
                            <h4 class="font-serif text-xl mb-3 text-black">WhatsApp Inmediato</h4>
                            <p class="text-zinc-500 text-sm mb-6">Habla con uno de nuestros asesores expertos.</p>
                            <button onclick="window.open('https://wa.me/${WHATSAPP_NUMBER}')" class="px-6 py-3 text-sm uppercase tracking-widest font-bold text-white bg-gold hover:bg-yellow-700 transition-colors w-full">Escribir ahora</button>
                        </div>
                        <div class="bg-white p-10 flex flex-col items-center text-center shadow-sm border border-zinc-100">
                            <div class="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center mb-6 text-zinc-800 text-2xl"><i class="fas fa-globe"></i></div>
                            <h4 class="font-serif text-xl mb-3 text-black">Asesoría Virtual</h4>
                            <p class="text-zinc-500 text-sm mb-6">Solicita una videollamada para ver los detalles.</p>
                            <button onclick="window.open('https://wa.me/${WHATSAPP_NUMBER}?text=Hola,%20deseo%20agendar%20una%20videollamada.')" class="px-6 py-3 text-sm uppercase tracking-widest font-bold text-black border border-black hover:bg-black hover:text-white transition-colors w-full">Agendar Cita</button>
                        </div>
                        <div class="bg-white p-10 flex flex-col items-center text-center shadow-sm border border-zinc-100 lg:col-span-1 md:col-span-2">
                            <div class="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center mb-6 text-zinc-800 text-2xl"><i class="fas fa-envelope"></i></div>
                            <h4 class="font-serif text-xl mb-3 text-black">Correo Electrónico</h4>
                            <p class="text-zinc-500 text-sm">Gregorijoyeria@gmail.com</p>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    else if (state.activeTab === 'admin') {
        if (!state.isAdminAuthenticated) {
            html = `
                <div class="py-12 md:py-20 fade-in bg-zinc-50 min-h-[80vh] flex items-center justify-center">
                    <div class="bg-white p-10 shadow-sm border border-zinc-200 max-w-md w-full mx-4">
                        <div class="text-center mb-8">
                            <div class="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-lock text-2xl text-gold"></i>
                            </div>
                            <h2 class="text-2xl font-serif text-black mb-2">Acceso Restringido</h2>
                            <p class="text-zinc-500 text-sm">Ingresa tus credenciales para administrar el catálogo.</p>
                        </div>
                        <form onsubmit="handleLogin(event)" class="space-y-5">
                            <div>
                                <label class="block text-xs text-zinc-500 uppercase tracking-widest mb-2">Usuario</label>
                                <input required id="login-user" type="text" class="w-full border border-zinc-300 p-3 text-sm focus:border-gold focus:outline-none transition-colors" />
                            </div>
                            <div>
                                <label class="block text-xs text-zinc-500 uppercase tracking-widest mb-2">Contraseña</label>
                                <input required id="login-pass" type="password" class="w-full border border-zinc-300 p-3 text-sm focus:border-gold focus:outline-none transition-colors" />
                            </div>
                            <button type="submit" class="w-full py-4 text-white text-sm uppercase tracking-widest font-bold bg-black hover:bg-gold transition-colors mt-4">Ingresar</button>
                        </form>
                    </div>
                </div>`;
        } else {
            html = `
                <div class="py-12 fade-in bg-zinc-50 min-h-screen">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="mb-10 border-b border-zinc-200 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h2 class="text-3xl font-serif text-black mb-2 flex items-center gap-3">
                                    <i class="fas fa-cog text-gold"></i> Panel Administrativo
                                </h2>
                                <p class="text-zinc-500 text-sm">Gestiona el inventario y disponibilidad.</p>
                            </div>
                            <button onclick="handleLogout()" class="px-5 py-2 border border-zinc-300 text-xs text-zinc-600 hover:bg-zinc-100 hover:text-black transition-colors uppercase tracking-widest font-bold flex items-center gap-2 w-fit">
                                <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                            </button>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            <!-- Formulario -->
                            <div class="lg:col-span-1 bg-white p-6 shadow-sm border border-zinc-200 h-fit">
                                <h3 class="uppercase tracking-widest text-sm font-bold text-black mb-6 flex items-center gap-2"><i class="fas ${state.editingProductId ? 'fa-pen' : 'fa-plus'}"></i> ${state.editingProductId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                                <form onsubmit="handleAddProduct(event)" class="space-y-4">
                                    <div><label class="block text-xs text-zinc-500 uppercase tracking-widest mb-1">Nombre</label>
                                    <input required id="add-name" type="text" value="${state.editingProductId ? escapeHtml(state.products.find(p => p.id === state.editingProductId)?.name || '') : ''}" class="w-full border border-zinc-300 p-2 text-sm focus:border-yellow-600 focus:outline-none" /></div>
                                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div><label class="block text-xs text-zinc-500 uppercase tracking-widest mb-1">Categoría</label>
                                        <select id="add-cat" class="w-full border border-zinc-300 p-2 text-sm focus:outline-none">
                                            ${categories.filter(c => c !== 'Todos').map(c => `<option value="${c}" ${state.editingProductId && state.products.find(p => p.id === state.editingProductId)?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                                        </select></div>
                                        <div><label class="block text-xs text-zinc-500 uppercase tracking-widest mb-1">Material</label>
                                        <select id="add-material" class="w-full border border-zinc-300 p-2 text-sm focus:outline-none">
                                            ${materials.filter(m => m !== 'Todos').map(m => `<option value="${m}" ${state.editingProductId && state.products.find(p => p.id === state.editingProductId)?.material === m ? 'selected' : ''}>${m}</option>`).join('')}
                                        </select></div>
                                        <div><label class="block text-xs text-zinc-500 uppercase tracking-widest mb-1">Precio</label>
                                        <input required id="add-price" type="text" value="${state.editingProductId ? escapeHtml(formatPriceForInput(state.products.find(p => p.id === state.editingProductId)?.price)) : ''}" inputmode="numeric" placeholder="200.000" onblur="formatAdminPriceInput()" class="w-full border border-zinc-300 p-2 text-sm focus:outline-none" /></div>
                                    </div>
                                    <div><label class="block text-xs text-zinc-500 uppercase tracking-widest mb-1">Imágenes del producto</label>
                                    <div class="space-y-3">
                                    <input required id="add-img-1" type="url" value="${state.editingProductId ? escapeHtml(getProductImages(state.products.find(p => p.id === state.editingProductId) || {})[0] || '') : ''}" placeholder="Foto 1" class="w-full border border-zinc-300 p-2 text-sm focus:outline-none" />
                                    <input id="add-img-2" type="url" value="${state.editingProductId ? escapeHtml(getProductImages(state.products.find(p => p.id === state.editingProductId) || {})[1] || '') : ''}" placeholder="Foto 2" class="w-full border border-zinc-300 p-2 text-sm focus:outline-none" />
                                    <input id="add-img-3" type="url" value="${state.editingProductId ? escapeHtml(getProductImages(state.products.find(p => p.id === state.editingProductId) || {})[2] || '') : ''}" placeholder="Foto 3" class="w-full border border-zinc-300 p-2 text-sm focus:outline-none" />
                                    </div>
                                    <div class="mt-2 flex items-center justify-between gap-3">
                                        <p class="text-[11px] text-zinc-400">Puedes cargar entre 1 y 3 imágenes. La primera será la portada del producto.</p>
                                        <button type="button" onclick="window.open('https://cloudinary.com/', '_blank')" class="shrink-0 text-[11px] uppercase tracking-widest font-bold text-gold hover:text-yellow-700 transition-colors">Cloudinary</button>
                                    </div>
                                    </div>
                                    <div><label class="block text-xs text-zinc-500 uppercase tracking-widest mb-1">Descripción</label>
                                    <textarea required id="add-desc" rows="3" class="w-full border border-zinc-300 p-2 text-sm focus:outline-none">${state.editingProductId ? escapeHtml(state.products.find(p => p.id === state.editingProductId)?.description || '') : ''}</textarea></div>
                                    <div><label class="block text-xs text-zinc-500 uppercase tracking-widest mb-1">Estado</label>
                                    <select id="add-status" class="w-full border border-zinc-300 p-2 text-sm focus:outline-none">
                                        <option value="disponible" ${state.editingProductId && state.products.find(p => p.id === state.editingProductId)?.status === 'disponible' ? 'selected' : ''}>Disponible</option><option value="agotado" ${state.editingProductId && state.products.find(p => p.id === state.editingProductId)?.status === 'agotado' ? 'selected' : ''}>Agotado</option>
                                    </select></div>
                                    <div class="grid grid-cols-1 ${state.editingProductId ? 'sm:grid-cols-2' : ''} gap-3">
                                        <button id="add-submit" type="submit" class="w-full py-3 mt-4 text-white text-sm uppercase tracking-widest font-bold bg-gold hover:bg-yellow-700 transition-colors">${state.editingProductId ? 'Actualizar Producto' : 'Guardar Producto'}</button>
                                        ${state.editingProductId ? '<button type="button" onclick="cancelEditProduct()" class="w-full py-3 mt-4 border border-zinc-300 text-zinc-600 text-sm uppercase tracking-widest font-bold hover:bg-zinc-100 transition-colors">Cancelar</button>' : ''}
                                    </div>
                                </form>
                            </div>
                            <!-- Tabla -->
                            <div class="lg:col-span-2 bg-white shadow-sm border border-zinc-200 overflow-hidden">
                                <div class="overflow-x-auto">
                                    <table class="w-full text-left border-collapse">
                                        <thead>
                                            <tr class="bg-zinc-100 text-zinc-600 text-xs uppercase tracking-widest">
                                                <th class="p-4 font-semibold">Producto</th><th class="p-4 font-semibold">Precio</th>
                                                <th class="p-4 font-semibold">Estado</th><th class="p-4 font-semibold text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="admin-table-body" class="divide-y divide-zinc-200 text-sm">
                                            ${renderAdminTableRows()}
                                        </tbody>
                                    </table>
                                    <div id="admin-empty-msg" class="p-10 text-center text-zinc-500" style="display: ${state.products.length === 0 ? 'block' : 'none'}">
                                        No hay productos en la base de datos.<br/>
                                        <button type="button" onclick="seedInitialData()" class="mt-4 px-6 py-2 bg-gold text-white text-xs uppercase tracking-widest font-bold hover:bg-yellow-700 transition-colors">Cargar Datos de Prueba</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
        }
    }

    content.innerHTML = html;

    if (state.activeTab === 'catalogo' && state.shouldFocusSearch) {
        state.shouldFocusSearch = false;
        focusCatalogSearch();
    }

    updateFloatingCartFab();
}

// --- COMPONENTES AUXILIARES ---
function renderAdminTableRows() {
    return state.products.map(p => `
        <tr class="hover:bg-zinc-50 transition-colors">
            <td class="p-4 flex items-center gap-3">
                <img src="${getPrimaryProductImage(p)}" class="w-10 h-10 object-cover rounded-sm border border-zinc-200" data-image-source="${escapeHtml(getPrimaryProductImage(p))}" data-image-label="${escapeHtml(p.category)}" data-image-kind="product" referrerpolicy="no-referrer" onerror="handleImageError(this)" />
                <div><p class="font-semibold text-black line-clamp-1">${p.name}</p><p class="text-xs text-zinc-500">${p.category} · ${p.material} · ${getProductImages(p).length} foto${getProductImages(p).length === 1 ? '' : 's'}</p></div>
            </td>
            <td class="p-4">${formatPriceCOP(p.price)}</td>
            <td class="p-4"><button onclick="toggleStatus('${p.id}')" class="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold border transition-colors ${p.status === 'disponible' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}">${p.status}</button></td>
            <td class="p-4 text-right">
                <button onclick="startEditProduct('${p.id}')" class="text-zinc-400 hover:text-blue-600 transition-colors p-2" aria-label="Editar producto"><i class="fas fa-pen"></i></button>
                <button onclick="deleteProduct('${p.id}')" class="text-zinc-400 hover:text-red-600 transition-colors p-2" aria-label="Eliminar producto"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderProductCard(product, inCatalog = false) {
    const isAgotado = product.status === 'agotado';
    const imgClass = isAgotado ? 'grayscale-30' : '';
    const bgClass = inCatalog ? 'bg-white p-4 hover:shadow-xl hover:shadow-zinc-200/50' : 'flex flex-col items-center';

    let badges = '';
    if (inCatalog) {
        badges += `<span class="bg-white/90 backdrop-blur-sm px-3 py-1 text-[10px] uppercase tracking-widest font-bold text-zinc-800 w-fit">${product.category}</span>`;
        badges += `<span class="bg-black/80 backdrop-blur-sm px-3 py-1 text-[10px] uppercase tracking-widest font-bold text-white w-fit">${product.material || 'Oro laminado'}</span>`;
    }
    if (isAgotado) {
        badges += `<span class="bg-black/90 text-white px-3 py-1 text-[10px] uppercase tracking-widest font-bold w-fit ${!inCatalog ? 'absolute top-4 right-4 z-10' : ''}">Agotado</span>`;
    }

    return `
        <div class="group cursor-pointer transition-all duration-300 ${bgClass}" onclick="openModal('${product.id}')">
            <div class="${inCatalog ? 'aspect-square' : 'w-full aspect-[4/5]'} bg-zinc-100 mb-4 overflow-hidden relative ${isAgotado && inCatalog ? 'opacity-80' : ''}">
                <img src="${getPrimaryProductImage(product)}" alt="${product.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${imgClass}" data-image-source="${escapeHtml(getPrimaryProductImage(product))}" data-image-label="${escapeHtml(product.category)}" data-image-kind="product" referrerpolicy="no-referrer" onerror="handleImageError(this)" />
                <div class="${inCatalog ? 'absolute top-3 left-3 flex flex-col gap-2' : ''}">${badges}</div>
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center z-0">
                    <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-6 py-3 bg-white text-black text-xs uppercase tracking-widest font-bold">Ver Detalles</span>
                </div>
            </div>
            <div class="text-center">
                <h4 class="font-serif text-lg text-black mb-1 line-clamp-1">${product.name}</h4>
                <p class="text-sm text-gold font-medium">${formatPriceCOP(product.price)}</p>
                ${inCatalog && !isAgotado ? `<button onclick="event.stopPropagation(); addToCart('${product.id}')" class="mt-4 rounded-full border border-zinc-300 px-4 py-2 text-[11px] uppercase tracking-widest font-bold text-zinc-700 transition-colors hover:border-black hover:text-black">Agregar al carrito</button>` : ''}
            </div>
        </div>
    `;
}

// --- LÓGICA DE PRODUCTOS (MODAL Y WA) ---
function renderRelatedProducts(product) {
    const relatedProducts = getRelatedProducts(product);
    if (!relatedProducts.length) return '';

    return `
        <div class="mt-20 border-t border-zinc-100 pt-14">
            <div class="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p class="text-xs font-bold uppercase tracking-[0.28em] text-gold">También te podría interesar...</p>
                    <h3 class="mt-3 font-serif text-3xl text-black">Más ${product.category.toLowerCase()} de nuestro catálogo</h3>
                </div>
            
            </div>
            <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
                ${relatedProducts.map(relatedProduct => {
                    const image = getPrimaryProductImage(relatedProduct);
                    const isAgotado = relatedProduct.status === 'agotado';

                    return `
                        <button type="button" onclick="openModal('${relatedProduct.id}')" class="group overflow-hidden rounded-[28px] border border-zinc-200 bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:border-gold hover:shadow-xl hover:shadow-zinc-200/60">
                            <div class="aspect-[4/5] overflow-hidden bg-zinc-100">
                                <img src="${image}" alt="${relatedProduct.name}" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${isAgotado ? 'grayscale-30' : ''}" data-image-source="${escapeHtml(image)}" data-image-label="${escapeHtml(relatedProduct.category)}" data-image-kind="product" referrerpolicy="no-referrer" onerror="handleImageError(this)" />
                            </div>
                            <div class="p-5">
                                <p class="text-[10px] font-bold uppercase tracking-[0.26em] text-gold">${relatedProduct.category}</p>
                                <h4 class="mt-3 font-serif text-xl text-black">${relatedProduct.name}</h4>
                                <p class="mt-2 text-sm font-medium text-zinc-500">${formatPriceCOP(relatedProduct.price)}</p>
                            </div>
                        </button>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function renderProductGallery(product, isAgotado) {
    const productImages = getProductImages(product);
    const safeIndex = Math.max(0, Math.min(state.selectedProductImageIndex, Math.max(productImages.length - 1, 0)));
    const selectedImage = productImages[safeIndex] || getPrimaryProductImage(product);
    const thumbnailsHtml = productImages.length > 1
        ? `
            <div class="mt-4 grid grid-cols-3 gap-3">
                ${productImages.map((image, index) => `
                    <button
                        type="button"
                        onclick="setSelectedProductImage(${index})"
                        data-product-thumb-index="${index}"
                        class="overflow-hidden rounded-2xl border transition-all duration-300 ${index === safeIndex ? 'border-gold ring-2 ring-yellow-100' : 'border-zinc-200 opacity-75 hover:opacity-100'}"
                    >
                        <img src="${image}" alt="${product.name} vista ${index + 1}" class="h-24 w-full object-cover" data-image-source="${escapeHtml(image)}" data-image-label="${escapeHtml(product.category)}" data-image-kind="product" referrerpolicy="no-referrer" onerror="handleImageError(this)" />
                    </button>
                `).join('')}
            </div>
        `
        : '';

    return `
        <div>
            <div id="product-zoom-surface" class="aspect-square w-full rounded-sm bg-zinc-100 overflow-hidden relative product-zoom-surface" onmousemove="handleProductZoomMove(event)" onmouseleave="resetProductZoom(event)">
                <img id="product-main-image" src="${selectedImage}" alt="${product.name}" class="w-full h-full object-cover object-center product-zoom-image ${isAgotado ? 'grayscale-30' : ''}" data-product-zoom-image="true" data-image-source="${escapeHtml(selectedImage)}" data-image-label="${escapeHtml(product.category)}" data-image-kind="product" referrerpolicy="no-referrer" onerror="handleImageError(this)" />
                ${isAgotado ? '<div class="absolute inset-0 flex items-center justify-center bg-black/10"><span class="bg-black text-white px-6 py-2 tracking-[0.3em] uppercase text-sm font-bold">Agotado</span></div>' : ''}
            </div>
            ${thumbnailsHtml}
        </div>
    `;
}

function openModal(id) {
    const product = state.products.find(p => p.id === id);
    if (!product) return;
    state.selectedProduct = product;
    state.selectedProductImageIndex = 0;

    const isAgotado = product.status === 'agotado';
    const btnColor = isAgotado ? 'bg-zinc-800 text-white hover:bg-black' : 'bg-gold text-white hover:bg-yellow-700';
    const btnText = isAgotado ? 'Consultar Disponibilidad' : 'Comprar por WhatsApp';

    const modalHtml = `
        <button onclick="closeModal()" class="absolute top-4 left-4 md:top-10 md:left-10 flex items-center space-x-2 text-zinc-500 hover:text-black transition-colors z-10 bg-white/80 px-3 py-2 md:px-4 rounded-full backdrop-blur-sm">
            <i class="fas fa-arrow-left"></i><span class="uppercase text-xs tracking-widest font-bold">Volver</span>
        </button>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 min-h-screen">
            <div class="flex flex-col md:flex-row w-full gap-8 md:gap-12 lg:gap-24 items-start">
                <div class="w-full md:w-1/2">
                    ${renderProductGallery(product, isAgotado)}
                </div>
                <div class="w-full md:w-1/2 flex flex-col justify-center md:pt-8">
                    <div class="flex items-center space-x-4 mb-4">
                        <p class="text-sm uppercase tracking-widest text-gold">${product.category}</p>
                        <p class="text-[11px] uppercase tracking-widest text-zinc-500">${product.material || 'Oro laminado'}</p>
                        ${isAgotado ? '<span class="px-2 py-1 bg-zinc-200 text-zinc-600 text-[10px] uppercase tracking-widest font-bold rounded-sm">Sin Stock</span>' : ''}
                    </div>
                    <h2 class="text-3xl md:text-5xl font-serif text-black mb-5 md:mb-6 leading-tight">${product.name}</h2>
                    <p class="text-xl md:text-2xl text-zinc-600 mb-6 md:mb-8 font-light">${formatPriceCOP(product.price)}</p>
                    <div class="w-12 h-[1px] bg-zinc-300 mb-8"></div>
                    <p class="text-zinc-600 leading-relaxed mb-12">${product.description}</p>
                    <div class="flex w-full flex-col gap-3 md:w-auto">
                        <button onclick="contactWhatsApp('${product.id}')" class="w-full md:w-auto px-6 sm:px-10 py-4 flex items-center justify-center space-x-3 uppercase tracking-widest text-xs sm:text-sm font-bold transition-all duration-300 transform hover:-translate-y-1 shadow-lg ${btnColor}">
                            <i class="fab fa-whatsapp text-lg"></i> <span>${btnText}</span>
                        </button>
                        ${!isAgotado ? `<button onclick="addToCart('${product.id}')" class="w-full md:w-auto px-6 sm:px-10 py-4 border border-zinc-300 text-zinc-700 hover:border-black hover:text-black uppercase tracking-widest text-xs font-bold transition-colors">Agregar al carrito</button>` : ''}
                    </div>
                    <div class="mt-8 pt-8 border-t border-zinc-100 flex items-center space-x-4 text-sm text-zinc-500">
                        <i class="fas fa-shield-alt"></i><span>100% Compra Segura Online - Envío Asegurado</span>
                    </div>
                </div>
            </div>
            ${renderRelatedProducts(product)}
        </div>
    `;

    const modalContainer = document.getElementById('product-modal');
    modalContainer.innerHTML = modalHtml;
    modalContainer.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Evitar scroll de fondo
    updateFloatingCartFab();
}

function closeModal() {
    state.selectedProduct = null;
    state.selectedProductImageIndex = 0;
    const modalContainer = document.getElementById('product-modal');
    modalContainer.classList.add('hidden');
    document.body.style.overflow = 'auto';
    modalContainer.innerHTML = '';
    updateFloatingCartFab();
}

function setSelectedProductImage(index) {
    if (!state.selectedProduct) return;

    const productImages = getProductImages(state.selectedProduct);
    if (!productImages.length) return;

    const safeIndex = Math.max(0, Math.min(index, productImages.length - 1));
    const nextImage = productImages[safeIndex];
    state.selectedProductImageIndex = safeIndex;

    const mainImage = document.getElementById('product-main-image');
    if (mainImage) {
        mainImage.src = nextImage;
        mainImage.alt = `${state.selectedProduct.name} vista ${safeIndex + 1}`;
        mainImage.dataset.imageSource = nextImage;
    }

    const zoomSurface = document.getElementById('product-zoom-surface');
    if (zoomSurface) {
        resetProductZoom({ currentTarget: zoomSurface });
    }

    document.querySelectorAll('[data-product-thumb-index]').forEach(button => {
        const isActive = Number(button.dataset.productThumbIndex) === safeIndex;
        button.classList.toggle('border-gold', isActive);
        button.classList.toggle('ring-2', isActive);
        button.classList.toggle('ring-yellow-100', isActive);
        button.classList.toggle('border-zinc-200', !isActive);
        button.classList.toggle('opacity-75', !isActive);
    });
}

function contactWhatsApp(id) {
    const product = state.products.find(p => p.id === id);
    let message = "";
    if (product.status === 'agotado') {
        message = `Hola Gregori Joyería, vi este producto: *${product.name}* en su catálogo pero veo que está agotado. ¿Me podrían avisar cuándo volverá a estar disponible?`;
    } else {
        message = `Hola Gregori Joyería, estoy interesado(a) en adquirir este producto: *${product.name}* (${formatPriceCOP(product.price)}). ¿Me podrían brindar más información?`;
    }
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
}

function openWorkWithUsWhatsApp() {
    const message = "Hola Gregori Joyería, quiero postularme a una vacante de Trabaja con Nosotros. Les comparto mi propuesta y mi CV.";
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
}

function setFilter(cat) {
    state.filter = cat;
    updateCatalogSearchUI();
}

function setMaterialFilter(material) {
    state.materialFilter = material;
    updateCatalogSearchUI();
}

function addToCart(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product || product.status === 'agotado') {
        showToast("Este producto no está disponible para agregar al carrito.", 'error');
        return;
    }

    const existing = state.cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({ id: productId, quantity: 1 });
    }

    renderNav();
    if (state.activeTab === 'carrito') renderApp();
    showToast("Producto agregado al carrito.", 'success');
}

function changeCartQuantity(productId, delta) {
    const item = state.cart.find(entry => entry.id === productId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
        state.cart = state.cart.filter(entry => entry.id !== productId);
    }
    renderNav();
    renderApp();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    renderNav();
    if (state.activeTab === 'carrito') renderApp();
}

function clearCart() {
    state.cart = [];
    renderNav();
    renderApp();
}

function checkoutCartWhatsApp() {
    const items = getCartDetailedItems();
    if (!items.length) {
        showToast("Tu carrito está vacío.", 'info');
        return;
    }

    const lines = items.map(item => `- ${item.product.name} (${item.quantity} x ${formatPriceCOP(item.unitPrice)}) = ${formatPriceCOP(item.subtotal)}`);
    const message = `Hola Gregori Joyería, quiero comprar estos productos:\n\n${lines.join('\n')}\n\nTotal estimado: ${formatPriceCOP(getCartTotal())}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
}

function startEditProduct(id) {
    state.editingProductId = id;
    renderApp();
    window.scrollTo(0, 0);
}

function cancelEditProduct() {
    state.editingProductId = null;
    renderApp();
}

// --- FUNCIONES DEL ADMIN ---
async function toggleStatus(id) {
    const product = state.products.find(p => p.id === id);
    if (!product) return;
    const newStatus = product.status === 'disponible' ? 'agotado' : 'disponible';
    await updateDoc(doc(db, "products", id), { status: newStatus });
}

async function deleteProduct(id) {
    if (confirm("¿Seguro que deseas eliminar este producto?")) {
        await deleteDoc(doc(db, "products", id));
        if (state.editingProductId === id) {
            state.editingProductId = null;
        }
    }
}

function normalizeImageUrl(value) {
    const rawValue = String(value == null ? '' : value).trim();
    if (!rawValue) return '';

    try {
        const parsedUrl = new URL(rawValue);
        const normalizedPath = parsedUrl.pathname
            .split('/')
            .map((segment, index) => {
                if (index === 0 || !segment) return segment;

                try {
                    return encodeURIComponent(decodeURIComponent(segment))
                        .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
                } catch (error) {
                    return encodeURIComponent(segment)
                        .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
                }
            })
            .join('/');

        parsedUrl.pathname = normalizedPath;

        if (parsedUrl.hostname.includes('dropbox.com')) {
            parsedUrl.hostname = 'dl.dropboxusercontent.com';
            parsedUrl.search = '';
            return parsedUrl.toString();
        }

        // --- MEJORA PARA CLOUDINARY ---
        if (parsedUrl.hostname.includes('res.cloudinary.com')) {
            // Si es un enlace de subida normal, le agregamos auto-formato y auto-calidad (f_auto,q_auto) 
            // para optimizar de forma automática si el usuario no los incluyó.
            if (parsedUrl.pathname.includes('/image/upload/') && !parsedUrl.pathname.includes('f_auto') && !parsedUrl.pathname.includes('q_auto')) {
                parsedUrl.pathname = parsedUrl.pathname.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
            }
            return parsedUrl.toString();
        }

        if (parsedUrl.hostname === 'imgur.com') {
            const imageId = parsedUrl.pathname.split('/').filter(Boolean)[0];
            if (imageId) {
                return `https://i.imgur.com/${imageId}.jpg`;
            }
        }

        return parsedUrl.toString();
    } catch (error) {
        return rawValue;
    }
}

function preloadImage(url) {
    return new Promise((resolve) => {
        const testImage = new Image();
        let isResolved = false;

        const finish = (result) => {
            if (isResolved) return;
            isResolved = true;
            resolve(result);
        };

        testImage.onload = () => finish(true);
        testImage.onerror = () => finish(false);
        testImage.src = url;

        setTimeout(() => finish(false), 7000);
    });
}

function isLikelyDirectImageUrl(url) {
    try {
        const parsedUrl = new URL(url);
        const pathWithQuery = `${parsedUrl.pathname}${parsedUrl.search}`.toLowerCase();
        return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(pathWithQuery);
    } catch (error) {
        return false;
    }
}

function isCloudinaryUrl(url) {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname.includes('res.cloudinary.com');
    } catch (error) {
        return false;
    }
}

function getAdminImageInputs() {
    return [
        { id: 'add-img-1', label: 'imagen principal' },
        { id: 'add-img-2', label: 'segunda imagen' },
        { id: 'add-img-3', label: 'tercera imagen' }
    ].map(entry => ({
        ...entry,
        input: document.getElementById(entry.id)
    }));
}

async function collectValidatedProductImages() {
    const imageEntries = getAdminImageInputs()
        .filter(entry => entry.input)
        .map((entry, index) => ({
            ...entry,
            value: String(entry.input.value || '').trim(),
            required: index === 0
        }))
        .filter(entry => entry.required || entry.value);

    if (!imageEntries.length || !imageEntries[0].value) {
        const firstInput = document.getElementById('add-img-1');
        showToast("Agrega al menos una imagen para el producto.", 'error');
        firstInput?.focus();
        return null;
    }

    const validatedImages = [];

    for (const entry of imageEntries) {
        const normalizedImage = normalizeImageUrl(entry.value);
        if (!normalizedImage) {
            showToast(`Ingresa una URL válida en la ${entry.label}.`, 'error');
            entry.input.focus();
            entry.input.select();
            return null;
        }

        const imageLoads = await preloadImage(normalizedImage);
        if (!imageLoads && !isLikelyDirectImageUrl(normalizedImage) && !isCloudinaryUrl(normalizedImage)) {
            showToast(`No se pudo validar la ${entry.label}. Usa una URL directa o un enlace válido de Cloudinary.`, 'error');
            entry.input.focus();
            entry.input.select();
            return null;
        }

        validatedImages.push(normalizedImage);
    }

    return validatedImages;
}

async function handleAddProduct(e) {
    e.preventDefault();
    const isEditing = Boolean(state.editingProductId);
    const submitButton = document.getElementById('add-submit');
    const priceInput = document.getElementById('add-price');
    const parsedPrice = parsePriceToNumber(priceInput.value);

    if (parsedPrice == null) {
        showToast("Ingresa un precio válido en pesos colombianos.", 'error');
        priceInput.focus();
        priceInput.select();
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = isEditing ? 'Actualizando...' : 'Validando imágenes...';
        submitButton.classList.add('opacity-70', 'cursor-not-allowed');
    }

    const validatedImages = await collectValidatedProductImages();

    if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = isEditing ? 'Actualizar Producto' : 'Guardar Producto';
        submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
    }

    if (!validatedImages || !validatedImages.length) {
        return;
    }

    const newProduct = {
        name: document.getElementById('add-name').value,
        category: document.getElementById('add-cat').value,
        material: document.getElementById('add-material').value,
        price: parsedPrice,
        image: validatedImages[0],
        images: validatedImages,
        description: document.getElementById('add-desc').value,
        status: document.getElementById('add-status').value,
        timestamp: Date.now()
    };

    try {
        if (isEditing) {
            await updateDoc(doc(db, "products", state.editingProductId), normalizeProductRecord(newProduct));
            showToast("Producto actualizado correctamente.", 'success');
            state.editingProductId = null;
        } else {
            await addDoc(collection(db, "products"), normalizeProductRecord(newProduct));
            showToast("Producto agregado correctamente.", 'success');
            e.target.reset();
        }
        renderApp();
    } catch (error) {
        console.error("Error agregando producto: ", error);
        showToast("Hubo un error al guardar el producto.", 'error');
    }
}

// --- EXPORTAR FUNCIONES AL SCOPE GLOBAL ---
// Al conectar Firebase como módulo moderno, las funciones necesitan exponerse manualmente.
Object.assign(window, {
    navigate, toggleMobileMenu, openSearch, setSearchQuery, clearSearch,
    handleLogin, handleLogout, setFilter, setMaterialFilter, setSortOrder, toggleStatus, deleteProduct,
    handleAddProduct, openModal, closeModal, contactWhatsApp,
    handleProductZoomMove, resetProductZoom, setSelectedProductImage,
    openWorkWithUsWhatsApp, formatAdminPriceInput, seedInitialData, showToast,
    addToCart, changeCartQuantity, removeFromCart, clearCart, checkoutCartWhatsApp,
    startEditProduct, cancelEditProduct
});

// --- INICIALIZACIÓN ---
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
renderNav();
renderApp();

