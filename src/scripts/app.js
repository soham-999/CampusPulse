document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application once the DOM is fully loaded
    initApp();
});


//  SECURITY & UTILITIES

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}





async function fetchEvents() {
    try {
        const response = await fetch('/public/data/events.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Could not fetch events:", error);
        return []; // Return empty array on error to prevent crash
    }
}

async function fetchMemoryLane() {
    try {
        const response = await fetch('/public/data/memory-lane.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Could not fetch memory lane:", error);
        return [];
    }
}


// INITIALIZATION CONTROLLER
async function initApp() {
    // 1. Start Global Animations (Scroll Reveal)
    runScrollReveal();

    // 2. Identify which page we are on
    const featuredContainer = document.getElementById('featuredGrid'); // On index.html
    const fullGridContainer = document.getElementById('fullEventsGrid'); // On events.html

    // 3. Run Page-Specific Logic

    // Memory Lane Logic
    if (document.getElementById('fomoSlider')) {
        const memories = await fetchMemoryLane();
        renderMemoryLane(memories);
        runFomoSlider();
    }

    if (document.getElementById('hamburgerBtn')) setupMobileNav();

    // 4. Fetch Data and Process Logic
    if (featuredContainer || fullGridContainer) {
        let events = await fetchEvents();

        events.sort((a, b) => new Date(a.date) - new Date(b.date));

        const now = new Date();
        const upcomingEvents = events.filter(e => new Date(e.date) >= now);
        const pastEvents = events.filter(e => new Date(e.date) < now);

        if (featuredContainer) {
            // Home Page: Show 3 nearest upcoming events
            const homeEvents = upcomingEvents.slice(0, 3);
            renderCards(homeEvents, featuredContainer);
        }

        if (fullGridContainer) {
            // Events Page: Show Upcoming + Past (greyed)

            pastEvents.forEach(e => e.isPast = true);
            const allDisplayEvents = [...upcomingEvents, ...pastEvents];
            renderCards(allDisplayEvents, fullGridContainer);
            setupSearchAndFilter(allDisplayEvents, fullGridContainer);
        }
    }
}


//  RENDER ENGINE

function renderCards(data, container) {
    container.innerHTML = ''; // Clear "Loading..." text

    if (data.length === 0) {
        container.innerHTML = '<p style="color:white; text-align:center; grid-column:1/-1;">No events found matching your search.</p>';
        return;
    }

    data.forEach(event => {
        const formattedDate = formatDate(event.date);
        const pastClass = event.isPast ? 'pastEvent' : '';
        const buttonText = event.isPast ? 'Event Ended' : 'Register Now';
        const buttonAction = event.isPast ? '' : `onclick="window.open('${escapeHtml(event.link)}', '_blank')"`;

        // Dynamic HTML Injection - PROFESSIONAL PRO DESIGN (XSS-Safe)
        const html = `
            <div class="eventCard ${escapeHtml(event.category)} ${pastClass} reveal-active">
                <div class="cardImage" style="background-image: url('${escapeHtml(event.image)}');">
                    <div class="cardOverlay">
                        <span class="eventTypeBadge">${escapeHtml(event.type)}</span>
                    </div>
                </div>
                <div class="cardContent">
                    <div class="cardHeader">
                        <span class="tag ${escapeHtml(event.category)}Tag">${escapeHtml(event.category)}</span>
                        <span class="organizer"><i class="fas fa-users"></i> ${escapeHtml(event.organizer)}</span>
                    </div>
                    
                    <h3 class="cardTitle">${escapeHtml(event.title)}</h3>
                    <div class="cardMeta">
                        <p class="cardDate"><i class="far fa-clock"></i> ${formattedDate}</p>
                    </div>
                    
                    <p class="cardDescription">${escapeHtml(event.description)}</p>
                    
                    <div class="cardFooter">
                         <button class="actionBtn" ${buttonAction}>
                            ${buttonText} <i class="fas fa-external-link-alt"></i>
                        </button>
                    </div>
                </div>
            </div>`;

        container.insertAdjacentHTML('beforeend', html);
    });
}

//  SEARCH & FILTER LOGIC

function setupSearchAndFilter(allEvents, container) {
    // 1. Inputs
    const searchInput = document.getElementById('eventSearch');
    const sortSelect = document.getElementById('sortSelect');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const catBtns = document.querySelectorAll('.catBtn');

    // 2. Buttons
    const openBtn = document.getElementById('openFiltersBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');
    const clearAllBtn = document.getElementById('clearAllFilters');
    const applyBtn = document.getElementById('applyFiltersBtn');

    // 3. Panel (Now Sidebar)
    const sidebar = document.getElementById('filterSidebar');
    const overlay = document.getElementById('filterOverlay');

    function toggleSidebar() {
        if (sidebar && overlay) {
            const isOpen = sidebar.classList.contains('open');
            if (isOpen) {
                sidebar.classList.remove('open');
                overlay.classList.remove('open');
                document.body.style.overflow = ''; // Unlock scroll
            } else {
                sidebar.classList.add('open');
                overlay.classList.add('open');
                document.body.style.overflow = 'hidden'; // Lock scroll on mobile
            }
        }
    }

    function executeFilter() {
        // Values
        const term = searchInput ? searchInput.value.toLowerCase() : '';
        const startVal = startDateInput ? startDateInput.value : null;
        const endVal = endDateInput ? endDateInput.value : null;

        // Active Category
        const activeBtn = document.querySelector('.catBtn.active');
        const activeCat = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';

        // Filter Logic
        let filtered = allEvents.filter(e => {
            const eventDate = new Date(e.date);
            const matchesSearch = e.title.toLowerCase().includes(term) || e.category.includes(term);
            const matchesCat = activeCat === 'all' || e.category === activeCat;

            let matchesDate = true;
            if (startVal) {
                const s = new Date(startVal);
                if (eventDate < s) matchesDate = false;
            }
            if (endVal && matchesDate) {
                const eDate = new Date(endVal);
                eDate.setHours(23, 59, 59);
                if (eventDate > eDate) matchesDate = false;
            }

            return matchesSearch && matchesCat && matchesDate;
        });

        // Sorting Logic
        const now = new Date();
        let upcoming = filtered.filter(e => new Date(e.date) >= now);
        let past = filtered.filter(e => new Date(e.date) < now);

        const sortByDateAsc = (a, b) => new Date(a.date) - new Date(b.date);
        const sortByDateDesc = (a, b) => new Date(b.date) - new Date(a.date);

        if (sortSelect) {
            const sortMode = sortSelect.value;
            if (sortMode === 'popular') {
                upcoming.sort((a, b) => {
                    if (a.isPopular === b.isPopular) return new Date(a.date) - new Date(b.date);
                    return a.isPopular ? -1 : 1;
                });
            } else if (sortMode === 'newest') {
                upcoming.sort(sortByDateDesc);
            } else {
                upcoming.sort(sortByDateAsc);
            }
        }

        past.sort(sortByDateDesc);
        past.forEach(e => e.isPast = true);

        renderCards([...upcoming, ...past], container);
    }

    // --- EVENT LISTENERS ---

    // Live Search
    if (searchInput) searchInput.addEventListener('keyup', executeFilter);

    // Sidebar Toggle (Mobile)
    if (openBtn) openBtn.addEventListener('click', toggleSidebar);
    if (closeBtn) closeBtn.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', toggleSidebar);

    // Live Filtering Listeners (Inputs trigger immediately)
    if (sortSelect) sortSelect.addEventListener('change', executeFilter);
    if (startDateInput) startDateInput.addEventListener('change', executeFilter);
    if (endDateInput) endDateInput.addEventListener('change', executeFilter);

    // Apply Button (Mobile - just closes drawer essentially)
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            executeFilter(); // Ensure latest state
            toggleSidebar(); // Close Mobile Drawer
        });
    }

    // Category Buttons
    if (catBtns) {
        catBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                catBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Live Filter Update!
                executeFilter();


            });
        });
    }

    // Clear All
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (startDateInput) startDateInput.value = '';
            if (endDateInput) endDateInput.value = '';
            if (sortSelect) sortSelect.value = 'upcoming'; // reset sort
            // reset categories
            catBtns.forEach(b => b.classList.remove('active'));
            if (catBtns.length > 0) catBtns[0].classList.add('active'); // Assume first is 'All'

            executeFilter();
        });
    }

    // Initial Run
    executeFilter();
}



