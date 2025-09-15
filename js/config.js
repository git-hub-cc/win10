/*
 * ===================================================================
 *  WebDesk 10 - Configuration File (config.js) - V6.0
 * ===================================================================
 *  - FEATURE: Added `SEARCHABLE_ITEMS` data structure to power the new
 *    taskbar search functionality. Includes apps and web search providers.
 *  - REFACTOR: Overhauled File Explorer data structure to be a hierarchical
 *    tree with unique IDs and rich metadata for each item. This supports
 *    nested folders, breadcrumbs, tree view navigation, and detailed views.
 *  - FEATURE: Added metadata (dateModified, typeString, size) to FE items.
 */

// --- 1. UI Text Constants ---
export const UI_TEXT = {
    // App Names
    aboutMe: "关于我.txt",
    myProjects: "我的项目",
    recycleBin: "回收站",
    websiteDirectory: "网站目录",
    onlineChat: "在线聊天",
    personalHomepage: "个人主页",
    settings: "设置",

    // ppmc.club sites
    musicPlayer: "在线音乐",
    mainBlog: "博客",
    toolHub: "在线工具",
    navHub: "网站导航",
    webDevTool: "网站开发工具",

    // File Explorer
    quickAccess: "快速访问",
    thisPC: "此电脑",
    desktop: "桌面",
    documents: "文档",
    downloads: "下载",

    // Settings App
    personalization: "个性化",
    background: "背景",
    selectWallpaper: "选择你的壁纸",
    colors: "颜色",
    selectThemeColor: "选择你的主题色",

    // Context Menu
    open: "打开",
    properties: "属性",
    sortBy: "排序方式",
    sortByName: "名称",
    sortByDate: "修改日期",
    sortByType: "类型",
    sortBySize: "大小",
    refresh: "刷新",
    view: "查看",
    viewIcons: "大图标",
    viewDetails: "详细信息",
};

// --- 2. Theme & Customization Options ---
export const THEME_OPTIONS = {
    wallpapers: [
        { id: 'img1', url: 'img/img.png' },
        { id: 'img2', url: 'img/img2.jpg' },
        { id: 'img3', url: 'img/img3.jpg' },
        { id: 'img4', url: 'img/img4.jpg' },
    ],
    colors: [
        '#0078D4', // Default Blue
        '#4CAF50', // Green
        '#E91E63', // Pink
        '#9C27B0', // Purple
        '#FF5722', // Orange
        '#795548', // Brown
    ]
};

