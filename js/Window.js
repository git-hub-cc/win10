/*
 * ===================================================================
 *  WebDesk 10 - Window Class (Window.js) - V5.1 (FE Tree Logic Hotfix)
 * ===================================================================
 *  - OPTIMIZATION: Refactored File Explorer tree view logic to use event delegation.
 *    This significantly improves performance and stability.
 *  - FIX: Resolved an intermittent bug where expanding/collapsing tree nodes would
 *    fail. The new logic separates expand/collapse actions from navigation actions.
 *  - REFACTOR: Created a dedicated `_fe_handleNavPaneClick` handler for cleaner code.
 */

import { apps, UI_TEXT, THEME_OPTIONS } from './config.js';

const MIN_WIN_WIDTH = 250;
const MIN_WIN_HEIGHT = 150;
const ANIMATION_DURATION = 200;
const SNAP_THRESHOLD = 15; // Pixels from edge to trigger snap preview

export default class Window {
    constructor(appId) {
        if (!apps[appId]) throw new Error(`App with ID "${appId}" not found.`);

        // --- Core Properties ---
        this.appId = appId;
        this.appData = apps[appId];
        this.id = `window-${appId}-${Date.now()}`;
        this.isMaximized = false;
        this.isSnapped = false;
        this.isMinimized = false;
        this.preMaximizeState = {};
        this.preSnapState = {};

        // --- File Explorer State (if applicable) ---
        if (this.appData.type === 'file-explorer') {
            this.feState = {
                fs: this.appData.content,
                history: ['this-pc'],
                historyIndex: 0,
                currentPath: 'this-pc',
                selection: new Set(),
                viewMode: 'details', // 'details' or 'icons'
                sortBy: { key: 'name', order: 'asc' },
                expandedNodes: new Set(['quick-access', 'this-pc']),
                marquee: null,
                isDraggingMarquee: false,
                marqueeStartPos: { x: 0, y: 0 }
            };
        }

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

        let initialWidth = '600px', initialHeight = '400px';
        if (this.appData.type === 'iframe') {
            initialWidth = '800px';
            initialHeight = '600px';
        } else if (this.appData.type === 'settings' || this.appData.type === 'file-explorer') {
            initialWidth = '820px';
            initialHeight = '600px';
        }
        this.element.style.width = initialWidth;
        this.element.style.height = initialHeight;


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
            <div class="window-body"></div>
            ${['t', 'b', 'l', 'r', 'tl', 'tr', 'bl', 'br'].map(h => `<div class="resize-handle ${h}" data-direction="${h}"></div>`).join('')}
        `;
        this.renderBodyContent();
    }

    renderBodyContent() {
        const body = this.element.querySelector('.window-body');
        body.innerHTML = ''; // Clear previous content

        switch (this.appData.type) {
            case 'iframe': this.renderIframe(body); break;
            case 'file-explorer': this.renderFileExplorer(body); break;
            case 'settings': this.renderSettings(body); break;
            default: this.renderText(body);
        }
    }

    renderText(body) {
        body.className = 'window-body text-content-body';
        body.innerHTML = this.appData.content;
    }

    renderIframe(body) {
        body.className = 'window-body iframe-container';
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

    renderSettings(body) {
        body.className = 'window-body settings-body';

        const currentWallpaper = localStorage.getItem('webdesk-wallpaper') || THEME_OPTIONS.wallpapers[0].url;
        const currentThemeColor = localStorage.getItem('webdesk-theme-color') || THEME_OPTIONS.colors[0];

        body.innerHTML = `
            <div class="settings-section">
                <h3>${UI_TEXT.background}</h3>
                <p>${UI_TEXT.selectWallpaper}</p>
                <div class="wallpaper-picker">
                    ${THEME_OPTIONS.wallpapers.map(wp => `
                        <div class="wallpaper-thumb ${wp.url === currentWallpaper ? 'active' : ''}" 
                             data-wallpaper-url="${wp.url}" 
                             style="background-image: url('${wp.url}')">
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="settings-section">
                <h3>${UI_TEXT.colors}</h3>
                <p>${UI_TEXT.selectThemeColor}</p>
                <div class="theme-picker">
                    ${THEME_OPTIONS.colors.map(color => `
                        <div class="theme-color-box ${color === currentThemeColor ? 'active' : ''}" 
                             data-color="${color}" 
                             style="background-color: ${color}">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        body.querySelectorAll('.wallpaper-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                const url = thumb.dataset.wallpaperUrl;
                window.setWallpaper(url);
                body.querySelector('.wallpaper-thumb.active')?.classList.remove('active');
                thumb.classList.add('active');
            });
        });

