/*
 * ===================================================================
 *  WebDesk 10 - Main Logic (main.js) - V6.0 (Calendar & Search)
 * ===================================================================
 *  - FEATURE: Implemented a functional calendar flyout, allowing month
 *    navigation and highlighting the current day.
 *  - FEATURE: Added a taskbar search box with a suggestions flyout.
 *    Supports searching for apps and launching web searches.
 *  - FEATURE: Implemented `openWebSearch` to create dynamic iframe windows
 *    for search results.
 *  - REFACTOR: Centralized popup management (`closeAllPopups`) to handle
 *    the new search flyout and ensure only one is open at a time.
 *  - TWEAK: Refined popup closing logic for better user experience.
 */

// --- 1. Module Imports ---
import { UI_TEXT, apps, DESKTOP_ICONS, PINNED_APPS, THEME_OPTIONS, SEARCHABLE_ITEMS } from './config.js';
import Window from './Window.js';

// --- 2. Global State & DOM References ---
let activeWindow = null;
let highestZIndex = 100;
const windows = {}; // Stores all active window instances { id: Window }
let contextMenu = null;
const ANIMATION_DURATION = 200;

// State for menus and popups
let isStartMenuOpen = false;
let isCalendarFlyoutOpen = false;
let isSearchFlyoutOpen = false;
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();

// State for desktop interactions
let selectionMarquee = null;
let marqueeStartPos = { x: 0, y: 0 };
let isDraggingMarquee = false;
let taskbarPreview = null;
let taskbarPreviewTimeout = null;
let snapPreviewElement = null;

// DOM References
const loginScreen = document.getElementById('login-screen');
const loginButton = document.getElementById('login-button');
const desktopWrapper = document.getElementById('desktop-wrapper');
const desktopIconsGrid = document.getElementById('desktop-icons-grid');
const taskbar = document.getElementById('taskbar');
const startButton = document.getElementById('start-button');
const startMenu = document.getElementById('start-menu');
const startMenuPinnedContainer = document.getElementById('start-menu-pinned');
const systemTray = document.getElementById('system-tray');
const currentTimeDisplay = document.getElementById('current-time');
const currentDateDisplay = document.getElementById('current-date');
// Calendar Flyout elements
const calendarFlyout = document.getElementById('calendar-flyout');
const flyoutDay = document.getElementById('flyout-day');
const flyoutFullDate = document.getElementById('flyout-full-date');
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthYearDisplay = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
// Search elements
const searchInput = document.getElementById('search-input');
const searchSuggestionsFlyout = document.getElementById('search-suggestions-flyout');


// --- 3. Global Functions ---
// Window Management
window.addWindow = (winInstance) => { windows[winInstance.id] = winInstance; };
window.getWindowCount = () => Object.keys(windows).length;
window.isActiveWindow = (winInstance) => activeWindow === winInstance;
window.getWindows = () => windows;

// UI Components
window.createContextMenu = createContextMenu;
window.showTaskbarPreview = (icon, win) => showTaskbarPreview(icon, win);
window.hideTaskbarPreview = () => hideTaskbarPreview();
window.showSnapPreview = (position) => showSnapPreview(position);
window.hideSnapPreview = () => hideSnapPreview();

// App and Theme Management
window.openApp = openApp;
window.setWallpaper = setWallpaper;
window.setThemeColor = setThemeColor;

window.setActiveWindow = (winInstance) => {
    if (activeWindow === winInstance) return;
    if (activeWindow) {
        activeWindow.element.classList.remove('active');
        if (activeWindow.taskbarIcon) activeWindow.taskbarIcon.classList.remove('active');
    }
    activeWindow = winInstance;
    winInstance.element.style.zIndex = ++highestZIndex;
    winInstance.element.classList.add('active');
    if (winInstance.taskbarIcon) winInstance.taskbarIcon.classList.add('active');
};

