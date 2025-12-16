/* =========================================
   CAMPUS PULSE - MASTER JAVASCRIPT
   Location: src/main.js
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application once the DOM is fully loaded
    initApp();
});

/* ------------------------------------------------
   1. MOCK DATA LAYER (Simulating the Backend)
   ------------------------------------------------ */
async function fetchEvents() {
    /* NOTE TO BACKEND DEV:
       --------------------
       Replace this entire function with your API call.
       Example:
       const response = await fetch('https://your-api.com/events');
       return await response.json();
    */

    const mockEvents = [
        {
            id: 1,
            title: "AI Hackathon 2025",
            date: "Dec 20 • 10:00 AM",
            category: "tech",
            image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070",
            interested: 142
        },
        {
            id: 2,
            title: "Neon Music Night",
            date: "Dec 22 • 06:00 PM",
            category: "cultural",
            image: "https://images.unsplash.com/photo-1514525253440-b393452e3383?q=80&w=1974",
            interested: 89
        },
        {
            id: 3,
            title: "Inter-Year Football",
            date: "Dec 24 • 03:00 PM",
            category: "sports",
            image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=2070",
            interested: 210
        },
        {
            id: 4,
            title: "Robotics Workshop",
            date: "Dec 28 • 11:00 AM",
            category: "tech",
            image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=2070",
            interested: 56
        },
        {
            id: 5,
            title: "Debate Championship",
            date: "Jan 05 • 09:00 AM",
            category: "cultural",
            image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070",
            interested: 34
        },
        {
            id: 6,
            title: "Esports Tournament",
            date: "Jan 10 • 08:00 PM",
            category: "tech",
            image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070",
            interested: 400
        }
    ];

    // Simulate network delay (0.3s) for realism
    return new Promise(resolve => setTimeout(() => resolve(mockEvents), 300));
}

/* ------------------------------------------------
   2. INITIALIZATION CONTROLLER
   ------------------------------------------------ */
async function initApp() {
    // 1. Start Global Animations (Scroll Reveal)
    runScrollReveal();

    // 2. Identify which page we are on
    const featuredContainer = document.getElementById('featuredGrid'); // On index.html
    const fullGridContainer = document.getElementById('fullEventsGrid'); // On events.html
    const flashTimer = document.getElementById('flashTimer'); // On index.html

    // 3. Run Page-Specific Logic
    if (flashTimer) runFlashTimer();
    if (document.getElementById('fomoSlider')) runFomoSlider();

    // 4. Fetch Data (Only if we need to display events)
    if (featuredContainer || fullGridContainer) {
        const events = await fetchEvents();

        if (featuredContainer) {
            // Home Page: Show only the first 3 events
            renderCards(events.slice(0, 3), featuredContainer);
        }

        if (fullGridContainer) {
            // Events Page: Show all events & setup filters
            renderCards(events, fullGridContainer);
            setupSearchAndFilter(events, fullGridContainer);
        }
    }
}

/* ------------------------------------------------
   3. RENDER ENGINE (Generates HTML)
   ------------------------------------------------ */
function renderCards(data, container) {
    container.innerHTML = ''; // Clear "Loading..." text

    if (data.length === 0) {
        container.innerHTML = '<p style="color:white; text-align:center; grid-column:1/-1;">No events found matching your search.</p>';
        return;
    }

    data.forEach(event => {
        const icon = getIcon(event.category);
        
        // Dynamic HTML Injection
        const html = `
            <div class="eventCard ${event.category} reveal-active">
                <div class="cardIconWrapper"><i class="fas ${icon}"></i></div>
                <div class="cardImage" style="background-image: url('${event.image}');"></div>
                <div class="cardContent">
                    <div class="tag ${event.category}Tag">${event.category}</div>
                    <h3 class="cardTitle">${event.title}</h3>
                    <p class="cardDate">${event.date}</p>
                    <div class="cardFooter">
                        <button class="calendarBtn" onclick="alert('Added to Calendar!')"><i class="far fa-calendar-alt"></i> Add</button>
                        <button class="interestBtn">
                            <i class="far fa-heart heartIcon"></i> 
                            <span class="count">${event.interested}</span>
                        </button>
                    </div>
                </div>
            </div>`;
        
        container.insertAdjacentHTML('beforeend', html);
    });

    // Attach click listeners to the new hearts
    attachButtonListeners();
}