        body.querySelectorAll('.theme-color-box').forEach(box => {
            box.addEventListener('click', () => {
                const color = box.dataset.color;
                window.setThemeColor(color);
                body.querySelector('.theme-color-box.active')?.classList.remove('active');
                box.classList.add('active');
            });
        });
    }

    // ===================================================================
    //  FILE EXPLORER - CORE LOGIC
    // ===================================================================

    _fe_findNode(nodeId, root = this.feState.fs) {
        if (root.id === nodeId) return root;
        if (root.children) {
            for (const child of root.children) {
                const found = this._fe_findNode(nodeId, child);
                if (found) return found;
            }
        }
        return null;
    }

    _fe_getNodePath(nodeId) {
        const path = [];
        let currentNode = this._fe_findNode(nodeId);
        while (currentNode && currentNode.id !== 'root') {
            path.unshift(currentNode);
            // This requires a parent reference, which we don't have. So, we traverse from root.
            const findParent = (root, targetId) => {
                if (!root.children) return null;
                for (const child of root.children) {
                    if (child.id === targetId) return root;
                    const parent = findParent(child, targetId);
                    if (parent) return parent;
                }
                return null;
            }
            currentNode = findParent(this.feState.fs, currentNode.id);
        }
        return path;
    }

    _fe_navigate(pathId, addToHistory = true) {
        if (this.feState.currentPath === pathId) return;
        this.feState.currentPath = pathId;
        this.feState.selection.clear();

        if (addToHistory) {
            if (this.feState.historyIndex < this.feState.history.length - 1) {
                this.feState.history = this.feState.history.slice(0, this.feState.historyIndex + 1);
            }
            this.feState.history.push(pathId);
            this.feState.historyIndex++;
        }
        this.renderFileExplorer();
    }

    _fe_goBack() {
        if (this.feState.historyIndex > 0) {
            this.feState.historyIndex--;
            this._fe_navigate(this.feState.history[this.feState.historyIndex], false);
        }
    }

    _fe_goForward() {
        if (this.feState.historyIndex < this.feState.history.length - 1) {
            this.feState.historyIndex++;
            this._fe_navigate(this.feState.history[this.feState.historyIndex], false);
        }
    }

    _fe_goUp() {
        const currentNode = this._fe_findNode(this.feState.currentPath);
        const findParent = (root, targetId) => {
            if (!root.children) return null;
            for (const child of root.children) {
                if (child.id === targetId) return root;
                const parent = findParent(child, targetId);
                if (parent) return parent;
            }
            return null;
        }
        const parent = findParent(this.feState.fs, currentNode.id);
        if (parent && parent.id !== 'root') {
            this._fe_navigate(parent.id);
        }
    }

    renderFileExplorer(body = this.element.querySelector('.window-body')) {
        const currentNode = this._fe_findNode(this.feState.currentPath);
        if (!currentNode) {
            console.error("Current FE path not found:", this.feState.currentPath);
            return;
        }

        body.innerHTML = `
            <div class="fe-wrapper">
                <div class="fe-toolbar">
                    <div class="fe-nav-buttons">
                        <button class="fe-back-btn" title="后退" ${this.feState.historyIndex > 0 ? '' : 'disabled'}><i class="fas fa-arrow-left"></i></button>
                        <button class="fe-forward-btn" title="前进" ${this.feState.historyIndex < this.feState.history.length - 1 ? '' : 'disabled'}><i class="fas fa-arrow-right"></i></button>
                        <button class="fe-up-btn" title="向上"><i class="fas fa-arrow-up"></i></button>
                    </div>
                    <div class="fe-address-bar-container">
                        <div class="fe-address-bar">
                            <div class="fe-breadcrumbs"></div>
                            <input type="text" class="fe-address-bar-input" />
                        </div>
                    </div>
                    <div class="fe-view-buttons">
                         <button class="fe-view-btn-details" title="详细信息"><i class="fas fa-list"></i></button>
                         <button class="fe-view-btn-icons" title="大图标"><i class="fas fa-th-large"></i></button>
                    </div>
                </div>
                <div class="fe-body">
                    <nav class="fe-nav-pane"></nav>
                    <main class="fe-main-area">
                        <div class="fe-content-area"></div>
                        <div class="fe-status-bar">
                            <span class="fe-item-count"></span>
                            <span class="fe-selection-count"></span>
                        </div>
                    </main>
                </div>
            </div>
        `;

        this._fe_renderNavPane(body.querySelector('.fe-nav-pane'));
        this._fe_renderAddressBar(body.querySelector('.fe-address-bar'));
        this._fe_renderContentArea(body.querySelector('.fe-content-area'), currentNode.children || []);
        this._fe_renderStatusBar(body.querySelector('.fe-status-bar'), currentNode.children || []);
        this._fe_addFEEventListeners(body);
    }

    _fe_renderNavPane(container) {
        const renderNode = (node) => {
            const isExpandable = node.children && node.children.length > 0;
            const isExpanded = this.feState.expandedNodes.has(node.id);

            const li = document.createElement('li');
            li.innerHTML = `
                <div class="tree-item ${this.feState.currentPath === node.id ? 'active' : ''}" data-id="${node.id}">
                    <span class="tree-toggle">${isExpandable ? '<i class="fas fa-chevron-right"></i>' : ''}</span>
                    <i class="tree-icon ${node.icon}"></i>
                    <span>${node.name}</span>
                </div>
            `;
            if (isExpanded) {
                li.querySelector('.tree-toggle').classList.add('expanded');
            }

            if (isExpandable && isExpanded) {
                const ul = document.createElement('ul');
                node.children.forEach(child => ul.appendChild(renderNode(child)));
                li.appendChild(ul);
            }
            return li;
        };

        const rootUl = document.createElement('ul');
        this.feState.fs.children.forEach(node => rootUl.appendChild(renderNode(node)));
        container.innerHTML = '';
        container.appendChild(rootUl);
    }

    _fe_renderAddressBar(container) {
        const breadcrumbsContainer = container.querySelector('.fe-breadcrumbs');
        const pathNodes = this._fe_getNodePath(this.feState.currentPath);
        breadcrumbsContainer.innerHTML = '';

        pathNodes.forEach((node, index) => {
            const item = document.createElement('span');
            item.className = 'fe-breadcrumb-item';
            item.textContent = node.name;
            item.addEventListener('click', () => this._fe_navigate(node.id));
            breadcrumbsContainer.appendChild(item);

            if (index < pathNodes.length - 1) {
                const separator = document.createElement('span');
                separator.className = 'fe-breadcrumb-separator';
                separator.innerHTML = '<i class="fas fa-chevron-right fa-xs"></i>';
                breadcrumbsContainer.appendChild(separator);
            }
        });

        const input = container.querySelector('.fe-address-bar-input');
        input.value = pathNodes.map(n => n.name).join(' > ');
    }

    _fe_renderContentArea(container, items) {
        container.className = `fe-content-area view-${this.feState.viewMode}`;
        container.innerHTML = ''; // Clear previous

        const sortedItems = [...items].sort((a, b) => {
            const key = this.feState.sortBy.key;
            const order = this.feState.sortBy.order === 'asc' ? 1 : -1;
            let valA = a[key], valB = b[key];
            if (key === 'size') {
                valA = a.size ?? -1; valB = b.size ?? -1;
            }
            if (key === 'dateModified') {
                valA = new Date(a.dateModified); valB = new Date(b.dateModified);
            }
            if (valA < valB) return -1 * order;
            if (valA > valB) return 1 * order;
            return a.name.localeCompare(b.name);
        });

        if (this.feState.viewMode === 'details') {
            this._fe_renderDetailsView(container, sortedItems);
        } else {
            this._fe_renderIconsView(container, sortedItems);
        }

        container.querySelectorAll('.fe-item').forEach(itemEl => {
            const itemId = itemEl.dataset.id;
            itemEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (e.ctrlKey) {
                    this.feState.selection.has(itemId) ? this.feState.selection.delete(itemId) : this.feState.selection.add(itemId);
                } else if (e.shiftKey) {
                    this.feState.selection.clear();
                    this.feState.selection.add(itemId);
                } else {
                    this.feState.selection.clear();
                    this.feState.selection.add(itemId);
                }
                this._fe_updateSelection();
            });
            itemEl.addEventListener('dblclick', (e) => {
                const itemData = this._fe_findNode(itemId);
                if (itemData.type === 'folder' || itemData.type === 'group') {
                    this._fe_navigate(itemId);
                } else if (itemData.type === 'app-link') {
                    window.openApp(itemData.appId);
                }
            });
        });
    }

    _fe_renderDetailsView(container, items) {
        const { key: sortKey, order: sortOrder } = this.feState.sortBy;
        const sortIndicator = (key) => sortKey === key ? (sortOrder === 'asc' ? '▲' : '▼') : '';

        const table = document.createElement('table');
        table.className = 'fe-details-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th data-sort-key="name">${UI_TEXT.sortByName} <span class="sort-indicator">${sortIndicator('name')}</span></th>
                    <th data-sort-key="dateModified">${UI_TEXT.sortByDate} <span class="sort-indicator">${sortIndicator('dateModified')}</span></th>
                    <th data-sort-key="typeString">${UI_TEXT.sortByType} <span class="sort-indicator">${sortIndicator('typeString')}</span></th>
                    <th data-sort-key="size">${UI_TEXT.sortBySize} <span class="sort-indicator">${sortIndicator('size')}</span></th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'fe-item';
            tr.dataset.id = item.id;
            const fSize = item.size ? `${Math.ceil(item.size / 1024)} KB` : '';
            tr.innerHTML = `
                <td><div class="item-name"><i class="item-icon ${item.icon}"></i> ${item.name}</div></td>
                <td>${new Date(item.dateModified).toLocaleString()}</td>
                <td>${item.typeString || (item.type === 'folder' ? '文件夹' : '文件')}</td>
                <td>${fSize}</td>
            `;
            tbody.appendChild(tr);
        });
        container.appendChild(table);

        table.querySelectorAll('th').forEach(th => {
            th.addEventListener('click', () => this._fe_handleSort(th.dataset.sortKey));
        });
    }

    _fe_renderIconsView(container, items) {
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'fe-item';
            itemEl.dataset.id = item.id;
            itemEl.title = item.name;
            itemEl.innerHTML = `<i class="item-icon ${item.icon}"></i><span class="item-name">${item.name}</span>`;
            container.appendChild(itemEl);
        });
    }

    _fe_renderStatusBar(container, items) {
        container.querySelector('.fe-item-count').textContent = `${items.length} 个项目`;
        this._fe_updateSelectionCount();
    }

    _fe_updateSelectionCount() {
        const container = this.element.querySelector('.fe-status-bar');
        if(!container) return;
        const count = this.feState.selection.size;
        container.querySelector('.fe-selection-count').textContent = count > 0 ? `已选择 ${count} 个项目` : '';
    }

    _fe_updateSelection() {
        this.element.querySelectorAll('.fe-item.selected').forEach(el => el.classList.remove('selected'));
        this.feState.selection.forEach(id => {
            const el = this.element.querySelector(`.fe-item[data-id="${id}"]`);
            if (el) el.classList.add('selected');
        });
        this._fe_updateSelectionCount();
    }

    _fe_handleSort(key) {
        if (this.feState.sortBy.key === key) {
            this.feState.sortBy.order = this.feState.sortBy.order === 'asc' ? 'desc' : 'asc';
        } else {
            this.feState.sortBy.key = key;
            this.feState.sortBy.order = 'asc';
        }
        const contentArea = this.element.querySelector('.fe-content-area');
        const items = this._fe_findNode(this.feState.currentPath).children || [];
        this._fe_renderContentArea(contentArea, items);
    }

    // NEW: Centralized handler for navigation pane clicks using event delegation
    _fe_handleNavPaneClick(e) {
        const treeItem = e.target.closest('.tree-item');
        if (!treeItem) return;

        const nodeId = treeItem.dataset.id;
        const nodeData = this._fe_findNode(nodeId);
        const isExpandable = nodeData.children && nodeData.children.length > 0;

        // If the toggle arrow is clicked, only expand/collapse
        if (e.target.closest('.tree-toggle') && isExpandable) {
            e.stopPropagation(); // Prevent navigation
            if (this.feState.expandedNodes.has(nodeId)) {
                this.feState.expandedNodes.delete(nodeId);
            } else {
                this.feState.expandedNodes.add(nodeId);
            }
            // ONLY re-render the navigation pane, not the whole window
            this._fe_renderNavPane(this.element.querySelector('.fe-nav-pane'));
        } else {
            // Otherwise, navigate to the folder
            this._fe_navigate(nodeId);
        }
    }

    _fe_addFEEventListeners(body) {
        // Toolbar buttons
        body.querySelector('.fe-back-btn').addEventListener('click', () => this._fe_goBack());
        body.querySelector('.fe-forward-btn').addEventListener('click', () => this._fe_goForward());
        body.querySelector('.fe-up-btn').addEventListener('click', () => this._fe_goUp());

        // View mode buttons
        const detailsBtn = body.querySelector('.fe-view-btn-details');
        const iconsBtn = body.querySelector('.fe-view-btn-icons');
        detailsBtn.classList.toggle('active', this.feState.viewMode === 'details');
        iconsBtn.classList.toggle('active', this.feState.viewMode === 'icons');
        detailsBtn.addEventListener('click', () => { this.feState.viewMode = 'details'; this.renderFileExplorer(); });
        iconsBtn.addEventListener('click', () => { this.feState.viewMode = 'icons'; this.renderFileExplorer(); });

        // Address bar
        const addressBar = body.querySelector('.fe-address-bar');
        const addressInput = body.querySelector('.fe-address-bar-input');
        addressBar.addEventListener('click', (e) => {
            if (e.target === addressBar) { // Click on empty space
                addressBar.classList.add('edit-mode');
                addressInput.focus();
                addressInput.select();
            }
        });
        addressInput.addEventListener('blur', () => addressBar.classList.remove('edit-mode'));
        addressInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') addressBar.classList.remove('edit-mode'); });

        // Content area events (marquee, context menu)
        const contentArea = body.querySelector('.fe-content-area');
        contentArea.addEventListener('mousedown', (e) => this._fe_startMarquee(e, contentArea));
        contentArea.addEventListener('contextmenu', (e) => this._fe_showContextMenu(e, contentArea));

        // REFACTORED: Use event delegation for the navigation pane
        const navPane = body.querySelector('.fe-nav-pane');
        navPane.addEventListener('click', (e) => this._fe_handleNavPaneClick(e));
    }

    _fe_startMarquee(e, container) {
        if (e.target !== container && e.target !== container.querySelector('.fe-details-table')) return;
        if (e.button !== 0) return;

        this.feState.selection.clear();
        this._fe_updateSelection();

        this.feState.isDraggingMarquee = true;
        const rect = container.getBoundingClientRect();
        this.feState.marqueeStartPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        this.feState.marquee = document.createElement('div');
        this.feState.marquee.className = 'fe-marquee';
        this.feState.marquee.style.left = `${e.clientX}px`;
        this.feState.marquee.style.top = `${e.clientY}px`;
        this.element.appendChild(this.feState.marquee);

        const onMouseMove = (moveEvent) => this._fe_dragMarquee(moveEvent, container);
        const onMouseUp = () => this._fe_endMarquee(onMouseMove, onMouseUp);

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp, { once: true });
    }

    _fe_dragMarquee(e, container) {
        if (!this.feState.isDraggingMarquee) return;
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const marqueeRectEl = this.feState.marquee.style;
        marqueeRectEl.left = `${Math.min(currentX, this.feState.marqueeStartPos.x) + rect.left}px`;
        marqueeRectEl.top = `${Math.min(currentY, this.feState.marqueeStartPos.y) + rect.top}px`;
        marqueeRectEl.width = `${Math.abs(currentX - this.feState.marqueeStartPos.x)}px`;
        marqueeRectEl.height = `${Math.abs(currentY - this.feState.marqueeStartPos.y)}px`;

        this._fe_checkMarqueeSelection(container);
    }

    _fe_endMarquee(moveHandler, upHandler) {
        this.feState.isDraggingMarquee = false;
        if (this.feState.marquee) {
            this.feState.marquee.remove();
            this.feState.marquee = null;
        }
        document.removeEventListener('mousemove', moveHandler);
    }

    _fe_checkMarqueeSelection(container) {
        if (!this.feState.marquee) return;
        const marqueeRect = this.feState.marquee.getBoundingClientRect();
        this.feState.selection.clear();
        container.querySelectorAll('.fe-item').forEach(itemEl => {
            const itemRect = itemEl.getBoundingClientRect();
            const intersects = !(marqueeRect.right < itemRect.left || marqueeRect.left > itemRect.right || marqueeRect.bottom < itemRect.top || marqueeRect.top > itemRect.bottom);
            if (intersects) {
                this.feState.selection.add(itemEl.dataset.id);
            }
        });
        this._fe_updateSelection();
    }

    _fe_showContextMenu(e, container) {
        e.preventDefault();
        e.stopPropagation();

        const targetItemEl = e.target.closest('.fe-item');
        const hasSelection = this.feState.selection.size > 0;
        let menuItems;

        if (targetItemEl) {
            const itemId = targetItemEl.dataset.id;
            if (!this.feState.selection.has(itemId)) { // Right click on unselected item
                this.feState.selection.clear();
                this.feState.selection.add(itemId);
                this._fe_updateSelection();
            }

            const itemData = this._fe_findNode(itemId);
            menuItems = [
                { label: UI_TEXT.open, icon: 'fas fa-folder-open', action: () => {
                        if (itemData.type === 'folder' || itemData.type === 'group') this._fe_navigate(itemId);
                        else if (itemData.type === 'app-link') window.openApp(itemData.appId);
                    }},
                { type: 'separator' },
                { label: "剪切", icon: 'fas fa-cut', disabled: true },
                { label: "复制", icon: 'fas fa-copy', disabled: true },
                { type: 'separator' },
                { label: "删除", icon: 'fas fa-trash-alt', disabled: true },
                { label: "重命名", icon: 'fas fa-i-cursor', disabled: true },
                { type: 'separator' },
                { label: UI_TEXT.properties, icon: 'fas fa-info-circle', action: () => alert(`“${itemData.name}”的属性\n(这是一个演示功能)`) }
            ];
        } else { // Right click on empty space
            menuItems = [
                { label: UI_TEXT.view, icon: 'fas fa-eye', disabled: true }, // Placeholder for submenu
                { label: UI_TEXT.sortBy, icon: 'fas fa-sort', disabled: true }, // Placeholder for submenu
                { type: 'separator' },
                { label: UI_TEXT.refresh, icon: 'fas fa-sync-alt', action: () => this.renderFileExplorer() },
                { type: 'separator' },
                { label: "粘贴", icon: 'fas fa-paste', disabled: true },
                { type: 'separator' },
                { label: "新建", icon: 'fas fa-plus', disabled: true },
            ];
        }
        window.createContextMenu(menuItems, e.clientX, e.clientY);
    }

    // ===================================================================
    //  GENERIC WINDOW METHODS
    // ===================================================================

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

            if (this.isMaximized || this.isSnapped) {
                const grabOffsetX = e.clientX - initialLeft;
                if(this.isMaximized) this.unmaximize();
                if(this.isSnapped) this.unsnap();
                initialLeft = e.clientX - grabOffsetX;
                initialTop = e.clientY - (e.offsetY);
                this.element.style.left = `${initialLeft}px`;
                this.element.style.top = `${initialTop}px`;
            }

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
                    currentSnapZone ? window.showSnapPreview(currentSnapZone) : window.hideSnapPreview();
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