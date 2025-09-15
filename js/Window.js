/*
 * ===================================================================
 *  WebDesk 10 - Window Class (Window.js) - V3.3 Final (Logic Fix)
 * ===================================================================
 *  - FIX: Refined drag logic for snapped/maximized windows to eliminate
 *    cursor jumping, perfectly matching native OS behavior.
 *  - FEATURE: Integrated Aero Snap preview during window drag.
 */

import { apps } from './config.js';

const MIN_WIN_WIDTH = 250;
const MIN_WIN_HEIGHT = 150;
const ANIMATION_DURATION = 200;
const SNAP_THRESHOLD = 15; // Pixels from edge to trigger snap preview

export default class Window {
    constructor(appId) {
        if (!apps[appId]) throw new Error(`App with ID "${appId}" not found.`);

        // --- Properties ---
        this.appId = appId;
        this.appData = apps[appId];
        this.id = `window-${appId}-${Date.now()}`;
        this.isMaximized = false;
        this.isSnapped = false;
        this.isMinimized = false;
        this.preMaximizeState = {};
        this.preSnapState = {};
        this.currentView = null;

        // --- DOM Elements ---
        this.element = null;
        this.taskbarIcon = null;

        this.init();
    }

    init() {
        this.createWindowElement();
        this.createTaskbarIcon();
        this.addEventListeners();

        this.element.classList.add('opening');
        document.getElementById('desktop-wrapper').appendChild(this.element);
        setTimeout(() => this.element.classList.remove('opening'), ANIMATION_DURATION);

        window.addWindow(this);
        this.focus();
    }

    createWindowElement() {
        this.element = document.createElement('div');
        this.element.id = this.id;
        this.element.className = 'window-component';
        this.element.style.top = `${50 + (window.getWindowCount() % 10) * 30}px`;
        this.element.style.left = `${100 + (window.getWindowCount() % 10) * 30}px`;
        this.element.style.width = this.appData.type === 'iframe' ? '800px' : '600px';
        this.element.style.height = this.appData.type === 'iframe' ? '600px' : '400px';

        const altBg = this.appData.type === 'file-explorer' ? 'true' : 'false';

        this.element.innerHTML = `
            <div class="title-bar">
                <i class="window-icon ${this.appData.icon}"></i>
                <div class="title">${this.appData.name}</div>
                <div class="controls">
                    <button class="minimize" title="最小化"><i class="fas fa-window-minimize"></i></button>
                    <button class="maximize" title="最大化"><i class="far fa-square"></i></button>
                    <button class="close" title="关闭"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div class="window-body" data-alt-bg="${altBg}"></div>
            ${['t', 'b', 'l', 'r', 'tl', 'tr', 'bl', 'br'].map(h => `<div class="resize-handle ${h}" data-direction="${h}"></div>`).join('')}
        `;
        this.renderBodyContent();
    }

    renderBodyContent() {
        const body = this.element.querySelector('.window-body');
        body.innerHTML = '';
        body.className = 'window-body';

        switch (this.appData.type) {
            case 'iframe': this.renderIframe(body); break;
            case 'file-explorer': this.renderFileExplorer(body); break;
            default: this.renderText(body);
        }
    }

    renderText(body) {
        body.classList.add('text-content-body');
        body.innerHTML = this.appData.content;
    }

    renderIframe(body) {
        body.classList.add('iframe-container');
        const loader = document.createElement('div');
        loader.className = 'iframe-loader';
        loader.innerHTML = '<i class="fas fa-spinner"></i>';

        const iframe = document.createElement('iframe');
        iframe.src = this.appData.url;
        iframe.frameBorder = "0";
        iframe.allow = "fullscreen";

        body.appendChild(loader);
        body.appendChild(iframe);

        iframe.addEventListener('load', () => {
            loader.style.display = 'none';
            iframe.style.visibility = 'visible';
        });

        iframe.addEventListener('error', () => {
            loader.innerHTML = '无法加载内容。目标网站可能阻止了嵌入。';
        });
    }