window.minimizeWindow = (winInstance) => {
    winInstance.isMinimized = true;
    winInstance.element.classList.add('minimizing');
    setTimeout(() => {
        winInstance.element.style.display = 'none';
        winInstance.element.classList.remove('minimizing');
    }, ANIMATION_DURATION);
    if (winInstance.taskbarIcon) winInstance.taskbarIcon.classList.remove('active');
    if (activeWindow === winInstance) {
        activeWindow = null;
        findAndFocusNextWindow();
    }
};

window.restoreWindow = (winInstance) => {
    winInstance.isMinimized = false;
    winInstance.element.style.display = 'flex';
    setTimeout(() => {
        winInstance.element.classList.add('restoring');
        setTimeout(() => winInstance.element.classList.remove('restoring'), ANIMATION_DURATION);
    }, 10);
    winInstance.focus();
};

window.closeWindow = (winInstance) => {
    winInstance.element.classList.add('closing');
    setTimeout(() => {
        winInstance.element.remove();
        if (winInstance.taskbarIcon) winInstance.taskbarIcon.remove();
        delete windows[winInstance.id];
        if (activeWindow === winInstance) {
            activeWindow = null;
            findAndFocusNextWindow();
        }
    }, ANIMATION_DURATION);
};

function openApp(appId) {
    if (!apps[appId]) {
        console.error(`App with ID "${appId}" not found in config.`);
        return;
    }
    const existingWindow = Object.values(windows).find(win => win.appId === appId);
    if (existingWindow) {
        existingWindow.restore();
    } else {
        new Window(appId);
    }
}

function openWebSearch(query, provider) {
    const searchUrl = provider.action.url + encodeURIComponent(query);
    // Create a temporary, dynamic app definition for the search results window
    const searchAppId = `web-search-${Date.now()}`;
    apps[searchAppId] = {
        name: `${provider.name} - ${query}`,
        icon: provider.icon,
        type: 'iframe',
        url: searchUrl,
    };
    new Window(searchAppId);
    // Clean up the dynamic app definition after the window is closed to prevent memory leaks
    setTimeout(() => delete apps[searchAppId], 2000);
}


// --- 4. UI Logic & Initialization ---

function closeAllPopups() {
    closeStartMenu();
    closeCalendarFlyout();
    closeSearchFlyout();
    removeContextMenu();
}

function openStartMenu() {
    if (isStartMenuOpen) return;
    closeAllPopups();
    isStartMenuOpen = true;
    startMenu.classList.add('visible');
}

function closeStartMenu() {
    if (!isStartMenuOpen) return;
    isStartMenuOpen = false;
    startMenu.classList.remove('visible');
}

function toggleCalendarFlyout() {
    if (isCalendarFlyoutOpen) {
        closeCalendarFlyout();
    } else {
        closeAllPopups();
        isCalendarFlyoutOpen = true;
        updateCalendarFlyoutDate();
        renderCalendar(calendarYear, calendarMonth);
        calendarFlyout.classList.add('visible');
        systemTray.classList.add('active');
    }
}

function closeCalendarFlyout() {
    if (!isCalendarFlyoutOpen) return;
    isCalendarFlyoutOpen = false;
    calendarFlyout.classList.remove('visible');
    systemTray.classList.remove('active');
}

function openSearchFlyout() {
    if (isSearchFlyoutOpen) return;
    closeAllPopups();
    isSearchFlyoutOpen = true;
    const searchRect = searchInput.getBoundingClientRect();
    searchSuggestionsFlyout.style.left = `${searchRect.left}px`;
    searchSuggestionsFlyout.style.width = `${searchRect.width}px`;
    searchSuggestionsFlyout.classList.add('visible');
}

function closeSearchFlyout() {
    if (!isSearchFlyoutOpen) return;
    isSearchFlyoutOpen = false;
    searchSuggestionsFlyout.classList.remove('visible');
}


function findAndFocusNextWindow() {
    let nextWindowToFocus = null;
    let maxZ = 0;
    for (const winId in windows) {
        const win = windows[winId];
        if (!win.isMinimized) {
            const z = parseInt(win.element.style.zIndex || 0);
            if (z > maxZ) {
                maxZ = z;
                nextWindowToFocus = win;
            }
        }
    }
    if (nextWindowToFocus) nextWindowToFocus.focus();
}

