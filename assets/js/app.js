import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// Emblema del encabezado del catálogo (ruta estable vía import.meta)
const CATALOG_EMBLEM_SRC = new URL('../images/logobackground.svg', import.meta.url).href;

// --- ESTADO DE LA APLICACIÓN ---
const WHATSAPP_NUMBER = "573003216602"; // Número actualizado
// Enlaces de texto del menú (carrito y favoritos usan icono propio)
const NAV_LINKS = ['inicio', 'catalogo', 'nosotros', 'trabaja', 'contacto'];
const NAV_LABELS = {
    inicio: 'Inicio',
    catalogo: 'Catálogo',
    nosotros: 'Nosotros',
    trabaja: 'Trabaja con nosotros',
    contacto: 'Contacto'
};
const categories = ["Todos", "Cadenas", "Aretes", "Anillos", "Pulseras", "Combos"];
const materials = ["Todos", "Oro", "Oro laminado", "Plata"];
// Materiales reales de una joya (el resto de la lista, sin el filtro "Todos")
const JEWELRY_MATERIALS = materials.filter(m => m !== 'Todos');

// Medios de pago que se muestran en la ficha del producto (logos estables vía import.meta)
const PAYMENT_METHODS = [
    { name: 'Nequi', src: new URL('../images/pago-nequi.svg', import.meta.url).href, note: 'Transferencia o pago con QR' },
    { name: 'Bre-B', src: new URL('../images/pago-breb.svg', import.meta.url).href, note: 'Pago instantáneo con tu llave' }
];

// Textos de cuidado por defecto según el material (el admin puede sobrescribirlos)
const DEFAULT_CARE = {
    'Oro': 'El oro es un metal noble que no se oxida. Límpialo con un paño suave y seco; para un brillo profundo usa agua tibia con jabón neutro y sécalo por completo. Evita el contacto con cloro y productos abrasivos, y guárdalo en su bolsa individual para prevenir rayones.',
    'Oro laminado': 'El oro laminado conserva su brillo con buen cuidado: retíralo antes de bañarte, nadar o hacer ejercicio. Evita el contacto con perfumes, cremas, cloro y sudor. Límpialo con un paño suave y seco, y guárdalo en un lugar seco dentro de su bolsa.',
    'Plata': 'La plata puede oscurecerse de forma natural con el tiempo. Límpiala con un paño especial para plata o con un paño suave y seco. Evita el contacto con perfumes, humedad y productos químicos, y guárdala en una bolsa antihumedad bien cerrada para conservar su brillo.'
};
const DEFAULT_CARE_FALLBACK = 'Guarda tu joya en un lugar seco y en su bolsa individual. Evita el contacto con perfumes, cremas y productos químicos, y límpiala con un paño suave y seco para conservar su brillo.';

// Configuración por defecto del empaque (el admin puede sobrescribirla)
const DEFAULT_EMPAQUE = {
    image: '',
    description: 'Cada pieza se entrega en un empaque de regalo de Gregori Joyería, ideal para sorprender y para conservar tu joya siempre protegida.'
};
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
    cart: [],
    wishlist: [], // IDs de productos marcados como favoritos
    settings: { empaque: { ...DEFAULT_EMPAQUE }, cuidado: {} } // Empaque y textos de cuidado configurables desde el admin
};

// --- PERSISTENCIA LOCAL (carrito y favoritos sobreviven a recargas) ---
const STORAGE_KEYS = { cart: 'gregori.cart', wishlist: 'gregori.wishlist' };

function loadPersistedState() {
    try {
        const savedCart = JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) || '[]');
        if (Array.isArray(savedCart)) {
            state.cart = savedCart.filter(item => item && item.id && item.quantity > 0);
        }
    } catch (error) { /* almacenamiento no disponible o corrupto */ }

    try {
        const savedWishlist = JSON.parse(localStorage.getItem(STORAGE_KEYS.wishlist) || '[]');
        if (Array.isArray(savedWishlist)) {
            state.wishlist = savedWishlist.filter(Boolean);
        }
    } catch (error) { /* almacenamiento no disponible o corrupto */ }
}

function persistCart() {
    try { localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(state.cart)); } catch (error) { /* ignorar */ }
}

function persistWishlist() {
    try { localStorage.setItem(STORAGE_KEYS.wishlist, JSON.stringify(state.wishlist)); } catch (error) { /* ignorar */ }
}