function getIcon(category) {
    if (category === 'tech') return 'fa-microchip';
    if (category === 'cultural') return 'fa-music';
    if (category === 'sports') return 'fa-futbol';
    return 'fa-star';
}

/* ------------------------------------------------
   4. SEARCH & FILTER LOGIC
   ------------------------------------------------ */
function setupSearchAndFilter(allEvents, container) {
    const searchInput = document.getElementById('eventSearch');
    const filterBtns = document.querySelectorAll('.filterBtn');
    const sortSelect = document.getElementById('sortSelect');

    function executeFilter() {
        // 1. Get Search Term
        const term = searchInput ? searchInput.value.toLowerCase() : '';
        
        // 2. Get Active Category
        const activeBtn = document.querySelector('.filterBtn.active');
        const activeCat = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';

        // 3. Filter the Array
        let filtered = allEvents.filter(e => {
            const matchesSearch = e.title.toLowerCase().includes(term) || e.category.includes(term);
            const matchesCat = activeCat === 'all' || e.category === activeCat;
            return matchesSearch && matchesCat;
        });

        // 4. Sort the Array (Simple Logic)
        if (sortSelect && sortSelect.value === 'popular') {
            filtered.sort((a, b) => b.interested - a.interested);
        }

        // 5. Render
        renderCards(filtered, container);
    }

    // Event Listeners
    if (searchInput) searchInput.addEventListener('keyup', executeFilter);
    
    if (sortSelect) sortSelect.addEventListener('change', executeFilter);

    if (filterBtns) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Toggle Visual Class
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Run Filter
                executeFilter();
            });
        });
    }
}

/* ------------------------------------------------
   5. INTERACTION LOGIC (Hearts)
   ------------------------------------------------ */
function attachButtonListeners() {
    const btns = document.querySelectorAll('.interestBtn');
    
    btns.forEach(btn => {
        // Remove old listener to prevent duplicates if re-rendered
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', function() {
            const countSpan = this.querySelector('.count');
            const icon = this.querySelector('.heartIcon');
            let count = parseInt(countSpan.innerText);

            if (this.classList.contains('liked')) {
                count--;
                this.classList.remove('liked');
                icon.classList.remove('fas');
                icon.classList.add('far');
                this.style.color = '';
            } else {
                count++;
                this.classList.add('liked');
                icon.classList.remove('far');
                icon.classList.add('fas');
                this.style.color = '#ff4d4d';
            }
            countSpan.innerText = count;
        });
    });
}

/* ------------------------------------------------
   6. ANIMATION SYSTEMS
   ------------------------------------------------ */
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

// B. Flash Timer (Countdown)
function runFlashTimer() {
    const timer = document.getElementById('flashTimer');
    if (!timer) return;

    // Set a fake deadline 4 hours from now
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 4);

    setInterval(() => {
        const now = new Date();
        const diff = deadline - now;

        if (diff > 0) {
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / 1000 / 60) % 60);
            const s = Math.floor((diff / 1000) % 60);
            
            // Format with leading zeros
            timer.innerText = `${h < 10 ? '0'+h : h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
        } else {
            timer.innerText = "EXPIRED";
        }
    }, 1000);
}

// C. FOMO Slider (Home Page)
function runFomoSlider() {
    const slides = document.querySelectorAll('.fomoSlide');
    const nextBtn = document.getElementById('nextSlide');
    const prevBtn = document.getElementById('prevSlide');
    let currentSlide = 0;

    if (!nextBtn || !prevBtn || slides.length === 0) return;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('activeSlide'));
        slides[index].classList.add('activeSlide');
    }

    nextBtn.addEventListener('click', () => {
        currentSlide++;
        if (currentSlide >= slides.length) currentSlide = 0;
        showSlide(currentSlide);
    });

    prevBtn.addEventListener('click', () => {
        currentSlide--;
        if (currentSlide < 0) currentSlide = slides.length - 1;
        showSlide(currentSlide);
    });
}