    renderFileExplorer(body) {
        if (!this.currentView) {
            this.currentView = Object.keys(this.appData.content)[0];
        }

        const sidebar = document.createElement('div');
        sidebar.className = 'sidebar';
        for (const key in this.appData.content) {
            const viewData = this.appData.content[key];
            const itemEl = document.createElement('div');
            itemEl.className = 'sidebar-item';
            if (key === this.currentView) itemEl.classList.add('active');
            itemEl.innerHTML = `<i class="${viewData.icon}"></i><span>${viewData.sidebarName}</span>`;
            itemEl.addEventListener('click', () => {
                this.currentView = key;
                this.renderBodyContent();
            });
            sidebar.appendChild(itemEl);
        }

        const mainContent = document.createElement('div');
        mainContent.className = 'main-content';
        const contentGrid = document.createElement('div');
        contentGrid.className = 'file-explorer-content';

        this.appData.content[this.currentView].items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'file-item';
            itemEl.title = item.name;
            itemEl.innerHTML = `<i class="${item.icon}"></i><span>${item.name}</span>`;
            itemEl.addEventListener('dblclick', () => {
                if (item.type === 'app-link') window.openApp(item.appId);
                else if (item.type === 'external-link') window.open(item.url, '_blank');
            });
            contentGrid.appendChild(itemEl);
        });

        mainContent.appendChild(contentGrid);
        body.appendChild(sidebar);
        body.appendChild(mainContent);
    }

    createTaskbarIcon() {
        this.taskbarIcon = document.createElement('div');
        this.taskbarIcon.className = 'taskbar-app-icon';
        this.taskbarIcon.dataset.windowId = this.id;
        this.taskbarIcon.title = this.appData.name;
        this.taskbarIcon.innerHTML = `<i class="${this.appData.icon}"></i>`;
        document.getElementById('running-apps').appendChild(this.taskbarIcon);
    }

    addEventListeners() {
        this.element.addEventListener('mousedown', () => this.focus(), true);
        this.initDrag();
        this.initResize();
        this.element.querySelector('.minimize').addEventListener('click', (e) => { e.stopPropagation(); this.minimize(); });
        this.element.querySelector('.maximize').addEventListener('click', (e) => { e.stopPropagation(); this.toggleMaximize(); });
        this.element.querySelector('.close').addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
        this.element.querySelector('.title-bar').addEventListener('dblclick', (e) => { if (!e.target.closest('.controls')) this.toggleMaximize(); });

        this.taskbarIcon.addEventListener('click', () => {
            if (this.isMinimized) this.restore();
            else if (window.isActiveWindow(this)) this.minimize();
            else this.focus();
        });

        this.taskbarIcon.addEventListener('mouseenter', () => window.showTaskbarPreview(this.taskbarIcon, this));
        this.taskbarIcon.addEventListener('mouseleave', () => window.hideTaskbarPreview());

        this.taskbarIcon.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const menuItems = [
                { label: this.appData.name, icon: this.appData.icon, action: () => this.focus() },
                { type: 'separator' },
                this.isMaximized ? { label: "还原", icon: 'far fa-clone', action: () => this.toggleMaximize() } : { label: "最大化", icon: 'far fa-square', action: () => this.toggleMaximize() },
                this.isMinimized ? { label: "还原", icon: 'far fa-window-restore', action: () => this.restore() } : { label: "最小化", icon: 'fas fa-window-minimize', action: () => this.minimize() },
                { type: 'separator' },
                { label: "关闭", icon: 'fas fa-times', action: () => this.close() }
            ];
            window.createContextMenu(menuItems, e.clientX, e.clientY);
        });
    }

    initDrag() {
        const titleBar = this.element.querySelector('.title-bar');
        titleBar.addEventListener('mousedown', (e) => {
            if (e.target.closest('.controls')) return;

            let initialTop = this.element.offsetTop;
            let initialLeft = this.element.offsetLeft;

            // --- LOGIC FIX: Smooth drag from maximized/snapped state ---
            if (this.isMaximized || this.isSnapped) {
                // 1. Calculate the mouse's offset within the title bar BEFORE resizing the window
                const grabOffsetX = e.clientX - initialLeft;

                // 2. Restore window to its original size (this also resets its top/left)
                if(this.isMaximized) this.unmaximize();
                if(this.isSnapped) this.unsnap();

                // 3. Recalculate the window's top/left so the cursor maintains its relative position
                initialLeft = e.clientX - grabOffsetX;
                initialTop = e.clientY - (e.offsetY); // offsetY is more reliable for title bar height

                this.element.style.left = `${initialLeft}px`;
                this.element.style.top = `${initialTop}px`;
            }
            // --- END OF FIX ---

            this.element.classList.add('is-dragging');
            document.body.classList.add('is-interacting');
            const initialMouseX = e.clientX;
            const initialMouseY = e.clientY;

            let currentSnapZone = null;

            const onMouseMove = (moveEvent) => {
                const newTop = initialTop + moveEvent.clientY - initialMouseY;
                const newLeft = initialLeft + moveEvent.clientX - initialMouseX;
                this.element.style.top = `${newTop < 0 ? 0 : newTop}px`;
                this.element.style.left = `${newLeft}px`;

                let newSnapZone = null;
                if (moveEvent.clientY <= SNAP_THRESHOLD) newSnapZone = 'top';
                else if (moveEvent.clientX <= SNAP_THRESHOLD) newSnapZone = 'left';
                else if (moveEvent.clientX >= window.innerWidth - SNAP_THRESHOLD) newSnapZone = 'right';

                if (newSnapZone !== currentSnapZone) {
                    currentSnapZone = newSnapZone;
                    if (currentSnapZone) {
                        window.showSnapPreview(currentSnapZone);
                    } else {
                        window.hideSnapPreview();
                    }
                }
            };

            const onMouseUp = (upEvent) => {
                window.hideSnapPreview();
                this.element.classList.remove('is-dragging');
                document.body.classList.remove('is-interacting');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                this.handleAeroSnap(upEvent.clientX, upEvent.clientY);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    handleAeroSnap(mouseX, mouseY) {
        const taskbarHeight = document.getElementById('taskbar').offsetHeight;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        if (mouseY <= 1) this.toggleMaximize();
        else if (mouseX <= 1) this.snap('left', taskbarHeight, screenWidth, screenHeight);
        else if (mouseX >= screenWidth - 1) this.snap('right', taskbarHeight, screenWidth, screenHeight);
    }

    initResize() {
        this.element.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault(); e.stopPropagation();

                if (this.isMaximized || this.isSnapped) return;

                this.element.classList.add('is-resizing');
                document.body.classList.add('is-interacting');
                document.body.style.cursor = getComputedStyle(handle).cursor;
                const direction = handle.dataset.direction;
                const initialRect = this.element.getBoundingClientRect();
                const initialMouseX = e.clientX, initialMouseY = e.clientY;

                const onMouseMove = (moveEvent) => {
                    let newWidth = initialRect.width, newHeight = initialRect.height;
                    let newTop = initialRect.top, newLeft = initialRect.left;
                    if (direction.includes('r')) newWidth = initialRect.width + (moveEvent.clientX - initialMouseX);
                    if (direction.includes('l')) { newWidth = initialRect.width - (moveEvent.clientX - initialMouseX); newLeft = initialRect.left + (moveEvent.clientX - initialMouseX); }
                    if (direction.includes('b')) newHeight = initialRect.height + (moveEvent.clientY - initialMouseY);
                    if (direction.includes('t')) { newHeight = initialRect.height - (moveEvent.clientY - initialMouseY); newTop = initialRect.top + (moveEvent.clientY - initialMouseY); }
                    if (newWidth >= MIN_WIN_WIDTH) { this.element.style.width = `${newWidth}px`; if (direction.includes('l')) this.element.style.left = `${newLeft}px`; }
                    if (newHeight >= MIN_WIN_HEIGHT) { this.element.style.height = `${newHeight}px`; if (direction.includes('t')) this.element.style.top = `${newTop}px`; }
                };

                const onMouseUp = () => {
                    this.element.classList.remove('is-resizing');
                    document.body.classList.remove('is-interacting');
                    document.body.style.cursor = '';
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    }

    focus() { window.setActiveWindow(this); }
    minimize() { if (!this.isMinimized) window.minimizeWindow(this); }
    restore() { if (this.isMinimized) window.restoreWindow(this); else this.focus(); }
    close() { window.closeWindow(this); }

    toggleMaximize() {
        if (this.isMaximized) this.unmaximize();
        else {
            if(this.isSnapped) this.unsnap();
            this.preMaximizeState = this.getCurrentState();
            this.element.classList.add('maximized');
            this.element.style.top = '0';
            this.element.style.left = '0';
            this.element.style.width = '100vw';
            this.element.style.height = `calc(100vh - ${document.getElementById('taskbar').offsetHeight}px)`;
            this.element.querySelector('.maximize i').className = 'far fa-clone';
            this.isMaximized = true;
        }
    }

    unmaximize() {
        if (!this.isMaximized) return;
        this.element.classList.remove('maximized');
        this.restoreState(this.preMaximizeState);
        this.element.querySelector('.maximize i').className = 'far fa-square';
        this.isMaximized = false;
    }

    snap(direction, taskbarHeight, screenWidth, screenHeight) {
        if (this.isMaximized) this.unmaximize();
        if (!this.isSnapped) this.preSnapState = this.getCurrentState();
        this.element.classList.add('snapped');

        this.element.style.top = '0';
        this.element.style.height = `${screenHeight - taskbarHeight}px`;
        this.element.style.width = `${screenWidth / 2}px`;
        this.element.style.left = direction === 'left' ? '0' : `${screenWidth / 2}px`;
        this.isSnapped = true;
    }

    unsnap() {
        if (!this.isSnapped) return;
        this.element.classList.remove('snapped');
        this.restoreState(this.preSnapState);
        this.isSnapped = false;
    }

    getCurrentState() {
        return { top: this.element.style.top, left: this.element.style.left, width: this.element.style.width, height: this.element.style.height };
    }

    restoreState(state) {
        this.element.style.top = state.top;
        this.element.style.left = state.left;
        this.element.style.width = state.width;
        this.element.style.height = state.height;
    }
}