// --- 3. Application Definitions ---
export const apps = {
    "about-me": {
        name: UI_TEXT.aboutMe,
        icon: "fas fa-file-alt",
        type: "text",
        content: "<p>欢迎来到 WebDesk 10, 这是一个使用原生 HTML, CSS, 和 JavaScript 构建的现代化网页桌面环境。它旨在模仿经典的 Windows 10 用户体验，展示高级的 DOM 操作、事件处理和 CSS 样式技巧。您可以随意拖动、缩放、最小化和关闭窗口。探索桌面图标和开始菜单以体验不同功能。</p>",
        size: "medium"
    },
    "my-projects": {
        name: UI_TEXT.myProjects,
        icon: "fas fa-folder",
        type: "text",
        content: "<h1>我的项目</h1><p>这里可以展示您的项目列表，例如使用卡片布局或链接列表。</p><ul><li>项目一：WebDesk 10</li><li>项目二：...</li></ul>",
        size: "medium"
    },
    "recycle-bin": {
        name: UI_TEXT.recycleBin,
        icon: "fas fa-trash-alt",
        type: "text",
        content: "<p style='text-align:center; color: #666; margin-top: 20px;'>回收站是空的。</p>"
    },
    "website-directory": {
        name: UI_TEXT.websiteDirectory,
        icon: "fas fa-sitemap",
        type: "file-explorer",
        size: "large",
        content: {
            id: 'root',
            children: [
                {
                    id: 'quick-access', name: UI_TEXT.quickAccess, type: 'group', icon: 'fas fa-star', isExpanded: true,
                    children: [
                        { id: 'desktop', name: UI_TEXT.desktop, type: 'folder', icon: 'fas fa-desktop', dateModified: '2023-10-26T08:00:00Z', children: [] },
                        { id: 'downloads', name: UI_TEXT.downloads, type: 'folder', icon: 'fas fa-download', dateModified: '2023-10-27T11:20:00Z', children: [] },
                        { id: 'documents', name: UI_TEXT.documents, type: 'folder', icon: 'fas fa-file-alt', dateModified: '2023-10-27T14:35:00Z', children: [] },
                    ]
                },
                {
                    id: 'this-pc', name: UI_TEXT.thisPC, type: 'group', icon: 'fas fa-hdd', isExpanded: true,
                    children: [
                        {
                            id: 'ppmc-sites', name: "PPMC Club 站点", type: 'folder', icon: 'fas fa-folder-open', dateModified: '2023-09-15T10:00:00Z',
                            children: [
                                { id: 'music-player-link', name: UI_TEXT.musicPlayer, type: 'app-link', appId: 'music-player', icon: 'fas fa-music', dateModified: '2023-09-15T10:01:00Z', typeString: '快捷方式', size: 1024 },
                                { id: 'main-blog-link', name: UI_TEXT.mainBlog, type: 'app-link', appId: 'main-blog', icon: 'fas fa-blog', dateModified: '2023-09-15T10:02:00Z', typeString: '快捷方式', size: 1024 },
                                { id: 'tool-hub-link', name: UI_TEXT.toolHub, type: 'app-link', appId: 'tool-hub', icon: 'fas fa-tools', dateModified: '2023-09-15T10:03:00Z', typeString: '快捷方式', size: 1024 },
                                { id: 'nav-hub-link', name: UI_TEXT.navHub, type: 'app-link', appId: 'nav-hub', icon: 'fas fa-compass', dateModified: '2023-09-16T18:30:00Z', typeString: '快捷方式', size: 1024 }
                            ]
                        },
                        {
                            id: 'work-related', name: "工作相关", type: 'folder', icon: 'fas fa-briefcase', dateModified: '2023-10-01T09:00:00Z',
                            children: [
                                { id: 'linkedin-link', name: "LinkedIn", type: 'app-link', appId: 'linkedin-profile', icon: 'fab fa-linkedin', dateModified: '2023-10-01T09:01:00Z', typeString: '快捷方式', size: 1024 }
                            ]
                        },
                        {
                            id: 'project-files', name: "项目文件", type: 'folder', icon: 'fas fa-code-branch', dateModified: '2023-08-20T20:45:00Z',
                            children: [
                                { id: 'github-link', name: "GitHub", type: 'app-link', appId: 'github-profile', icon: 'fab fa-github', dateModified: '2023-08-20T20:46:00Z', typeString: '快捷方式', size: 1024 }
                            ]
                        },
                        { id: 'web-dev-tool-link', name: UI_TEXT.webDevTool, type: 'app-link', appId: 'web-dev-tool', icon: 'fas fa-laptop-code', dateModified: '2023-09-25T16:00:00Z', typeString: '快捷方式', size: 1024 },
                    ]
                }
            ]
        }
    },
    "online-chat": {
        name: UI_TEXT.onlineChat,
        icon: "fas fa-comments",
        type: "iframe",
        url: "https://ppmc.club/webchat-vue/",
        size: "wide"
    },
    "settings": {
        name: UI_TEXT.settings,
        icon: "fas fa-cog",
        type: "settings",
        size: "medium"
    },

    // --- Helper apps (can be on desktop or linked from other apps) ---
    "personal-homepage": { name: UI_TEXT.personalHomepage, icon: "fas fa-globe", type: "iframe", url: "https://www.bing.com" },
    "github-profile": { name: "GitHub", icon: "fab fa-github", type: "iframe", url: "https://github.com/microsoft" },
    "linkedin-profile": { name: "LinkedIn", icon: "fab fa-linkedin", type: "iframe", url: "https://www.linkedin.com/company/microsoft/" },
    "music-player": { name: UI_TEXT.musicPlayer, icon: "fas fa-music", type: "iframe", url: "https://ppmc.club/player", size: "medium" },
    "main-blog": { name: UI_TEXT.mainBlog, icon: "fas fa-blog", type: "iframe", url: "https://ppmc.club", size: "wide" },
    "tool-hub": { name: UI_TEXT.toolHub, icon: "fas fa-tools", type: "iframe", url: "https://ppmc.club/codehub", size: "medium" },
    "nav-hub": { name: UI_TEXT.navHub, icon: "fas fa-compass", type: "iframe", url: "https://ppmc.club/navhub" },
    "web-dev-tool": { name: UI_TEXT.webDevTool, icon: "fas fa-laptop-code", type: "iframe", url: "https://ppmc.club/idea/", size: "medium" }
};

// --- 4. Desktop and Start Menu Configuration ---
export const DESKTOP_ICONS = [
    "about-me",
    "website-directory",
    "online-chat",
    "recycle-bin",
    "settings",
    "music-player",
    "main-blog",
    "tool-hub",
    "web-dev-tool"
];

export const PINNED_APPS = [
    "website-directory", // large
    "online-chat",       // wide
    "main-blog",         // wide
    "settings",          // medium
    "about-me",          // medium
    "my-projects",       // medium
    "tool-hub",          // medium
    "music-player"       // medium
];

// --- 5. NEW: Search Configuration ---
export const SEARCHABLE_ITEMS = [
    // Apps
    { name: UI_TEXT.settings, type: 'app', icon: 'fas fa-cog', keywords: ['settings', 'shezhi', '设置', '个性化', 'personalization', '控制面板'], action: { type: 'openApp', appId: 'settings' } },
    { name: UI_TEXT.websiteDirectory, type: 'app', icon: 'fas fa-sitemap', keywords: ['explorer', 'files', 'wenjian', '文件', '目录'], action: { type: 'openApp', appId: 'website-directory' } },
    { name: UI_TEXT.onlineChat, type: 'app', icon: 'fas fa-comments', keywords: ['chat', 'liaotian', '聊天'], action: { type: 'openApp', appId: 'online-chat' } },
    { name: UI_TEXT.musicPlayer, type: 'app', icon: 'fas fa-music', keywords: ['music', 'yinyue', '音乐', 'player'], action: { type: 'openApp', appId: 'music-player' } },
    { name: UI_TEXT.mainBlog, type: 'app', icon: 'fas fa-blog', keywords: ['blog', 'boke', '博客'], action: { type: 'openApp', appId: 'main-blog' } },

    // Web Search Providers
    { name: 'Bing 搜索', type: 'web-search', icon: 'fab fa-bing', keywords: ['bing', 'biying', '必应', '搜索', 'web', 'search'], action: { type: 'openWeb', url: 'https://www.bing.com/search?q=' } },
    { name: 'Google 搜索', type: 'web-search', icon: 'fab fa-google', keywords: ['google', 'guge', '谷歌', 'search'], action: { type: 'openWeb', url: 'https://www.google.com/search?q=' } }
];