//  ANIMATION SYSTEMS

// A. Scroll Reveal
function runScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
            }
        });
    }, { threshold: 0.1 });

    reveals.forEach(el => observer.observe(el));
}



//  SLIDERS & CAROUSELS (Memory Lane)

function renderMemoryLane(memories) {
    const slider = document.getElementById('fomoSlider');
    if (!slider || !memories.length) return;

    slider.innerHTML = ''; // Clear existing

    memories.forEach((item, index) => {
        const slide = document.createElement('div');
        slide.className = `fomoSlide ${index === 0 ? 'activeSlide' : ''}`;
        slide.style.backgroundImage = `url('${escapeHtml(item.image)}')`;

        slide.innerHTML = `
            <div class="slideContent">
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.description)}</p>
            </div>
        `;

        slider.appendChild(slide);
    });
}

// C. FOMO Slider (Home Page)
function runFomoSlider() {
    // Re-select slides after dynamic render
    const slides = document.querySelectorAll('.fomoSlide');
    const nextBtn = document.getElementById('nextSlide');
    const prevBtn = document.getElementById('prevSlide');

    if (!nextBtn || !prevBtn || slides.length === 0) return;

    // Reset state
    let currentSlide = 0;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('activeSlide'));
        slides[index].classList.add('activeSlide');
    }

    // Clone & Replace buttons to remove old listeners (idempotency)
    const newNext = nextBtn.cloneNode(true);
    const newPrev = prevBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNext, nextBtn);
    prevBtn.parentNode.replaceChild(newPrev, prevBtn);

    newNext.addEventListener('click', () => {
        currentSlide++;
        if (currentSlide >= slides.length) currentSlide = 0;
        showSlide(currentSlide);
    });

    newPrev.addEventListener('click', () => {
        currentSlide--;
        if (currentSlide < 0) currentSlide = slides.length - 1;
        showSlide(currentSlide);
    });
}


//  UTILITIES

function formatDate(isoString) {
    const options = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', options).replace(',', '');
}


//  MOBILE NAVIGATION

function setupMobileNav() {
    const hamburger = document.getElementById('hamburgerBtn');
    const sidePanel = document.getElementById('sidePanel');
    const overlay = document.getElementById('sideOverlay');
    const body = document.body;

    function toggleMenu() {
        hamburger.classList.toggle('active');
        sidePanel.classList.toggle('open');
        overlay.classList.toggle('open');
        body.classList.toggle('no-scroll');
    }

    function closeMenu() {
        hamburger.classList.remove('active');
        sidePanel.classList.remove('open');
        overlay.classList.remove('open');
        body.classList.remove('no-scroll');
    }

    // Toggle on Hamburger Click
    hamburger.addEventListener('click', toggleMenu);

    // Close on Overlay Click
    overlay.addEventListener('click', closeMenu);

    // Close on Link Click
    const links = sidePanel.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', closeMenu);
    });
}