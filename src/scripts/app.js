document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// ==========================================
// GLOBAL STATE & UTILITIES
// ==========================================

// Store events globally so we can access them when clicking a card
let globalEventsData = [];

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(isoString) {
    const options = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(isoString).toLocaleDateString('en-US', options).replace(',', '');
}

// ==========================================
// DATA FETCHING
// ==========================================

async function fetchEvents() {
    try {
        const response = await fetch('data/events.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Could not fetch events:", error);
        return [];
    }
}

// ==========================================
// APP INITIALIZATION
// ==========================================

async function initApp() {
    // 1. Setup Global UI Listeners (Mobile Nav & Modal)
    setupMobileNav();
    setupMobileFilters();
    setupModalListeners();

    // 2. Load Memory Lane Slider (Home Page)
    loadMemoryLane();

    // 3. Identify Page Containers
    const featuredContainer = document.getElementById('featuredGrid'); // Home Page
    const fullGridContainer = document.getElementById('fullEventsGrid'); // Events Page

    // 4. Fetch Data if needed
    if (featuredContainer || fullGridContainer) {
        let events = await fetchEvents();

        // Save to global state for the Modal to use later
        window.globalEventsData = events;

        // Initial Sort: Date Ascending (Earliest first)
        events.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Split into Upcoming and Past
        const now = new Date();
        const upcomingEvents = events.filter(e => new Date(e.date) >= now);
        const pastEvents = events.filter(e => new Date(e.date) < now);

        // Logic for Home Page
        if (featuredContainer) {
            // Show top 3 upcoming events
            const homeEvents = upcomingEvents.slice(0, 3);
            renderCards(homeEvents, featuredContainer);
        }

        // Logic for Events Diary Page
        if (fullGridContainer) {
            // Mark past events for styling
            pastEvents.forEach(e => e.isPast = true);

            // Combine them (Upcoming first, then past)
            const allDisplayEvents = [...upcomingEvents, ...pastEvents];

            // Render the grid
            renderCards(allDisplayEvents, fullGridContainer);

            // Initialize Search & Filter logic
            setupSearchAndFilter(allDisplayEvents, fullGridContainer);
        }
    }
}

// ==========================================
// RENDER ENGINE
// ==========================================

function renderCards(data, container) {
    container.innerHTML = ''; // Clear existing content

    if (data.length === 0) {
        container.innerHTML = '<p style="color:white; text-align:center; grid-column:1/-1;">No events found matching your criteria.</p>';
        return;
    }

    data.forEach(event => {
        const formattedDate = formatDate(event.date);
        const pastClass = event.isPast ? 'pastEvent' : '';

        // Dynamic HTML Injection
        // We use onclick="openEventModal(ID)" to trigger the expansion
        const html = `
            <div class="eventCard ${escapeHtml(event.category)} ${pastClass}" 
                 data-id="${event.id}"
                 onclick="openEventModal(${event.id})">
                 
                <div class="cardImage" style="background-image: url('${escapeHtml(event.image)}');">
                    <div class="cardOverlay">
                        <span class="tag" style="background:rgba(0,0,0,0.7); position:absolute; bottom:10px; left:10px; color:white; font-size:12px; padding:4px 8px; border-radius:4px;">
                            ${escapeHtml(event.type)}
                        </span>
                    </div>
                </div>
                
                <div class="cardContent">
                    <div class="cardHeader" style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span class="tag ${escapeHtml(event.category)}Tag">${escapeHtml(event.category)}</span>
                        <span class="organizer" style="font-size:0.8rem; color:#aaa;">${escapeHtml(event.organizer)}</span>
                    </div>
                    
                    <h3 class="cardTitle">${escapeHtml(event.title)}</h3>
                    
                    <div class="cardMeta">
                        <p class="cardDate"><i class="far fa-clock"></i> ${formattedDate}</p>
                    </div>
                    
                    <div class="cardFooter" style="margin-top:15px;">
                         <button class="actionBtn" style="width:100%; font-size:0.9rem;">
                            View Details <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
            </div>`;

        container.insertAdjacentHTML('beforeend', html);
    });
}

// ==========================================
// CLICK-TO-EXPAND MODAL LOGIC
// ==========================================

function openEventModal(eventId) {
    // 1. Find the specific event data using the ID
    const event = window.globalEventsData.find(e => e.id === eventId);
    if (!event) return;

    // 2. Determine button state (Active or Ended)
    // We added specific inline styles here to make the button 'glow' and look premium
    const isPast = new Date(event.date) < new Date();
    const registerBtn = isPast
        ? `<button class="actionBtn disabled" style="width:100%; background:#333; padding:15px; cursor:not-allowed;">Event Ended</button>`
        : `<button class="actionBtn" onclick="window.open('${escapeHtml(event.link)}', '_blank')" style="width:100%; padding:15px; font-size:1.1rem; box-shadow: 0 0 20px rgba(139, 92, 246, 0.4); display:flex; justify-content:center; align-items:center; gap:10px;">
             Register Now <i class="fas fa-arrow-right"></i>
           </button>`;

    // 3. Generate "Past Memories" HTML
    // Updated to use the new 'memory-img' class defined in your CSS
    let memoriesHtml = '';
    if (event.pastGallery && event.pastGallery.length > 0) {
        memoriesHtml = `
            <div style="margin-top: 30px;">
                <h4 style="color: #94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom: 15px; font-size:0.9rem;">⏪ Past Highlights</h4>
                <div class="memories-grid">
                    ${event.pastGallery.map(img => `<img src="${img}" class="memory-img" alt="Past event">`).join('')}
                </div>
            </div>
        `;
    }

    // 4. Inject Content into Modal Body
    // THIS STRUCTURE MATCHES YOUR NEW CSS PERFECTLY
    const modalBody = document.getElementById('modalBody');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="modal-hero" style="background-image: url('${escapeHtml(event.image)}');"></div>
            
            <div class="modal-details">
                <span class="modal-badge ${escapeHtml(event.category)}Tag">${escapeHtml(event.category)}</span>
                
                <h2 class="modal-title">${escapeHtml(event.title)}</h2>
                
                <div class="modal-meta-row">
                    <span><i class="far fa-calendar-alt"></i> &nbsp; ${formatDate(event.date)}</span>
                    <span><i class="fas fa-map-marker-alt"></i> &nbsp; ${escapeHtml(event.venue || 'Campus Venue')}</span>
                </div>
                
                <div class="modal-desc-box">
                    ${escapeHtml(event.description)}
                </div>
                
                ${memoriesHtml}

                <div style="margin-top: 30px;">
                    ${registerBtn}
                </div>
            </div>
        `;
    }

    // 5. Show the Overlay
    const overlay = document.getElementById('eventModalOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Lock background scrolling
    }
}

function setupModalListeners() {
    const overlay = document.getElementById('eventModalOverlay');
    const closeBtn = document.getElementById('closeModalBtn');

    // Close on 'X' button click
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeModal();
        });
    }

    // Close on clicking outside the card (the background overlay)
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
    }

    // Close on Escape key press
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function closeModal() {
    const overlay = document.getElementById('eventModalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore background scrolling
    }
}

// ==========================================
// SEARCH & FILTER LOGIC
// ==========================================

function setupSearchAndFilter(allEvents, container) {
    // 1. Get Elements safely
    const searchInput = document.getElementById('eventSearch');
    const sortSelect = document.getElementById('sortSelect');
    const catBtns = document.querySelectorAll('.catBtn');

    // Date & Clear Elements
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const clearBtn = document.getElementById('clearFiltersBtn') || document.querySelector('.ClearFilters');

    // 2. Filter Function (The Brain)
    function executeFilter() {
        // --- GET VALUES ---
        // Convert search term to lowercase for easy matching
        const term = searchInput ? searchInput.value.toLowerCase().trim() : '';

        // Get active category (Defensive check: if no button active, default to 'all')
        const activeBtn = document.querySelector('.catBtn.active');
        const rawCat = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';
        const activeCat = rawCat.toLowerCase(); // FORCE LOWERCASE to fix "Tech" vs "tech"

        // Get dates
        const startDateVal = startDateInput ? startDateInput.value : '';
        const endDateVal = endDateInput ? endDateInput.value : '';

        // --- FILTERING LOGIC ---
        let filtered = allEvents.filter(e => {
            // Safety: Ensure fields exist before checking
            const title = e.title ? e.title.toLowerCase() : '';
            const category = e.category ? e.category.toLowerCase() : '';

            // A. Search Match
            const matchesSearch = title.includes(term) || category.includes(term);

            // B. Category Match (The Fix)
            // If active category is 'all', show everything. Otherwise, compare lowercase values.
            const matchesCat = (activeCat === 'all') || (category === activeCat);

            // C. Date Range Match
            let matchesDate = true;
            if (startDateVal || endDateVal) {
                const eventDate = new Date(e.date);
                eventDate.setHours(0, 0, 0, 0); // Ignore time, just check the date

                if (startDateVal) {
                    const start = new Date(startDateVal);
                    start.setHours(0, 0, 0, 0);
                    if (eventDate < start) matchesDate = false;
                }

                if (endDateVal) {
                    const end = new Date(endDateVal);
                    end.setHours(23, 59, 59, 999); // Include the entire end day
                    if (eventDate > end) matchesDate = false;
                }
            }

            return matchesSearch && matchesCat && matchesDate;
        });

        // --- SORTING LOGIC ---
        if (sortSelect) {
            const sortValue = sortSelect.value;
            if (sortValue === 'newest') {
                // Assuming higher ID means newer, or use date descending
                filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
            } else if (sortValue === 'popular') {
                // Random shuffle for "Popularity"
                filtered.sort(() => 0.5 - Math.random());
            } else {
                // Default: Upcoming (Date Ascending)
                filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
            }
        }

        // --- RENDER ---
        renderCards(filtered, container);
    }

    // 3. Attach Event Listeners
    if (searchInput) searchInput.addEventListener('input', executeFilter);
    if (sortSelect) sortSelect.addEventListener('change', executeFilter);
    if (startDateInput) startDateInput.addEventListener('change', executeFilter);
    if (endDateInput) endDateInput.addEventListener('change', executeFilter);

    // Category Button Clicks
    if (catBtns) {
        catBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove 'active' from all
                catBtns.forEach(b => b.classList.remove('active'));
                // Add 'active' to clicked
                e.target.classList.add('active');
                // Run Filter
                executeFilter();
            });
        });
    }

    // 4. Clear Filters Button
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            // Clear inputs
            if (searchInput) searchInput.value = '';
            if (startDateInput) startDateInput.value = '';
            if (endDateInput) endDateInput.value = '';
            if (sortSelect) sortSelect.value = 'upcoming';

            // Reset Category to All
            if (catBtns) {
                catBtns.forEach(b => b.classList.remove('active'));
                const allBtn = document.querySelector('.catBtn[data-filter="all"]');
                if (allBtn) allBtn.classList.add('active');
            }

            // Reload Grid
            executeFilter();
        });
    }
}

// ==========================================
// MOBILE NAVIGATION
// ==========================================

function setupMobileNav() {
    const hamburger = document.getElementById('hamburgerBtn');
    const sidePanel = document.getElementById('sidePanel');
    const overlay = document.getElementById('sideOverlay');

    function toggleMenu() {
        if (sidePanel) sidePanel.classList.toggle('open');
        if (overlay) overlay.classList.toggle('open');
    }

    if (hamburger) {
        hamburger.addEventListener('click', toggleMenu);
    }

    if (overlay) {
        overlay.addEventListener('click', toggleMenu);
    }
}

function setupMobileFilters() {
    const openBtn = document.getElementById('openFiltersBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('filterSidebar');
    const overlay = document.getElementById('filterOverlay');
    const applyBtn = document.getElementById('applyFiltersBtn');

    function openFilters() {
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeFilters() {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (openBtn) openBtn.addEventListener('click', openFilters);
    if (closeBtn) closeBtn.addEventListener('click', closeFilters);
    if (overlay) overlay.addEventListener('click', closeFilters);
    if (applyBtn) applyBtn.addEventListener('click', closeFilters);
}
// Add this at the very end of main.js
window.openEventModal = openEventModal;

// ==========================================
// MEMORY LANE - FINAL (With Looping)
// ==========================================

async function loadMemoryLane() {
    try {
        const response = await fetch('./data/memory-lane.json');
        const data = await response.json();

        const container = document.getElementById('fomoSlider');
        const prevBtn = document.getElementById('prevSlide');
        const nextBtn = document.getElementById('nextSlide');

        if (!container) return;

        // 1. Generate HTML
        container.innerHTML = data.map(item => `
            <div class="fomo-slide">
                <img src="${item.image}" alt="${item.title}" loading="lazy">
                <div class="fomo-content">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                </div>
            </div>
        `).join('');

        // 2. Button Logic with LOOPING
        if (nextBtn && prevBtn) {

            nextBtn.addEventListener('click', () => {
                const slideWidth = container.clientWidth;
                const maxScroll = container.scrollWidth - container.clientWidth;

                // Check if we are at the END (within 10px tolerance)
                if (container.scrollLeft >= maxScroll - 10) {
                    // LOOP BACK TO START
                    container.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    // Scroll Normal
                    container.scrollBy({ left: slideWidth, behavior: 'smooth' });
                }
            });

            prevBtn.addEventListener('click', () => {
                const slideWidth = container.clientWidth;

                // Check if we are at the START (within 10px tolerance)
                if (container.scrollLeft <= 10) {
                    // LOOP TO END
                    container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
                } else {
                    // Scroll Normal
                    container.scrollBy({ left: -slideWidth, behavior: 'smooth' });
                }
            });
        }

        console.log("✅ Memory Lane loaded with Looping!");

    } catch (error) {
        console.error("❌ Error loading Memory Lane:", error);
    }
}