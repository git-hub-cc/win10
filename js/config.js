/*
 * ===================================================================
 *  WebDesk 10 - Configuration File (config.js) - V4.0
 * ===================================================================
 *  - FEATURE: Added 'settings' app definition.
 *  - FEATURE: Added theme options (wallpapers, colors) for settings app.
 *  - FEATURE: Enhanced File Explorer content structure to support nested folders.
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
    favorites: "常用网站",
    workRelated: "工作相关",
    projectFiles: "项目文件",
    myCollection: "我的收藏",

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
    sortByType: "类型",
    refresh: "刷新",
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
            "favorites": {
                sidebarName: UI_TEXT.favorites,
                icon: "fas fa-star",
                items: [
                    { name: UI_TEXT.personalHomepage, icon: "fas fa-globe", type: "app-link", appId: "personal-homepage" },
                    { name: "GitHub", icon: "fab fa-github", type: "app-link", appId: "github-profile" }
                ]
            },
            "my-collection": {
                sidebarName: UI_TEXT.myCollection,
                icon: "fas fa-folder-open",
                items: [
                    // NEW: Subfolder example
                    {
                        id: "ppmc-sites",
                        name: "PPMC Club 站点",
                        icon: "fas fa-folder",
                        type: "folder",
                        items: [
                            { name: UI_TEXT.musicPlayer, icon: "fas fa-music", type: "app-link", appId: "music-player" },
                            { name: UI_TEXT.mainBlog, icon: "fas fa-blog", type: "app-link", appId: "main-blog" },
                            { name: UI_TEXT.toolHub, icon: "fas fa-tools", type: "app-link", appId: "tool-hub" },
                            { name: UI_TEXT.navHub, icon: "fas fa-compass", type: "app-link", appId: "nav-hub" }
                        ]
                    },
                    { name: UI_TEXT.webDevTool, icon: "fas fa-laptop-code", type: "app-link", appId: "web-dev-tool" },
                ]
            },
            "work": {
                sidebarName: UI_TEXT.workRelated,
                icon: "fas fa-briefcase",
                items: [
                    { name: "LinkedIn", icon: "fab fa-linkedin", type: "app-link", appId: "linkedin-profile" }
                ]
            }
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
    "settings", // <-- NEW
    "music-player",
    "main-blog",
    "tool-hub",
    "web-dev-tool"
];

export const PINNED_APPS = [
    "website-directory", // large
    "online-chat",       // wide
    "main-blog",         // wide
    "settings",          // medium <-- NEW
    "about-me",          // medium
    "my-projects",       // medium
    "tool-hub",          // medium
    "music-player"       // medium
];