loadPersistedState();

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
        } else if (state.activeTab === 'carrito' || state.activeTab === 'favoritos') {
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

// --- CONFIGURACIÓN EDITABLE (empaque y cuidado) EN TIEMPO REAL ---
onSnapshot(doc(db, "settings", "config"), (snap) => {
    const data = snap.exists() ? snap.data() : {};
    state.settings = {
        empaque: {
            image: data?.empaque?.image || '',
            description: data?.empaque?.description || DEFAULT_EMPAQUE.description
        },
        cuidado: (data?.cuidado && typeof data.cuidado === 'object') ? data.cuidado : {}
    };

    // Actualizaciones dirigidas para evitar parpadeos:
    // si un cliente tiene la ficha abierta, refrescamos solo el bloque de desplegables.
    const extras = document.getElementById('product-extras');
    if (extras && state.selectedProduct) {
        extras.innerHTML = renderProductExtras(state.selectedProduct);
    }
    // Si el admin está en el panel, resincronizamos los campos que no esté editando.
    if (state.activeTab === 'admin' && state.isAdminAuthenticated) {
        hydrateSettingsForm();
    }
}, (error) => {
    console.error("Error al leer la configuración: ", error);
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
    const material = JEWELRY_MATERIALS.includes(product?.material) ? product.material : 'Oro laminado';

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
    state.wishlist = state.wishlist.filter(id => productIds.has(id));
    persistCart();
    persistWishlist();
}

// --- WISHLIST / FAVORITOS ---
function isInWishlist(productId) {
    return state.wishlist.includes(productId);
}

function getWishlistCount() {
    return state.wishlist.length;
}

function getWishlistProducts() {
    return state.wishlist
        .map(id => state.products.find(product => product.id === id))
        .filter(Boolean);
}

function toggleWishlist(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    if (isInWishlist(productId)) {
        state.wishlist = state.wishlist.filter(id => id !== productId);
        showToast('Se quitó de tus favoritos.', 'info');
    } else {
        state.wishlist = [productId, ...state.wishlist];
        showToast('Se añadió a tus favoritos.', 'success');
    }

    persistWishlist();
    renderNav();
    updateWishlistButtons(productId);

    if (state.activeTab === 'favoritos') renderApp();
}

// Actualiza el estado visual de los botones de favorito sin re-renderizar toda la vista
function updateWishlistButtons(productId) {
    const active = isInWishlist(productId);
    document.querySelectorAll(`[data-wishlist-id="${CSS.escape(productId)}"]`).forEach(button => {
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        const icon = button.querySelector('i');
        if (icon) {
            icon.classList.toggle('fas', active);
            icon.classList.toggle('far', !active);
        }
    });
}

function renderWishlistButton(product, variant = 'card') {
    const active = isInWishlist(product.id);
    const base = variant === 'modal'
        ? 'h-12 w-12 border border-zinc-300 bg-white/90 hover:border-gold'
        : 'h-9 w-9 bg-white/90 shadow-sm hover:bg-white';
    return `
        <button type="button"
            onclick="event.stopPropagation(); toggleWishlist('${product.id}')"
            data-wishlist-id="${escapeHtml(product.id)}"
            aria-pressed="${active ? 'true' : 'false'}"
            aria-label="${active ? 'Quitar de favoritos' : 'Añadir a favoritos'}"
            class="wishlist-btn ${active ? 'is-active' : ''} flex items-center justify-center rounded-full text-zinc-500 transition-all ${base}">
            <i class="${active ? 'fas' : 'far'} fa-heart text-sm"></i>
        </button>`;
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
        <button type="button" onclick="navigate('carrito')" data-cart-target class="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-gold text-ink shadow-gold transition-transform hover:scale-105 hover:bg-gold-light md:h-16 md:w-16" title="Ir al carrito" aria-label="Ir al carrito de compra">
            <i class="fas fa-cart-shopping text-lg md:text-xl"></i>
            ${count > 0 ? `<span class="cart-count-badge absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-bold text-white">${count > 99 ? '99+' : count}</span>` : ''}
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

// --- SCROLL REVEAL (animaciones sutiles al entrar en viewport) ---
const revealObserver = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    : null;

function applyScrollReveal() {
    if (!revealObserver) return;
    requestAnimationFrame(() => {
        document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => revealObserver.observe(el));
    });
}

function renderNav() {
    const deskMenu = document.getElementById('desktop-menu');
    const mobMenu = document.getElementById('mobile-menu-links');
    const mobContainer = document.getElementById('mobile-menu');
    const mobIcon = document.getElementById('mobile-menu-icon');

    const cartCount = getCartCount();
    const wishlistCount = getWishlistCount();

    // Render Desktop Links (el carrito y favoritos tienen su propio icono)
    let deskHtml = '';
    NAV_LINKS.forEach(tab => {
        const isActive = state.activeTab === tab ? 'text-gold-dark' : 'text-zinc-500';
        deskHtml += `<button onclick="navigate('${tab}')" class="uppercase tracking-wide2 text-xs font-semibold transition-colors duration-300 hover:text-gold-dark ${isActive}">${NAV_LABELS[tab] || tab}</button>`;
    });

    deskHtml += `
        <div class="pl-5 border-l border-black/10 flex space-x-4 items-center">
            <button onclick="openSearch()" title="Buscar productos" class="text-zinc-500 hover:text-gold-dark transition-colors" aria-label="Buscar productos">
                <i class="fas fa-search"></i>
            </button>
            <button onclick="navigate('favoritos')" title="Favoritos" class="relative text-zinc-500 hover:text-gold-dark transition-colors" aria-label="Ver favoritos">
                <i class="${wishlistCount > 0 ? 'fas' : 'far'} fa-heart"></i>
                ${wishlistCount > 0 ? `<span class="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-gold-dark text-white text-[10px] font-bold flex items-center justify-center">${wishlistCount}</span>` : ''}
            </button>
            <button onclick="navigate('carrito')" title="Carrito" data-cart-target class="relative text-zinc-500 hover:text-gold-dark transition-colors" aria-label="Carrito de compra">
                <i class="fas fa-cart-shopping"></i>
                ${cartCount > 0 ? `<span class="cart-count-badge absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-gold-dark text-white text-[10px] font-bold flex items-center justify-center">${cartCount}</span>` : ''}
            </button>
        </div>`;
    deskMenu.innerHTML = deskHtml;

    // Render Mobile Links
    let mobHtml = '';
    NAV_LINKS.forEach(tab => {
        const isActive = state.activeTab === tab ? 'text-gold-dark' : 'text-zinc-600';
        mobHtml += `<button onclick="navigate('${tab}')" class="block w-full text-left px-3 py-4 uppercase tracking-wide2 text-sm ${isActive} hover:bg-cream hover:text-black border-b border-black/5 transition-colors">${NAV_LABELS[tab] || tab}</button>`;
    });
    mobMenu.innerHTML = mobHtml;

    // Toggle Mobile menu visibility
    const menuButton = mobIcon?.closest('button');
    if (state.isMobileMenuOpen) {
        mobContainer.classList.remove('hidden');
        mobIcon.className = 'fas fa-times text-2xl';
        menuButton?.setAttribute('aria-expanded', 'true');
    } else {
        mobContainer.classList.add('hidden');
        mobIcon.className = 'fas fa-bars text-2xl';
        menuButton?.setAttribute('aria-expanded', 'false');
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
        const heroCategories = [
            { name: 'Anillos', img: 'https://images.unsplash.com/photo-1631982690223-8aa4be0a2497?q=80&w=764&auto=format&fit=crop' },
            { name: 'Cadenas', img: 'https://images.unsplash.com/photo-1643236027686-399d6ebbbae0?q=80&w=687&auto=format&fit=crop' },
            { name: 'Aretes', img: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?q=80&w=880&auto=format&fit=crop' },
            { name: 'Pulseras', img: 'https://plus.unsplash.com/premium_photo-1709033404514-c3953af680b4?q=80&w=687&auto=format&fit=crop' }
        ];

        // Media cinta del marquee (se duplica para lograr el bucle infinito)
        const marqueeHalf = ['Gregori Joyería', 'Oro laminado', 'Plata fina', 'Envíos asegurados', 'Compra 100% segura', 'Asesoría personalizada']
            .map(text => `<span class="mx-7 inline-flex items-center gap-7 whitespace-nowrap text-ink uppercase tracking-luxe text-[11px] font-bold"><i class="fas fa-gem text-[9px] opacity-50"></i>${text}</span>`)
            .join('');

        html = `
            <div class="fade-in">
                <!-- Hero Section (editorial, asimétrico) -->
                <section class="relative min-h-[86vh] md:min-h-[92vh] w-full bg-ink overflow-hidden flex items-center">
                    <img src="https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&q=80&w=2000" alt="Alta joyería Gregori" fetchpriority="high" decoding="async" class="absolute inset-0 w-full h-full object-cover opacity-45 animate-ken-burns" data-image-label="Gregori Joyeria" data-image-kind="hero" onerror="handleImageError(this)"/>
                    <div class="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/20"></div>
                    <div class="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/30"></div>
                    <div class="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                        <div class="max-w-2xl border-l-2 border-gold/60 pl-6 md:pl-10">
                            <span class="inline-flex items-center gap-3 uppercase tracking-luxe text-[10px] md:text-xs mb-6 font-semibold text-gold-light">
                                <i class="fas fa-gem text-[10px]"></i> Alta joyería · 100% digital
                            </span>
                            <h1 class="text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-serif text-white mb-6 leading-[1.02]">Detalles que<br/><span class="italic font-light text-gold-light">brillan</span> contigo</h1>
                            <p class="text-zinc-300 max-w-md text-sm md:text-base font-light mb-9 leading-relaxed">Alta joyería seleccionada pieza por pieza. Elegancia atemporal con acompañamiento experto en cada compra.</p>
                            <div class="flex flex-col sm:flex-row gap-4">
                                <button onclick="navigate('catalogo')" class="w-full sm:w-auto px-10 py-4 uppercase tracking-wide2 text-xs font-bold text-ink bg-gold hover:bg-gold-light transition-all duration-500 shadow-gold hover:-translate-y-0.5">Explorar Colección</button>
                                <button onclick="navigate('contacto')" class="w-full sm:w-auto px-10 py-4 uppercase tracking-wide2 text-xs font-bold text-white border border-white/30 hover:border-gold hover:text-gold-light transition-all duration-500 backdrop-blur-sm">Asesoría Personalizada</button>
                            </div>
                            <div class="mt-12 pt-8 border-t border-white/10 flex flex-wrap gap-8 md:gap-14">
                                <div><p class="font-serif text-3xl md:text-4xl text-gold">${state.products.length || '···'}</p><p class="text-[10px] uppercase tracking-wide2 text-zinc-400 mt-1.5">Piezas exclusivas</p></div>
                                <div><p class="font-serif text-3xl md:text-4xl text-gold">${categories.length - 1}</p><p class="text-[10px] uppercase tracking-wide2 text-zinc-400 mt-1.5">Categorías</p></div>
                                <div><p class="font-serif text-3xl md:text-4xl text-gold">24/7</p><p class="text-[10px] uppercase tracking-wide2 text-zinc-400 mt-1.5">Atención digital</p></div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Cinta marquee dorada -->
                <div class="marquee bg-gold border-y border-gold-dark/30 py-3.5 select-none" aria-hidden="true">
                    <div class="marquee-track">${marqueeHalf}${marqueeHalf}</div>
                </div>

                <!-- Categorías Destacadas -->
                <section class="py-16 md:py-24 bg-ivory">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="reveal text-center mb-12 md:mb-16">
                            <p class="uppercase tracking-luxe text-[11px] font-bold text-gold-dark mb-4">Nuestras Colecciones</p>
                            <h2 class="text-3xl md:text-5xl font-serif text-ink">Explora por categoría</h2>
                        </div>
                        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            ${heroCategories.map((cat, i) => `
                                <button type="button" onclick="setFilter('${cat.name}'); navigate('catalogo')" class="reveal reveal-delay-${i + 1} relative aspect-[4/5] group overflow-hidden bg-sand rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark">
                                    <img src="${cat.img}" loading="lazy" decoding="async" class="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110" alt="${cat.name}">
                                    <div class="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent group-hover:from-ink/90 transition-colors duration-500"></div>
                                    <div class="absolute inset-x-0 bottom-0 flex flex-col items-center text-center p-5">
                                        <h3 class="text-2xl md:text-3xl font-serif text-white mb-2">${cat.name}</h3>
                                        <span class="uppercase tracking-wide2 text-[10px] text-gold-light border-b border-gold/60 pb-1 opacity-80 group-hover:opacity-100 transition-opacity duration-500">Ver colección</span>
                                    </div>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </section>

                <!-- Destacados -->
                <section class="py-16 md:py-24 bg-white border-y border-black/5">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div class="reveal flex flex-col items-center justify-center mb-14 md:mb-16">
                            <i class="fas fa-gem text-gold text-xl mb-4"></i>
                            <p class="uppercase tracking-luxe text-[11px] font-bold text-gold-dark mb-3">Selección del mes</p>
                            <h2 class="text-3xl md:text-5xl font-serif text-ink mb-5">Piezas Destacadas</h2>
                            <div class="gold-rule w-24"></div>
                        </div>
                        <div id="inicio-destacados-grid" class="grid grid-cols-2 lg:grid-cols-3 gap-5 md:gap-10 text-left">
                            ${state.products.slice(0, 3).map((p, i) => `<div class="reveal reveal-delay-${i + 1}">${renderProductCard(p)}</div>`).join('') || renderFeaturedPlaceholder()}
                        </div>
                        <div class="mt-16 md:mt-20">
                            <button onclick="navigate('catalogo')" class="group inline-flex items-center space-x-3 text-ink border border-ink px-9 py-4 hover:bg-ink hover:text-white transition-colors duration-300 uppercase tracking-wide2 text-xs font-bold">
                                <span>Ver toda la colección</span> <i class="fas fa-arrow-right text-xs transition-transform group-hover:translate-x-1"></i>
                            </button>
                        </div>
                    </div>
                </section>

                <!-- Marca / Filosofía -->
                <section class="py-16 md:py-28 bg-cream overflow-hidden">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                            <div class="reveal w-full lg:w-1/2 relative">
                                <div class="aspect-[4/5] max-h-[560px] overflow-hidden rounded-lg shadow-luxe">
                                    <img src="assets/images/Nosotrosimg.png" loading="lazy" decoding="async" alt="Curaduría Gregori Joyería" class="w-full h-full object-cover" onerror="handleImageError(this)"/>
                                </div>
                                <div class="hidden md:block absolute -bottom-6 -right-6 bg-ink text-white px-8 py-6 rounded-lg shadow-luxe">
                                    <p class="font-serif text-3xl text-gold">100%</p>
                                    <p class="uppercase tracking-wide2 text-[10px] text-zinc-300 mt-1">Servicio personalizado</p>
                                </div>
                            </div>
                            <div class="reveal reveal-delay-1 w-full lg:w-1/2">
                                <p class="uppercase tracking-luxe text-[11px] font-bold text-gold-dark mb-5">Nuestra Filosofía</p>
                                <h2 class="text-3xl md:text-5xl font-serif text-ink leading-tight mb-6">Alta joyería con respaldo y exclusividad</h2>
                                <p class="text-zinc-600 font-light leading-relaxed mb-5">En <strong class="font-medium text-ink">Gregori Joyería</strong> seleccionamos cada pieza bajo estrictos estándares de calidad, para clientes que valoran la elegancia, la distinción y la confianza en cada compra.</p>
                                <p class="text-zinc-600 font-light leading-relaxed mb-8">Acercamos la alta joyería a todo el país con atención directa, acompañamiento experto y un proceso de compra seguro.</p>
                                <button onclick="navigate('nosotros')" class="inline-flex items-center gap-3 text-ink font-bold uppercase tracking-wide2 text-xs border-b-2 border-gold pb-1 hover:text-gold-dark transition-colors">Conoce nuestra historia <i class="fas fa-arrow-right text-xs"></i></button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Banda CTA -->
                <section class="relative py-20 md:py-28 bg-ink overflow-hidden">
                    <div class="relative z-10 max-w-3xl mx-auto px-4 text-center reveal">
                        <i class="fab fa-whatsapp text-gold text-3xl mb-6"></i>
                        <h2 class="text-3xl md:text-5xl font-serif text-white mb-5">¿Buscas una pieza especial?</h2>
                        <p class="text-zinc-400 font-light mb-10 max-w-xl mx-auto">Nuestros asesores te acompañan para encontrar la joya perfecta. Escríbenos y recibe atención inmediata y personalizada.</p>
                        <button onclick="window.open('https://wa.me/${WHATSAPP_NUMBER}', '_blank')" class="inline-flex items-center gap-3 px-10 py-4 bg-gold text-ink uppercase tracking-wide2 text-xs font-bold hover:bg-gold-light transition-colors shadow-gold">
                            <i class="fab fa-whatsapp text-lg"></i> Hablar con un asesor
                        </button>
                    </div>
                </section>
            </div>`;
    }
    else if (state.activeTab === 'catalogo') {
        const filtered = getCatalogFilteredProducts();

        let filtersHtml = categories.map(cat => {
            const isActive = state.filter === cat ? 'bg-gold-dark text-white border-gold-dark shadow-sm' : 'bg-white text-zinc-500 border-zinc-200 hover:border-gold-dark hover:text-gold-dark';
            return `<button onclick="setFilter('${cat}')" class="px-5 py-2 rounded-full border uppercase tracking-wide2 text-[11px] font-semibold transition-all duration-300 ${isActive}">${cat}</button>`;
        }).join('');
        const materialFiltersHtml = materials.map(material => {
            const isActive = state.materialFilter === material ? 'bg-ink text-white border-ink shadow-sm' : 'bg-white text-zinc-500 border-zinc-200 hover:border-ink hover:text-ink';
            return `<button onclick="setMaterialFilter('${material}')" class="px-5 py-2 rounded-full border uppercase tracking-wide2 text-[11px] font-semibold transition-all duration-300 ${isActive}">${material}</button>`;
        }).join('');

        let productsHtml = renderCatalogProducts(filtered);

        html = `
            <div class="fade-in">
                <!-- Encabezado editorial oscuro -->
                <section class="relative bg-ink overflow-hidden">
                    <div class="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_top_right,_var(--gold),_transparent_55%)]" aria-hidden="true"></div>
                    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
                        <img src="${CATALOG_EMBLEM_SRC}" alt="Gregori Joyería" width="606" height="682" decoding="async" class="mx-auto h-16 md:h-20 w-auto object-contain mb-6 opacity-90 [filter:brightness(0)_invert(1)]" />
                        <p class="uppercase tracking-luxe text-[11px] font-bold text-gold-light mb-4">Alta joyería digital</p>
                        <h1 class="font-serif text-4xl md:text-6xl text-white mb-5">Nuestra Colección</h1>
                        <p class="mx-auto max-w-2xl text-sm md:text-base text-zinc-400 font-light">Explora nuestra selección completa de joyas finas. Cada pieza es elegida bajo estrictos estándares de calidad internacional.</p>
                    </div>
                </section>

                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
                    <div class="max-w-5xl mx-auto mb-10">
                        <div class="relative">
                            <i class="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400"></i>
                            <input
                                id="catalog-search"
                                type="text"
                                value="${escapeHtml(state.searchQuery)}"
                                oninput="setSearchQuery(this.value, this.selectionStart)"
                                placeholder="Busca por nombre, categoría o descripción"
                                aria-label="Buscar en el catálogo"
                                class="w-full rounded-full border border-zinc-200 bg-white py-4 pl-14 pr-14 text-sm text-zinc-700 placeholder:text-zinc-400 shadow-sm transition-all focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50"
                                autocomplete="off"
                            />
                            <div id="catalog-clear-button">${renderClearSearchButton()}</div>
                        </div>
                        <div class="mt-4 flex justify-center md:justify-end">
                            <label class="flex w-full max-w-xs items-center gap-3 rounded-full border border-zinc-200 bg-white px-5 py-3.5 text-xs uppercase tracking-wide2 text-zinc-400 shadow-sm">
                                <i class="fas fa-arrow-down-wide-short text-zinc-400"></i>
                                <span class="shrink-0 font-semibold">Ordenar</span>
                                <select id="catalog-sort" onchange="setSortOrder(this.value)" aria-label="Ordenar productos" class="w-full bg-transparent text-right text-xs font-semibold uppercase tracking-wide2 text-zinc-700 outline-none cursor-pointer">
                                    <option value="recent" ${state.sortOrder === 'recent' ? 'selected' : ''}>Recientes</option>
                                    <option value="price-asc" ${state.sortOrder === 'price-asc' ? 'selected' : ''}>Menor a mayor precio</option>
                                    <option value="price-desc" ${state.sortOrder === 'price-desc' ? 'selected' : ''}>Mayor a menor precio</option>
                                </select>
                            </label>
                        </div>
                        <p id="catalog-results-label" class="mt-4 text-center text-xs uppercase tracking-wide2 text-zinc-400">${escapeHtml(getCatalogResultsLabel(filtered))}</p>
                    </div>
                    <div class="mb-6">
                        <p class="mb-3 text-center text-[10px] uppercase tracking-luxe text-zinc-400">Categoría</p>
                        <div class="flex flex-wrap justify-center gap-3">${filtersHtml}</div>
                    </div>
                    <div class="mb-14">
                        <p class="mb-3 text-center text-[10px] uppercase tracking-luxe text-zinc-400">Material</p>
                        <div class="flex flex-wrap justify-center gap-3">${materialFiltersHtml}</div>
                    </div>
                    <div id="catalog-products-grid" class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">${productsHtml}</div>
                </div>
            </div>`;
    }
    else if (state.activeTab === 'carrito') {
        const cartItems = getCartDetailedItems();
        html = `
            <div class="py-10 md:py-20 bg-ivory min-h-[70vh] fade-in">
                <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 class="text-3xl md:text-5xl font-serif text-ink">Carrito de compra</h2>
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
                            <button onclick="checkoutCartWhatsApp()" class="mt-6 w-full flex items-center justify-center gap-3 rounded-full bg-gold px-8 py-4 text-sm font-bold uppercase tracking-wide2 text-ink transition-colors hover:bg-gold-light shadow-gold">
                                <i class="fab fa-whatsapp text-lg"></i> Enviar pedido por WhatsApp
                            </button>
                        </div>
                    ` : `
                        <div class="rounded-2xl border border-dashed border-zinc-300 bg-white p-14 text-center">
                            <i class="fas fa-cart-shopping text-4xl text-zinc-300"></i>
                            <p class="mt-6 text-lg text-zinc-500">Tu carrito está vacío.</p>
                            <button onclick="navigate('catalogo')" class="mt-8 rounded-full border border-ink px-7 py-3 text-xs font-bold uppercase tracking-wide2 text-ink transition-colors hover:bg-ink hover:text-white">
                                Ir al catálogo
                            </button>
                        </div>
                    `}
                </div>
            </div>`;
    }
    else if (state.activeTab === 'nosotros') {
        html = `
            <div class="fade-in">
                <section class="bg-ink text-center py-16 md:py-20 px-4">
                    <p class="uppercase tracking-luxe text-[11px] font-bold text-gold-light mb-4">Nuestra Historia</p>
                    <h1 class="text-4xl md:text-6xl font-serif text-white">Sobre Gregori Joyería</h1>
                </section>
                <div class="py-14 md:py-24 bg-white">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
                            <div class="reveal w-full lg:w-1/2 relative h-[360px] sm:h-[460px] lg:h-[600px] overflow-hidden rounded-lg shadow-luxe">
                                <img src="assets/images/Nosotrosimg.png" alt="Curaduría Gregori Joyería" loading="lazy" decoding="async"
                                    class="w-full h-full object-cover object-center scale-105 hover:scale-110 transition-transform duration-[1200ms]"
                                     onerror="handleImageError(this)"/>
                            </div>
                            <div class="reveal reveal-delay-1 w-full lg:w-1/2">
                                <span class="uppercase tracking-luxe text-[11px] font-bold mb-5 block text-gold-dark">Nuestra Filosofía</span>
                                <h2 class="text-3xl md:text-5xl font-serif text-ink mb-6 md:mb-8 leading-tight">Alta joyería con<br/>respaldo y exclusividad</h2>
                                <div class="space-y-6 text-zinc-600 font-light leading-relaxed">
                                    <p>En <strong class="font-medium text-ink">Gregori Joyería</strong> somos una joyería especializada en la comercialización de piezas exclusivas, pensadas para clientes que valoran la elegancia, la distinción y la confianza en cada compra.</p>
                                    <p>Brindamos una experiencia <strong class="font-medium text-ink">100%</strong> personalizada, acercando alta joyería a todo el país con atención directa, acompañamiento experto y un proceso de compra seguro.</p>
                                    <p>Cada joya de nuestro catálogo representa calidad, diseño y prestigio, respaldada por un servicio serio y una presentación a la altura de una marca de lujo.</p>
                                </div>
                                <div class="mt-10 grid grid-cols-3 gap-4 border-t border-black/5 pt-8">
                                    <div><p class="font-serif text-3xl text-gold-dark">100%</p><p class="text-[10px] uppercase tracking-wide2 text-zinc-500 mt-1">Digital</p></div>
                                    <div><p class="font-serif text-3xl text-gold-dark">★★★★★</p><p class="text-[10px] uppercase tracking-wide2 text-zinc-500 mt-1">Servicio</p></div>
                                    <div><p class="font-serif text-3xl text-gold-dark">CO</p><p class="text-[10px] uppercase tracking-wide2 text-zinc-500 mt-1">Envíos país</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    else if (state.activeTab === 'trabaja') {
        html = `
            <div class="py-16 md:py-24 fade-in bg-ink text-white">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="reveal text-center mb-14 md:mb-16">
                        <i class="fas fa-briefcase text-3xl mb-6 text-gold"></i>
                        <p class="uppercase tracking-luxe text-[11px] font-bold text-gold-light mb-4">Únete al equipo</p>
                        <h1 class="text-3xl md:text-5xl font-serif mb-6">Trabaja con nosotros</h1>
                        <p class="text-zinc-400 max-w-2xl mx-auto md:text-lg font-light">Buscamos talento apasionado por el lujo para comercializar nuestras colecciones exclusivas.</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                        <div class="reveal rounded-2xl bg-white/[0.04] p-8 md:p-10 border border-white/10 hover:border-gold/50 transition-colors">
                            <div class="w-12 h-12 rounded-full bg-gold/15 flex items-center justify-center text-gold mb-6"><i class="fas fa-user-tie"></i></div>
                            <h3 class="text-2xl font-serif mb-4">Asesores de Ventas Digitales</h3>
                            <p class="text-zinc-400 mb-6 font-light">Maneja tu propio tiempo ofreciendo nuestro catálogo a clientes de alto perfil con atractivas comisiones.</p>
                            <ul class="space-y-3 text-sm text-zinc-300">
                                <li class="flex items-center gap-3"><i class="fas fa-check text-gold text-xs"></i> Comisiones desde el primer mes.</li>
                                <li class="flex items-center gap-3"><i class="fas fa-check text-gold text-xs"></i> Trabajo 100% remoto.</li>
                                <li class="flex items-center gap-3"><i class="fas fa-check text-gold text-xs"></i> Capacitación en alta joyería.</li>
                            </ul>
                        </div>
                        <div class="reveal reveal-delay-1 rounded-2xl bg-white/[0.04] p-8 md:p-10 border border-white/10 hover:border-gold/50 transition-colors">
                            <div class="w-12 h-12 rounded-full bg-gold/15 flex items-center justify-center text-gold mb-6"><i class="fas fa-star"></i></div>
                            <h3 class="text-2xl font-serif mb-4">Embajadores de Marca</h3>
                            <p class="text-zinc-400 mb-6 font-light">¿Tienes una audiencia alineada con el lujo? Conviértete en embajador y promociona nuestras piezas.</p>
                            <ul class="space-y-3 text-sm text-zinc-300">
                                <li class="flex items-center gap-3"><i class="fas fa-check text-gold text-xs"></i> Códigos de descuento personalizados.</li>
                                <li class="flex items-center gap-3"><i class="fas fa-check text-gold text-xs"></i> Beneficios por volumen de referidos.</li>
                                <li class="flex items-center gap-3"><i class="fas fa-check text-gold text-xs"></i> Posibilidad de recibir piezas para contenido.</li>
                            </ul>
                        </div>
                    </div>
                    <div class="mt-14 text-center reveal">
                        <button onclick="openWorkWithUsWhatsApp()" class="px-10 py-4 uppercase tracking-wide2 text-xs font-bold text-ink bg-gold hover:bg-gold-light transition-colors inline-flex items-center gap-3 shadow-gold">
                            <i class="fab fa-whatsapp text-lg"></i> <span>Enviar propuesta / CV por WhatsApp</span>
                        </button>
                    </div>
                </div>
            </div>`;
    }
    else if (state.activeTab === 'contacto') {
        html = `
            <div class="fade-in">
                <section class="bg-ink text-center py-16 md:py-20 px-4">
                    <p class="uppercase tracking-luxe text-[11px] font-bold text-gold-light mb-4">Estamos para ti</p>
                    <h1 class="text-4xl md:text-6xl font-serif text-white mb-5">Asesoría Personalizada</h1>
                    <p class="text-zinc-400 max-w-2xl mx-auto font-light">Nuestra operación es 100% en línea, lo que nos permite dedicarte el tiempo que mereces desde tu hogar.</p>
                </section>

                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
                    <div class="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16">
                        <!-- Formulario -->
                        <div class="reveal lg:col-span-3 bg-white rounded-2xl border border-black/5 shadow-luxe-sm p-6 md:p-10">
                            <h2 class="font-serif text-2xl md:text-3xl text-ink mb-2">Escríbenos</h2>
                            <p class="text-zinc-500 text-sm mb-8">Completa el formulario y te contactaremos por WhatsApp. También puedes enviarlo directamente desde aquí.</p>
                            <form onsubmit="handleContactForm(event)" class="space-y-5">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label for="contact-name" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-2">Nombre</label>
                                        <input required id="contact-name" type="text" autocomplete="name" class="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all" />
                                    </div>
                                    <div>
                                        <label for="contact-phone" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-2">Teléfono / WhatsApp</label>
                                        <input required id="contact-phone" type="tel" inputmode="tel" autocomplete="tel" class="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all" />
                                    </div>
                                </div>
                                <div>
                                    <label for="contact-interest" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-2">¿En qué te interesa?</label>
                                    <select id="contact-interest" class="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all cursor-pointer">
                                        <option>Información general</option>
                                        <option>Anillos</option>
                                        <option>Cadenas</option>
                                        <option>Aretes</option>
                                        <option>Pulseras</option>
                                        <option>Combos</option>
                                        <option>Asesoría / Videollamada</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="contact-message" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-2">Mensaje</label>
                                    <textarea required id="contact-message" rows="4" placeholder="Cuéntanos qué buscas..." class="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all"></textarea>
                                </div>
                                <button type="submit" class="w-full flex items-center justify-center gap-3 rounded-full bg-gold px-8 py-4 text-sm font-bold uppercase tracking-wide2 text-ink transition-colors hover:bg-gold-light shadow-gold">
                                    <i class="fab fa-whatsapp text-lg"></i> Enviar por WhatsApp
                                </button>
                            </form>
                        </div>

                        <!-- Información -->
                        <div class="reveal reveal-delay-1 lg:col-span-2 space-y-5">
                            <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener noreferrer" class="flex items-start gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-luxe-sm transition-all hover:border-gold/50 hover:-translate-y-0.5">
                                <div class="w-12 h-12 shrink-0 rounded-full bg-gold-50 flex items-center justify-center text-gold-dark text-xl"><i class="fab fa-whatsapp"></i></div>
                                <div>
                                    <h3 class="font-serif text-lg text-ink">WhatsApp Inmediato</h3>
                                    <p class="text-zinc-500 text-sm mt-1">Habla con un asesor experto ahora mismo.</p>
                                </div>
                            </a>
                            <div class="flex items-start gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-luxe-sm">
                                <div class="w-12 h-12 shrink-0 rounded-full bg-cream flex items-center justify-center text-ink text-lg"><i class="fas fa-envelope"></i></div>
                                <div>
                                    <h3 class="font-serif text-lg text-ink">Correo Electrónico</h3>
                                    <a href="mailto:Gregorijoyeria@gmail.com" class="text-zinc-500 text-sm mt-1 block break-all hover:text-gold-dark transition-colors">Gregorijoyeria@gmail.com</a>
                                </div>
                            </div>
                            <a href="https://www.instagram.com/gregorijoyeria?igsh=YTdqc3BoOWNwb2Nj" target="_blank" rel="noopener noreferrer" class="flex items-start gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-luxe-sm transition-all hover:border-gold/50 hover:-translate-y-0.5">
                                <div class="w-12 h-12 shrink-0 rounded-full bg-cream flex items-center justify-center text-ink text-lg"><i class="fab fa-instagram"></i></div>
                                <div>
                                    <h3 class="font-serif text-lg text-ink">Instagram</h3>
                                    <p class="text-zinc-500 text-sm mt-1">@gregorijoyeria</p>
                                </div>
                            </a>
                            <div class="rounded-2xl bg-ink p-6 text-center">
                                <p class="text-zinc-400 text-xs uppercase tracking-wide2 mb-2">Atención</p>
                                <p class="text-white font-light text-sm">100% digital · Envíos asegurados a toda Colombia</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    else if (state.activeTab === 'favoritos') {
        const favorites = getWishlistProducts();
        html = `
            <div class="fade-in min-h-[70vh]">
                <section class="bg-ink text-center py-14 md:py-16 px-4">
                    <i class="fas fa-heart text-gold text-2xl mb-4"></i>
                    <h1 class="text-3xl md:text-5xl font-serif text-white mb-3">Tus Favoritos</h1>
                    <p class="text-zinc-400 font-light">${favorites.length ? `${favorites.length} pieza${favorites.length === 1 ? '' : 's'} guardada${favorites.length === 1 ? '' : 's'}` : 'Guarda las piezas que más te gusten'}</p>
                </section>
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                    ${favorites.length ? `
                        <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                            ${favorites.map(p => renderProductCard(p, true)).join('')}
                        </div>
                    ` : `
                        <div class="max-w-md mx-auto text-center rounded-2xl border border-dashed border-zinc-300 bg-white p-14">
                            <i class="far fa-heart text-4xl text-zinc-300"></i>
                            <p class="mt-6 text-lg text-zinc-500">Aún no tienes favoritos.</p>
                            <p class="mt-2 text-sm text-zinc-400">Toca el corazón en cualquier joya para guardarla aquí.</p>
                            <button onclick="navigate('catalogo')" class="mt-8 rounded-full border border-ink px-7 py-3 text-xs font-bold uppercase tracking-wide2 text-ink transition-colors hover:bg-ink hover:text-white">
                                Explorar catálogo
                            </button>
                        </div>
                    `}
                </div>
            </div>`;
    }
    else if (state.activeTab === 'admin') {
        if (!state.isAdminAuthenticated) {
            html = `
                <div class="relative min-h-[85vh] fade-in bg-ink flex items-center justify-center px-4 py-16 overflow-hidden">
                    <div class="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_top,_var(--gold),_transparent_60%)]" aria-hidden="true"></div>
                    <div class="relative w-full max-w-md">
                        <div class="reveal is-visible bg-ivory rounded-2xl shadow-luxe p-8 md:p-10">
                            <div class="text-center mb-8">
                                <div class="w-16 h-16 bg-gold-50 rounded-full flex items-center justify-center mx-auto mb-5 ring-1 ring-gold/20">
                                    <i class="fas fa-lock text-2xl text-gold-dark"></i>
                                </div>
                                <p class="uppercase tracking-luxe text-[10px] font-bold text-gold-dark mb-2">Panel privado</p>
                                <h2 class="text-2xl font-serif text-ink mb-2">Acceso Restringido</h2>
                                <p class="text-zinc-500 text-sm">Ingresa tus credenciales para administrar el catálogo.</p>
                            </div>
                            <form onsubmit="handleLogin(event)" class="space-y-5">
                                <div>
                                    <label for="login-user" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-2">Usuario</label>
                                    <input required id="login-user" type="text" autocomplete="username" class="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all" />
                                </div>
                                <div>
                                    <label for="login-pass" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-2">Contraseña</label>
                                    <input required id="login-pass" type="password" autocomplete="current-password" class="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all" />
                                </div>
                                <button type="submit" class="w-full flex items-center justify-center gap-2 rounded-full py-4 text-ink text-sm uppercase tracking-wide2 font-bold bg-gold hover:bg-gold-light transition-colors shadow-gold mt-2">
                                    <i class="fas fa-arrow-right-to-bracket"></i> Ingresar
                                </button>
                            </form>
                        </div>
                        <button onclick="navigate('inicio')" class="mt-6 mx-auto block text-zinc-400 hover:text-gold-light text-xs uppercase tracking-wide2 transition-colors">← Volver al sitio</button>
                    </div>
                </div>`;
        } else {
            const totalProducts = state.products.length;
            const disponibles = state.products.filter(p => p.status === 'disponible').length;
            const agotados = totalProducts - disponibles;
            const editingProduct = state.editingProductId ? state.products.find(p => p.id === state.editingProductId) : null;
            html = `
                <div class="py-10 md:py-12 fade-in bg-ivory min-h-screen">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <!-- Encabezado -->
                        <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
                            <div>
                                <p class="uppercase tracking-luxe text-[10px] font-bold text-gold-dark mb-2">Gregori Joyería</p>
                                <h1 class="text-3xl md:text-4xl font-serif text-ink flex items-center gap-3">
                                    <i class="fas fa-gem text-gold"></i> Panel Administrativo
                                </h1>
                                <p class="text-zinc-500 text-sm mt-1">Gestiona el inventario, precios y disponibilidad.</p>
                            </div>
                            <button onclick="handleLogout()" class="rounded-full px-5 py-2.5 border border-zinc-300 text-xs text-zinc-600 hover:bg-ink hover:text-white hover:border-ink transition-colors uppercase tracking-wide2 font-bold flex items-center gap-2 w-fit">
                                <i class="fas fa-arrow-right-from-bracket"></i> Cerrar Sesión
                            </button>
                        </div>

                        <!-- Accesos rápidos -->
                        <div class="flex flex-wrap gap-2 mb-6">
                            <button type="button" onclick="document.getElementById('admin-inventory').scrollIntoView({behavior:'smooth'})" class="rounded-full px-4 py-2 border border-zinc-200 bg-white text-[11px] uppercase tracking-wide2 font-bold text-zinc-600 hover:border-ink hover:text-ink transition-colors flex items-center gap-2"><i class="fas fa-boxes-stacked text-gold-dark"></i> Inventario</button>
                            <button type="button" onclick="document.getElementById('admin-config').scrollIntoView({behavior:'smooth'})" class="rounded-full px-4 py-2 border border-zinc-200 bg-white text-[11px] uppercase tracking-wide2 font-bold text-zinc-600 hover:border-ink hover:text-ink transition-colors flex items-center gap-2"><i class="fas fa-sliders text-gold-dark"></i> Configuración</button>
                        </div>

                        <!-- Estadísticas -->
                        <div class="grid grid-cols-3 gap-3 md:gap-5 mb-8">
                            <div class="rounded-xl bg-white border border-black/5 shadow-luxe-sm p-3 md:p-5">
                                <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                    <div class="w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-full bg-cream flex items-center justify-center text-ink"><i class="fas fa-boxes-stacked"></i></div>
                                    <div class="min-w-0"><p class="font-serif text-2xl md:text-3xl text-ink leading-none">${totalProducts}</p><p class="text-[10px] uppercase tracking-wide2 text-zinc-400 mt-1">Total</p></div>
                                </div>
                            </div>
                            <div class="rounded-xl bg-white border border-black/5 shadow-luxe-sm p-3 md:p-5">
                                <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                    <div class="w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-full bg-green-50 flex items-center justify-center text-green-600"><i class="fas fa-circle-check"></i></div>
                                    <div class="min-w-0"><p class="font-serif text-2xl md:text-3xl text-ink leading-none">${disponibles}</p><p class="text-[10px] uppercase tracking-wide2 text-zinc-400 mt-1">Disponibles</p></div>
                                </div>
                            </div>
                            <div class="rounded-xl bg-white border border-black/5 shadow-luxe-sm p-3 md:p-5">
                                <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                    <div class="w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-full bg-red-50 flex items-center justify-center text-red-500"><i class="fas fa-circle-xmark"></i></div>
                                    <div class="min-w-0"><p class="font-serif text-2xl md:text-3xl text-ink leading-none">${agotados}</p><p class="text-[10px] uppercase tracking-wide2 text-zinc-400 mt-1">Agotados</p></div>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                            <!-- Formulario -->
                            <div class="lg:col-span-1 bg-white rounded-2xl p-6 shadow-luxe-sm border ${state.editingProductId ? 'border-gold/50 ring-1 ring-gold/20' : 'border-black/5'} h-fit lg:sticky lg:top-24">
                                <h2 class="uppercase tracking-wide2 text-sm font-bold text-ink mb-6 flex items-center gap-2"><i class="fas ${state.editingProductId ? 'fa-pen text-gold-dark' : 'fa-plus text-gold-dark'}"></i> ${state.editingProductId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                                <form onsubmit="handleAddProduct(event)" class="space-y-4">
                                    <div><label for="add-name" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-1.5">Nombre</label>
                                    <input required id="add-name" type="text" value="${editingProduct ? escapeHtml(editingProduct.name || '') : ''}" class="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all" /></div>
                                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div><label for="add-cat" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-1.5">Categoría</label>
                                        <select id="add-cat" class="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-gold focus:outline-none cursor-pointer">
                                            ${categories.filter(c => c !== 'Todos').map(c => `<option value="${c}" ${editingProduct?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                                        </select></div>
                                        <div><label for="add-material" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-1.5">Material</label>
                                        <select id="add-material" class="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-gold focus:outline-none cursor-pointer">
                                            ${materials.filter(m => m !== 'Todos').map(m => `<option value="${m}" ${editingProduct?.material === m ? 'selected' : ''}>${m}</option>`).join('')}
                                        </select></div>
                                        <div><label for="add-price" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-1.5">Precio</label>
                                        <input required id="add-price" type="text" value="${editingProduct ? escapeHtml(formatPriceForInput(editingProduct.price)) : ''}" inputmode="numeric" placeholder="200.000" onblur="formatAdminPriceInput()" class="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all" /></div>
                                    </div>
                                    <div><label for="add-img-1" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-1.5">Imágenes del producto</label>
                                    <div class="space-y-2.5">
                                    <input required id="add-img-1" type="url" value="${editingProduct ? escapeHtml(getProductImages(editingProduct)[0] || '') : ''}" placeholder="URL Foto 1 (portada)" class="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all" />
                                    <input id="add-img-2" type="url" value="${editingProduct ? escapeHtml(getProductImages(editingProduct)[1] || '') : ''}" placeholder="URL Foto 2 (opcional)" class="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all" />
                                    <input id="add-img-3" type="url" value="${editingProduct ? escapeHtml(getProductImages(editingProduct)[2] || '') : ''}" placeholder="URL Foto 3 (opcional)" class="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all" />
                                    </div>
                                    <div class="mt-2 flex items-center justify-between gap-3">
                                        <p class="text-[11px] text-zinc-400">Entre 1 y 3 imágenes. La primera será la portada.</p>
                                        <button type="button" onclick="window.open('https://cloudinary.com/', '_blank')" class="shrink-0 text-[11px] uppercase tracking-wide2 font-bold text-gold-dark hover:text-gold-deep transition-colors">Cloudinary</button>
                                    </div>
                                    </div>
                                    <div><label for="add-desc" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-1.5">Descripción</label>
                                    <textarea required id="add-desc" rows="3" class="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all">${editingProduct ? escapeHtml(editingProduct.description || '') : ''}</textarea></div>
                                    <div><label for="add-status" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-1.5">Estado</label>
                                    <select id="add-status" class="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-gold focus:outline-none cursor-pointer">
                                        <option value="disponible" ${editingProduct?.status === 'disponible' ? 'selected' : ''}>Disponible</option><option value="agotado" ${editingProduct?.status === 'agotado' ? 'selected' : ''}>Agotado</option>
                                    </select></div>
                                    <div class="grid grid-cols-1 ${state.editingProductId ? 'sm:grid-cols-2' : ''} gap-3 pt-2">
                                        <button id="add-submit" type="submit" class="w-full rounded-full py-3 text-ink text-sm uppercase tracking-wide2 font-bold bg-gold hover:bg-gold-light transition-colors shadow-gold">${state.editingProductId ? 'Actualizar' : 'Guardar Producto'}</button>
                                        ${state.editingProductId ? '<button type="button" onclick="cancelEditProduct()" class="w-full rounded-full py-3 border border-zinc-300 text-zinc-600 text-sm uppercase tracking-wide2 font-bold hover:bg-zinc-100 transition-colors">Cancelar</button>' : ''}
                                    </div>
                                </form>
                            </div>
                            <!-- Tabla -->
                            <div id="admin-inventory" class="scroll-mt-24 lg:col-span-2 bg-white rounded-2xl shadow-luxe-sm border border-black/5 overflow-hidden">
                                <div class="px-6 py-4 border-b border-black/5 flex items-center justify-between">
                                    <h2 class="font-serif text-lg text-ink">Inventario</h2>
                                    <span class="text-[10px] uppercase tracking-wide2 text-zinc-400">${totalProducts} pieza${totalProducts === 1 ? '' : 's'}</span>
                                </div>
                                <div class="overflow-x-auto">
                                    <table class="w-full text-left border-collapse">
                                        <thead>
                                            <tr class="bg-cream text-zinc-500 text-[10px] uppercase tracking-wide2">
                                                <th class="p-4 font-semibold">Producto</th><th class="p-4 font-semibold">Precio</th>
                                                <th class="p-4 font-semibold">Estado</th><th class="p-4 font-semibold text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="admin-table-body" class="divide-y divide-black/5 text-sm">
                                            ${renderAdminTableRows()}
                                        </tbody>
                                    </table>
                                    <div id="admin-empty-msg" class="p-12 text-center text-zinc-500" style="display: ${totalProducts === 0 ? 'block' : 'none'}">
                                        <i class="fas fa-box-open text-3xl text-zinc-300 mb-4"></i><br/>
                                        No hay productos en la base de datos.<br/>
                                        <button type="button" onclick="seedInitialData()" class="mt-5 rounded-full px-6 py-2.5 bg-gold text-ink text-xs uppercase tracking-wide2 font-bold hover:bg-gold-light transition-colors shadow-gold">Cargar Datos de Prueba</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Configuración de la tienda (empaque y cuidado) -->
                        <div id="admin-config" class="scroll-mt-24 mt-6 lg:mt-8 bg-white rounded-2xl p-6 shadow-luxe-sm border border-black/5">
                            <h2 class="uppercase tracking-wide2 text-sm font-bold text-ink mb-1 flex items-center gap-2"><i class="fas fa-sliders text-gold-dark"></i> Configuración de la tienda</h2>
                            <p class="text-xs text-zinc-400 mb-6">Estos datos se muestran en los desplegables de cada producto (el medio de pago es fijo; el empaque y el cuidado son configurables).</p>
                            <form onsubmit="handleSaveSettings(event)" class="space-y-8">
                                <!-- Empaque -->
                                <div>
                                    <h3 class="text-xs font-bold uppercase tracking-wide2 text-ink mb-4 flex items-center gap-2"><i class="fas fa-gift text-gold-dark"></i> Empaque</h3>
                                    <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
                                        <div class="space-y-4">
                                            <div><label for="cfg-empaque-img" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-1.5">URL de la foto del empaque</label>
                                            <input id="cfg-empaque-img" type="url" value="${escapeHtml(state.settings.empaque.image || '')}" placeholder="URL de la imagen (Cloudinary, etc.)" oninput="updateEmpaquePreview()" class="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all" /></div>
                                            <div><label for="cfg-empaque-desc" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-1.5">Descripción del empaque</label>
                                            <textarea id="cfg-empaque-desc" rows="4" placeholder="Breve descripción del empaque..." class="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all">${escapeHtml(state.settings.empaque.description || '')}</textarea></div>
                                        </div>
                                        <div id="cfg-empaque-preview" class="justify-self-center lg:justify-self-end">${empaquePreviewMarkup(state.settings.empaque.image || '')}</div>
                                    </div>
                                </div>
                                <!-- Cuidado por material -->
                                <div>
                                    <h3 class="text-xs font-bold uppercase tracking-wide2 text-ink mb-1 flex items-center gap-2"><i class="fas fa-hand-sparkles text-gold-dark"></i> Cuidado según el material</h3>
                                    <p class="text-[11px] text-zinc-400 mb-4">Cada joya muestra el texto correspondiente a su material.</p>
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        ${JEWELRY_MATERIALS.map(m => {
                                            const value = state.settings.cuidado[m] != null ? state.settings.cuidado[m] : (DEFAULT_CARE[m] || '');
                                            return `<div><label for="cfg-care-${materialSlug(m)}" class="block text-xs text-zinc-500 uppercase tracking-wide2 mb-1.5">${escapeHtml(m)}</label>
                                            <textarea id="cfg-care-${materialSlug(m)}" rows="6" placeholder="Cómo cuidar una joya de ${escapeHtml(m.toLowerCase())}..." class="w-full rounded-lg border border-zinc-300 p-2.5 text-sm focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-50 transition-all">${escapeHtml(value)}</textarea></div>`;
                                        }).join('')}
                                    </div>
                                </div>
                                <div class="pt-2">
                                    <button id="cfg-submit" type="submit" class="rounded-full px-8 py-3 text-ink text-sm uppercase tracking-wide2 font-bold bg-gold hover:bg-gold-light transition-colors shadow-gold">Guardar configuración</button>
                                </div>
                            </form>
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

    applyScrollReveal();
    updateFloatingCartFab();
}

// --- FORMULARIO DE CONTACTO (envía por WhatsApp) ---
function handleContactForm(e) {
    e.preventDefault();
    const name = document.getElementById('contact-name')?.value.trim() || '';
    const phone = document.getElementById('contact-phone')?.value.trim() || '';
    const interest = document.getElementById('contact-interest')?.value || 'Información general';
    const message = document.getElementById('contact-message')?.value.trim() || '';

    const text = `Hola Gregori Joyería, soy *${name}*.\n\nInterés: ${interest}\nMi teléfono: ${phone}\n\n${message}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
    showToast('Te redirigimos a WhatsApp para enviar tu mensaje.', 'success');
}

// --- COMPONENTES AUXILIARES ---
function renderAdminTableRows() {
    return state.products.map(p => `
        <tr class="hover:bg-cream/60 transition-colors">
            <td class="p-4 flex items-center gap-3">
                <img src="${getPrimaryProductImage(p)}" class="w-11 h-11 object-cover rounded-lg border border-black/5" data-image-source="${escapeHtml(getPrimaryProductImage(p))}" data-image-label="${escapeHtml(p.category)}" data-image-kind="product" referrerpolicy="no-referrer" onerror="handleImageError(this)" />
                <div class="min-w-0"><p class="font-semibold text-ink line-clamp-1">${escapeHtml(p.name)}</p><p class="text-xs text-zinc-500">${escapeHtml(p.category)} · ${escapeHtml(p.material)} · ${getProductImages(p).length} foto${getProductImages(p).length === 1 ? '' : 's'}</p></div>
            </td>
            <td class="p-4 font-medium text-ink whitespace-nowrap">${formatPriceCOP(p.price)}</td>
            <td class="p-4"><button onclick="toggleStatus('${p.id}')" title="Cambiar estado" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wide2 font-bold border transition-colors ${p.status === 'disponible' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}"><span class="w-1.5 h-1.5 rounded-full ${p.status === 'disponible' ? 'bg-green-500' : 'bg-red-500'}"></span>${p.status}</button></td>
            <td class="p-4 text-right whitespace-nowrap">
                <button onclick="startEditProduct('${p.id}')" class="text-zinc-400 hover:text-gold-dark transition-colors p-2" aria-label="Editar producto"><i class="fas fa-pen"></i></button>
                <button onclick="deleteProduct('${p.id}')" class="text-zinc-400 hover:text-red-600 transition-colors p-2" aria-label="Eliminar producto"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

// Marcador de posición mientras Firebase aún no entrega productos destacados
function renderFeaturedPlaceholder() {
    return Array.from({ length: 3 }).map(() => `
        <div class="rounded-xl border border-black/5 overflow-hidden">
            <div class="aspect-square img-skeleton"></div>
            <div class="p-4 space-y-3">
                <div class="h-3 w-3/4 img-skeleton rounded"></div>
                <div class="h-3 w-1/3 img-skeleton rounded"></div>
            </div>
        </div>
    `).join('');
}

function renderProductCard(product, inCatalog = false) {
    const isAgotado = product.status === 'agotado';
    const imgClass = isAgotado ? 'grayscale-30' : '';
    const primaryImage = getPrimaryProductImage(product);

    const badges = [];
    if (inCatalog) {
        badges.push(`<span class="bg-white/95 backdrop-blur-sm px-2.5 py-1 text-[9px] uppercase tracking-wide2 font-bold text-ink rounded-full shadow-sm">${escapeHtml(product.category)}</span>`);
    }
    if (isAgotado) {
        badges.push(`<span class="bg-ink/90 text-white px-2.5 py-1 text-[9px] uppercase tracking-wide2 font-bold rounded-full">Agotado</span>`);
    }

    return `
        <article class="group relative flex flex-col rounded-xl bg-white border border-black/[0.06] overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-luxe hover:border-gold/40 cursor-pointer" onclick="openModal('${product.id}')">
            <div class="relative aspect-square bg-cream overflow-hidden ${isAgotado ? 'opacity-90' : ''}">
                <img src="${primaryImage}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105 ${imgClass}" data-image-source="${escapeHtml(primaryImage)}" data-image-label="${escapeHtml(product.category)}" data-image-kind="product" referrerpolicy="no-referrer" onerror="handleImageError(this)" />
                <div class="absolute top-3 left-3 flex flex-col gap-2 z-10">${badges.join('')}</div>
                <div class="absolute top-3 right-3 z-10">${renderWishlistButton(product, 'card')}</div>
                <div class="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 hidden sm:block">
                    <span class="block text-center py-2.5 bg-ink/90 backdrop-blur-sm text-white text-[10px] uppercase tracking-wide2 font-bold">Ver detalles</span>
                </div>
            </div>
            <div class="flex flex-col flex-1 p-4 text-center">
                <p class="text-[10px] uppercase tracking-wide2 text-gold-dark font-semibold mb-1.5">${escapeHtml(product.material || 'Oro laminado')}</p>
                <h3 class="font-serif text-base md:text-lg text-ink mb-1.5 line-clamp-1">${escapeHtml(product.name)}</h3>
                <p class="text-sm text-zinc-700 font-medium mb-3">${formatPriceCOP(product.price)}</p>
                ${inCatalog ? `
                    <div class="mt-auto pt-1">
                        ${isAgotado
                            ? `<button onclick="event.stopPropagation(); contactWhatsApp('${product.id}')" class="w-full rounded-full border border-zinc-300 px-4 py-2.5 text-[10px] uppercase tracking-wide2 font-bold text-zinc-600 transition-colors hover:border-ink hover:text-ink">Consultar disponibilidad</button>`
                            : `<button onclick="event.stopPropagation(); addToCart('${product.id}', event)" class="w-full rounded-full bg-cream border border-transparent px-4 py-2.5 text-[10px] uppercase tracking-wide2 font-bold text-ink transition-colors hover:bg-gold hover:text-ink">Agregar al carrito</button>`
                        }
                    </div>
                ` : ''}
            </div>
        </article>
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

// --- DESPLEGABLES DE LA FICHA (medios de pago, empaque y cuidado) ---
function getProductCareText(product) {
    const material = JEWELRY_MATERIALS.includes(product?.material) ? product.material : 'Oro laminado';
    const custom = state.settings?.cuidado?.[material];
    if (custom && String(custom).trim()) return String(custom);
    return DEFAULT_CARE[material] || DEFAULT_CARE_FALLBACK;
}

function renderExtraAccordion({ icon, title, subtitle, body, open = false }) {
    return `
        <details class="product-extra"${open ? ' open' : ''}>
            <summary class="product-extra-summary">
                <span class="flex items-center gap-3">
                    <span class="w-9 h-9 shrink-0 rounded-full bg-cream flex items-center justify-center text-gold-dark"><i class="fas ${icon}"></i></span>
                    <span>
                        <span class="block text-sm font-semibold text-ink uppercase tracking-wide2">${title}</span>
                        ${subtitle ? `<span class="block text-[11px] text-zinc-400 normal-case tracking-normal">${subtitle}</span>` : ''}
                    </span>
                </span>
                <i class="fas fa-chevron-down product-extra-chevron text-zinc-400"></i>
            </summary>
            <div class="product-extra-body">${body}</div>
        </details>
    `;
}

function renderProductExtras(product) {
    if (!product) return '';
    const material = JEWELRY_MATERIALS.includes(product.material) ? product.material : 'Oro laminado';

    const paymentsHtml = `
        <p class="text-sm text-zinc-500 leading-relaxed mb-4">Recibimos tus pagos de forma rápida y segura a través de:</p>
        <div class="grid grid-cols-2 gap-4">
            ${PAYMENT_METHODS.map(method => `
                <div class="flex flex-col items-center justify-center text-center gap-3 rounded-2xl border border-zinc-100 bg-white p-5 shadow-luxe-sm">
                    <img src="${method.src}" alt="${escapeHtml(method.name)}" class="h-10 w-auto max-w-[80%] object-contain" />
                    <span>
                        <span class="block text-sm font-semibold text-ink">${escapeHtml(method.name)}</span>
                        <span class="block text-[11px] text-zinc-400">${escapeHtml(method.note)}</span>
                    </span>
                </div>
            `).join('')}
        </div>
    `;

    const empaque = state.settings?.empaque || DEFAULT_EMPAQUE;
    const empaqueImg = empaque.image ? normalizeImageUrl(empaque.image) : '';
    const empaqueHtml = `
        <div class="space-y-4">
            ${empaqueImg
                ? `<img src="${empaqueImg}" alt="Empaque Gregori Joyería" class="w-full h-56 rounded-2xl object-cover border border-zinc-100" referrerpolicy="no-referrer" onerror="handleImageError(this)" data-image-source="${escapeHtml(empaqueImg)}" data-image-label="Empaque" data-image-kind="product" />`
                : `<div class="w-full h-56 rounded-2xl bg-cream flex items-center justify-center text-gold-dark border border-zinc-100"><i class="fas fa-gift text-5xl"></i></div>`}
            <p class="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">${escapeHtml(empaque.description || DEFAULT_EMPAQUE.description)}</p>
        </div>
    `;

    const careHtml = `
        <p class="text-[11px] uppercase tracking-wide2 text-zinc-400 mb-2">Material: ${escapeHtml(material)}</p>
        <p class="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">${escapeHtml(getProductCareText(product))}</p>
    `;

    return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            ${renderExtraAccordion({ icon: 'fa-credit-card', title: 'Medios de pago', subtitle: 'Nequi · Bre-B', body: paymentsHtml, open: true })}
            ${renderExtraAccordion({ icon: 'fa-gift', title: 'Empaque', subtitle: 'Presentación de tu joya', body: empaqueHtml, open: true })}
            ${renderExtraAccordion({ icon: 'fa-hand-sparkles', title: 'Cuidado de tu joya', subtitle: '', body: careHtml, open: true })}
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
                    <div class="flex w-full flex-col gap-3">
                        <button onclick="contactWhatsApp('${product.id}')" class="w-full px-6 sm:px-10 py-4 flex items-center justify-center space-x-3 uppercase tracking-wide2 text-xs sm:text-sm font-bold transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg ${btnColor}">
                            <i class="fab fa-whatsapp text-lg"></i> <span>${btnText}</span>
                        </button>
                        <div class="flex gap-3">
                            ${!isAgotado ? `<button onclick="addToCart('${product.id}', event)" class="flex-1 px-6 py-4 border border-zinc-300 text-zinc-700 hover:border-ink hover:text-ink uppercase tracking-wide2 text-xs font-bold transition-colors">Agregar al carrito</button>` : ''}
                            ${renderWishlistButton(product, 'modal')}
                        </div>
                    </div>
                    <div class="mt-8 pt-8 border-t border-zinc-100 flex items-center space-x-4 text-sm text-zinc-500">
                        <i class="fas fa-shield-alt"></i><span>100% Compra Segura Online - Envío Asegurado</span>
                    </div>
                </div>
            </div>
            <div id="product-extras" class="mt-12 md:mt-16">
                ${renderProductExtras(product)}
            </div>
            ${renderRelatedProducts(product)}
        </div>
    `;

    const modalContainer = document.getElementById('product-modal');
    // Si el modal ya estaba abierto (p. ej. al elegir un producto relacionado),
    // animamos la entrada del nuevo contenido y subimos suavemente al inicio
    // para que el cambio de producto sea evidente.
    const wasOpen = !modalContainer.classList.contains('hidden');
    modalContainer.innerHTML = `<div${wasOpen ? ' class="modal-swap-in"' : ''}>${modalHtml}</div>`;
    modalContainer.classList.remove('hidden');
    if (wasOpen) {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        modalContainer.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
        // Respaldo: si el desplazamiento suave se interrumpe, forzamos la subida
        setTimeout(() => {
            if (modalContainer.scrollTop > 4) modalContainer.scrollTop = 0;
        }, 650);
    } else {
        modalContainer.scrollTop = 0;
    }
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

// --- ANIMACIÓN DE VUELO AL CARRITO ---
function getVisibleCartTarget() {
    return [...document.querySelectorAll('[data-cart-target]')]
        .find(el => el.getBoundingClientRect().width > 0);
}

function flyImageToCart(sourceImg) {
    const target = getVisibleCartTarget();
    if (!sourceImg || !target) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const from = sourceImg.getBoundingClientRect();
    if (!from.width) return;
    const to = target.getBoundingClientRect();

    const clone = document.createElement('img');
    clone.src = sourceImg.currentSrc || sourceImg.src;
    clone.alt = '';
    clone.className = 'cart-fly-img';
    Object.assign(clone.style, {
        left: `${from.left}px`,
        top: `${from.top}px`,
        width: `${from.width}px`,
        height: `${from.height}px`,
        opacity: '0.95'
    });
    document.body.appendChild(clone);

    // Reflow forzado: garantiza que el estado inicial se aplique antes de animar
    void clone.offsetWidth;
    Object.assign(clone.style, {
        left: `${to.left + to.width / 2 - 14}px`,
        top: `${to.top + to.height / 2 - 14}px`,
        width: '28px',
        height: '28px',
        opacity: '0.2'
    });

    setTimeout(() => {
        clone.remove();
        // Bump del contador justo cuando "aterriza" el producto
        document.querySelectorAll('.cart-count-badge').forEach(badge => {
            badge.classList.remove('cart-bump');
            void badge.offsetWidth; // reinicia la animación
            badge.classList.add('cart-bump');
        });
    }, 720);
}

function addToCart(productId, ev) {
    const product = state.products.find(p => p.id === productId);
    if (!product || product.status === 'agotado') {
        showToast("Este producto no está disponible para agregar al carrito.", 'error');
        return;
    }

    const sourceImg = ev?.target?.closest?.('article')?.querySelector('img')
        || document.getElementById('product-main-image');
    flyImageToCart(sourceImg);

    const existing = state.cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({ id: productId, quantity: 1 });
    }

    persistCart();
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
    persistCart();
    renderNav();
    renderApp();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    persistCart();
    renderNav();
    if (state.activeTab === 'carrito') renderApp();
}

function clearCart() {
    state.cart = [];
    persistCart();
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

// --- CONFIGURACIÓN DE LA TIENDA (empaque y cuidado) DESDE EL ADMIN ---
function materialSlug(material) {
    return normalizeText(material).replace(/\s+/g, '-');
}

function empaquePreviewMarkup(rawUrl) {
    const normalized = rawUrl ? normalizeImageUrl(rawUrl) : '';
    return normalized
        ? `<img src="${normalized}" alt="Vista previa del empaque" class="h-40 w-40 rounded-2xl object-cover border border-zinc-100" referrerpolicy="no-referrer" onerror="handleImageError(this)" data-image-source="${escapeHtml(normalized)}" data-image-label="Empaque" data-image-kind="product" />`
        : `<div class="h-40 w-40 rounded-2xl bg-cream flex items-center justify-center text-gold-dark border border-zinc-100"><i class="fas fa-gift text-4xl"></i></div>`;
}

function updateEmpaquePreview() {
    const input = document.getElementById('cfg-empaque-img');
    const preview = document.getElementById('cfg-empaque-preview');
    if (input && preview) preview.innerHTML = empaquePreviewMarkup(input.value);
}

// Resincroniza los campos del formulario de configuración sin pisar el que se esté editando
function hydrateSettingsForm() {
    const active = document.activeElement;
    const setVal = (id, value) => {
        const el = document.getElementById(id);
        if (el && el !== active) el.value = value;
    };
    setVal('cfg-empaque-img', state.settings.empaque.image || '');
    setVal('cfg-empaque-desc', state.settings.empaque.description || '');
    JEWELRY_MATERIALS.forEach(m => {
        const value = state.settings.cuidado[m] != null ? state.settings.cuidado[m] : (DEFAULT_CARE[m] || '');
        setVal(`cfg-care-${materialSlug(m)}`, value);
    });
    updateEmpaquePreview();
}

async function handleSaveSettings(e) {
    e.preventDefault();
    const submitButton = document.getElementById('cfg-submit');
    const empaqueImgRaw = document.getElementById('cfg-empaque-img')?.value.trim() || '';
    const empaqueImg = empaqueImgRaw ? normalizeImageUrl(empaqueImgRaw) : '';
    const empaqueDesc = document.getElementById('cfg-empaque-desc')?.value.trim() || '';

    const cuidado = {};
    JEWELRY_MATERIALS.forEach(m => {
        const el = document.getElementById(`cfg-care-${materialSlug(m)}`);
        cuidado[m] = el ? el.value.trim() : '';
    });

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';
        submitButton.classList.add('opacity-70', 'cursor-not-allowed');
    }

    try {
        await setDoc(doc(db, "settings", "config"), {
            empaque: { image: empaqueImg, description: empaqueDesc },
            cuidado
        }, { merge: true });
        showToast("Configuración guardada correctamente.", 'success');
    } catch (error) {
        console.error("Error guardando la configuración: ", error);
        showToast("No se pudo guardar la configuración.", 'error');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar configuración';
            submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
        }
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
    startEditProduct, cancelEditProduct,
    toggleWishlist, handleContactForm,
    handleSaveSettings, updateEmpaquePreview
});

// --- INICIALIZACIÓN ---
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
renderNav();
renderApp();