function createContextMenu(items, x, y) {
    removeContextMenu();
    contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    items.forEach(item => {
        if (!item) return; // Allow for conditional null items
        if (item.type === 'separator') {
            contextMenu.appendChild(document.createElement('div')).className = 'context-menu-separator';
        } else {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            if (item.disabled) menuItem.classList.add('disabled');
            menuItem.innerHTML = `<i class="${item.icon || 'fas fa-xs fa-empty'}"></i><span>${item.label}</span>`;

            if (!item.disabled) {
                menuItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof item.action === 'function') item.action();
                    removeContextMenu();
                });
            }
            contextMenu.appendChild(menuItem);
        }
    });
    document.body.appendChild(contextMenu);
    const menuRect = contextMenu.getBoundingClientRect();
    const correctedX = (x + menuRect.width > window.innerWidth) ? (window.innerWidth - menuRect.width - 5) : x;
    const correctedY = (y + menuRect.height > window.innerHeight) ? (window.innerHeight - menuRect.height - 5) : y;
    contextMenu.style.left = `${correctedX}px`;
    contextMenu.style.top = `${correctedY}px`;
}

function removeContextMenu() {
    if (contextMenu) {
        contextMenu.remove();
        contextMenu = null;
    }
}

function updateDateTime() {
    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    currentTimeDisplay.textContent = now.toLocaleTimeString('zh-CN', timeOptions);
    currentDateDisplay.textContent = now.toLocaleDateString('zh-CN', dateOptions).replace(/\//g, '-');
}

// --- Calendar Logic ---
function updateCalendarFlyoutDate() {
    const now = new Date();
    const dayOptions = { weekday: 'long' };
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    flyoutDay.textContent = now.toLocaleDateString('zh-CN', dayOptions);
    flyoutFullDate.textContent = now.toLocaleDateString('zh-CN', dateOptions);
}

function renderCalendar(year, month) {
    calendarGrid.innerHTML = '';
    const today = new Date();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)

    currentMonthYearDisplay.textContent = `${year}年 ${month + 1}月`;

    // Calculate days from previous month to display
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day other-month';
        dayEl.textContent = daysInPrevMonth - i;
        calendarGrid.appendChild(dayEl);
    }

    // Display days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayEl.classList.add('today');
        }
        calendarGrid.appendChild(dayEl);
    }

    // Calculate days from next month to display
    const totalCells = 42;
    const filledCells = startDayOfWeek + daysInMonth;
    const remainingCells = totalCells - filledCells;
    for (let i = 1; i <= remainingCells; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day other-month';
        dayEl.textContent = i;
        calendarGrid.appendChild(dayEl);
    }
}


// --- Taskbar Peek & Snap Preview Logic ---
function showTaskbarPreview(taskbarIcon, winInstance) {
    clearTimeout(taskbarPreviewTimeout);
    hideTaskbarPreview();
    taskbarPreviewTimeout = setTimeout(() => {
        taskbarPreview = document.createElement('div');
        taskbarPreview.id = 'taskbar-peek-preview';
        taskbarPreview.innerHTML = `<i class="${winInstance.appData.icon}"></i><span>${winInstance.appData.name}</span>`;
        document.body.appendChild(taskbarPreview);
        const iconRect = taskbarIcon.getBoundingClientRect();
        const previewRect = taskbarPreview.getBoundingClientRect();
        let left = iconRect.left + (iconRect.width / 2) - (previewRect.width / 2);
        if (left < 5) left = 5;
        if (left + previewRect.width > window.innerWidth) left = window.innerWidth - previewRect.width - 5;
        taskbarPreview.style.left = `${left}px`;
    }, 500);
}

function hideTaskbarPreview() {
    clearTimeout(taskbarPreviewTimeout);
    if (taskbarPreview) {
        taskbarPreview.remove();
        taskbarPreview = null;
    }
}

function showSnapPreview(position) {
    if (!snapPreviewElement) {
        snapPreviewElement = document.createElement('div');
        snapPreviewElement.id = 'snap-preview';
        document.body.appendChild(snapPreviewElement);
    }
    const taskbarHeight = taskbar.offsetHeight;
    const styles = { top: '0px', height: `calc(100% - ${taskbarHeight}px)` };
    switch (position) {
        case 'left': styles.left = '0px'; styles.width = '50%'; break;
        case 'right': styles.left = '50%'; styles.width = '50%'; break;
        case 'top': styles.left = '0px'; styles.width = '100%'; break;
    }
    Object.assign(snapPreviewElement.style, styles);
    snapPreviewElement.style.opacity = '1';
}

function hideSnapPreview() {
    if (snapPreviewElement) snapPreviewElement.style.opacity = '0';
}


// --- Desktop Interaction Logic (Marquee, Drag-Drop) ---
function startMarquee(e) {
    if (e.target !== desktopWrapper || e.button !== 0) return;
    document.querySelectorAll('.desktop-icon.selected').forEach(icon => icon.classList.remove('selected'));
    isDraggingMarquee = true;
    marqueeStartPos = { x: e.clientX, y: e.clientY };
    selectionMarquee = document.createElement('div');
    selectionMarquee.id = 'selection-marquee';
    selectionMarquee.style.left = `${e.clientX}px`;
    selectionMarquee.style.top = `${e.clientY}px`;
    document.body.appendChild(selectionMarquee);
    document.addEventListener('mousemove', dragMarquee);
    document.addEventListener('mouseup', endMarquee);
}

function dragMarquee(e) {
    if (!isDraggingMarquee) return;
    e.preventDefault();
    const currentX = e.clientX, currentY = e.clientY;
    const left = Math.min(currentX, marqueeStartPos.x);
    const top = Math.min(currentY, marqueeStartPos.y);
    const width = Math.abs(currentX - marqueeStartPos.x);
    const height = Math.abs(currentY - marqueeStartPos.y);
    selectionMarquee.style.left = `${left}px`;
    selectionMarquee.style.top = `${top}px`;
    selectionMarquee.style.width = `${width}px`;
    selectionMarquee.style.height = `${height}px`;
    checkMarqueeSelection();
}

function endMarquee() {
    isDraggingMarquee = false;
    if (selectionMarquee) {
        selectionMarquee.remove();
        selectionMarquee = null;
    }
    document.removeEventListener('mousemove', dragMarquee);
    document.removeEventListener('mouseup', endMarquee);
}

function checkMarqueeSelection() {
    if (!selectionMarquee) return;
    const marqueeRect = selectionMarquee.getBoundingClientRect();
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        const iconRect = icon.getBoundingClientRect();
        const intersects = !(marqueeRect.right < iconRect.left || marqueeRect.left > iconRect.right || marqueeRect.bottom < iconRect.top || marqueeRect.top > iconRect.bottom);
        icon.classList.toggle('selected', intersects);
    });
}

function initIconDragDrop(iconEl) {
    iconEl.setAttribute('draggable', 'true');
    let draggedItem = null;

    iconEl.addEventListener('dragstart', (e) => {
        draggedItem = e.target;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.dataset.appId);
        setTimeout(() => e.target.classList.add('is-dragging'), 0);
    });

    iconEl.addEventListener('dragend', (e) => {
        e.target.classList.remove('is-dragging');
        saveIconOrder();
    });

    iconEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const targetItem = e.target.closest('.desktop-icon');
        if (targetItem && targetItem !== draggedItem) {
            targetItem.classList.add('drag-over');
        }
    });

    iconEl.addEventListener('dragleave', (e) => {
        e.target.closest('.desktop-icon')?.classList.remove('drag-over');
    });

    iconEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetItem = e.target.closest('.desktop-icon');
        targetItem?.classList.remove('drag-over');
        if (targetItem && targetItem !== draggedItem) {
            const parent = targetItem.parentNode;
            parent.insertBefore(draggedItem, targetItem);
        }
    });
}

function saveIconOrder() {
    const iconOrder = Array.from(desktopIconsGrid.children).map(icon => icon.dataset.appId);
    localStorage.setItem('webdesk-icon-order', JSON.stringify(iconOrder));
}


// --- System Setup & Initialization ---

function setWallpaper(url) {
    desktopWrapper.style.backgroundImage = `url('${url}')`;
    loginScreen.style.backgroundImage = `url('${url}')`;
    localStorage.setItem('webdesk-wallpaper', url);
}

function setThemeColor(color) {
    document.documentElement.style.setProperty('--win10-accent', color);
    localStorage.setItem('webdesk-theme-color', color);
}

function loadSettings() {
    const savedWallpaper = localStorage.getItem('webdesk-wallpaper') || THEME_OPTIONS.wallpapers[0].url;
    const savedThemeColor = localStorage.getItem('webdesk-theme-color') || THEME_OPTIONS.colors[0];
    setWallpaper(savedWallpaper);
    setThemeColor(savedThemeColor);
}

// --- Search Logic ---
function renderSuggestions(matches, query) {
    if (matches.length === 0) {
        closeSearchFlyout();
        return;
    }
    searchSuggestionsFlyout.innerHTML = matches.map(item => {
        const highlightRegex = new RegExp(`(${query})`, 'gi');
        const highlightedName = item.name.replace(highlightRegex, `<span class="match">$1</span>`);

        return `
            <div class="suggestion-item" data-type="${item.action.type}" data-value="${item.action.appId || item.name}">
                <i class="suggestion-icon ${item.icon}"></i>
                <span class="suggestion-text">${highlightedName}</span>
            </div>
        `;
    }).join('');
    openSearchFlyout();
}


function setupEventListeners() {
    loginButton.addEventListener('click', () => {
        loginScreen.style.opacity = '0';
        desktopWrapper.classList.add('visible');
        taskbar.classList.add('visible');
        setTimeout(() => loginScreen.style.display = 'none', 500);
    });

    startButton.addEventListener('click', (e) => {
        e.stopPropagation();
        isStartMenuOpen ? closeStartMenu() : openStartMenu();
    });

    systemTray.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCalendarFlyout();
    });

    // Calendar navigation
    prevMonthBtn.addEventListener('click', () => {
        calendarMonth--;
        if (calendarMonth < 0) {
            calendarMonth = 11;
            calendarYear--;
        }
        renderCalendar(calendarYear, calendarMonth);
    });
    nextMonthBtn.addEventListener('click', () => {
        calendarMonth++;
        if (calendarMonth > 11) {
            calendarMonth = 0;
            calendarYear++;
        }
        renderCalendar(calendarYear, calendarMonth);
    });

    // Search input handling
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            closeSearchFlyout();
            return;
        }
        const matches = SEARCHABLE_ITEMS.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.keywords.some(kw => kw.toLowerCase().includes(query))
        );
        renderSuggestions(matches, query);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            const query = searchInput.value.trim();
            const webSearchProvider = SEARCHABLE_ITEMS.find(item => item.type === 'web-search');
            if (webSearchProvider) {
                openWebSearch(query, webSearchProvider);
                searchInput.value = '';
                closeSearchFlyout();
            }
        } else if (e.key === 'Escape') {
            closeSearchFlyout();
        }
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
            searchInput.dispatchEvent(new Event('input'));
        }
    });

    // Handle clicks on search suggestions
    searchSuggestionsFlyout.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.suggestion-item');
        if (!itemEl) return;

        const { type, value } = itemEl.dataset;
        if (type === 'openApp') {
            openApp(value);
        } else if (type === 'openWeb') {
            const provider = SEARCHABLE_ITEMS.find(p => p.name === value);
            if (provider) {
                openWebSearch(searchInput.value.trim(), provider);
            }
        }
        searchInput.value = '';
        closeSearchFlyout();
    });

    document.addEventListener('mousedown', (e) => {
        if (isStartMenuOpen && !startMenu.contains(e.target) && !startButton.contains(e.target)) {
            closeStartMenu();
        }
        if (isCalendarFlyoutOpen && !calendarFlyout.contains(e.target) && !systemTray.contains(e.target)) {
            closeCalendarFlyout();
        }
        if (isSearchFlyoutOpen && !searchSuggestionsFlyout.contains(e.target) && e.target !== searchInput) {
            closeSearchFlyout();
        }
        if (contextMenu && !contextMenu.contains(e.target)) {
            removeContextMenu();
        }
    });

    desktopWrapper.addEventListener('mousedown', startMarquee);
    desktopWrapper.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        closeAllPopups();
        const targetIcon = e.target.closest('.desktop-icon');
        let menuItems;
        if (targetIcon) {
            const appId = targetIcon.dataset.appId;
            menuItems = [
                { label: UI_TEXT.open, icon: 'fas fa-folder-open', action: () => openApp(appId) },
                { type: 'separator' },
                { label: UI_TEXT.properties, icon: 'fas fa-info-circle', action: () => alert(`“${apps[appId].name}”的属性\n(这是一个演示功能)`) }
            ];
        } else {
            menuItems = [
                { label: `${UI_TEXT.sortBy} (${UI_TEXT.sortByName})`, icon: 'fas fa-sort-alpha-down', action: () => sortDesktopIcons('name') },
                { label: `${UI_TEXT.sortBy} (${UI_TEXT.sortByType})`, icon: 'fas fa-shapes', action: () => sortDesktopIcons('type') },
                { type: 'separator' },
                { label: UI_TEXT.refresh, icon: 'fas fa-sync-alt', action: () => location.reload() },
            ];
        }
        createContextMenu(menuItems, e.clientX, e.clientY);
    });
}

function initializeDesktop() {
    loadSettings();

    // Determine icon order (from storage or default)
    let iconOrder;
    try {
        iconOrder = JSON.parse(localStorage.getItem('webdesk-icon-order'));
        if (!Array.isArray(iconOrder) || iconOrder.length !== DESKTOP_ICONS.length) {
            throw new Error("Invalid icon order in storage.");
        }
    } catch (e) {
        iconOrder = [...DESKTOP_ICONS];
        localStorage.setItem('webdesk-icon-order', JSON.stringify(iconOrder));
    }

    desktopIconsGrid.innerHTML = '';
    iconOrder.forEach(appId => {
        const app = apps[appId];
        if (!app) return;
        const iconEl = document.createElement('div');
        iconEl.className = 'desktop-icon';
        iconEl.dataset.appId = appId;
        iconEl.title = app.name;
        iconEl.innerHTML = `<i class="${app.icon} icon"></i><div class="label">${app.name}</div>`;
        iconEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!e.ctrlKey && !e.shiftKey) {
                document.querySelectorAll('.desktop-icon.selected').forEach(i => i.classList.remove('selected'));
            }
            iconEl.classList.add('selected');
        });
        iconEl.addEventListener('dblclick', () => openApp(appId));
        initIconDragDrop(iconEl);
        desktopIconsGrid.appendChild(iconEl);
    });

    startMenuPinnedContainer.innerHTML = '';
    PINNED_APPS.forEach(appId => {
        const app = apps[appId];
        if (!app) return;
        const tileSize = app.size || 'medium';
        const tileEl = document.createElement('div');
        tileEl.className = `app-tile tile-size-${tileSize}`;
        tileEl.title = app.name;
        tileEl.innerHTML = `<i class="${app.icon} icon"></i><span class="label">${app.name}</span>`;
        tileEl.addEventListener('click', () => {
            openApp(appId);
            closeStartMenu();
        });
        startMenuPinnedContainer.appendChild(tileEl);
    });

    updateDateTime();
    setInterval(updateDateTime, 1000 * 60);
    setupEventListeners();
}

function sortDesktopIcons(by = 'name') {
    const icons = Array.from(desktopIconsGrid.children);
    icons.sort((a, b) => {
        const appA = apps[a.dataset.appId];
        const appB = apps[b.dataset.appId];
        if (by === 'type') {
            return appA.type.localeCompare(appB.type) || appA.name.localeCompare(appB.name);
        }
        return appA.name.localeCompare(appB.name);
    });
    icons.forEach(icon => desktopIconsGrid.appendChild(icon));
    saveIconOrder(); // Save the new sorted order
}

// --- 5. Application Start ---
initializeDesktop();