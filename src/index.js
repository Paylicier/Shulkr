// Cache commonly used HTML templates
const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shulkr - Minecraft Log Hosting</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
    <div class="container mx-auto px-4 py-8">
        <div class="flex justify-between items-center mb-5">
            <h1 class="text-4xl font-bold mb-8 text-gray-800 dark:text-gray-100">Shulkr</h1>
            <button id="themeToggle" class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <i id="themeIcon" data-lucide="sun" class="w-6 h-6 text-gray-800 dark:text-gray-100"></i>
            </button>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <textarea id="logContent" class="w-full h-64 p-4 border rounded-lg mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" 
                placeholder="Paste your Minecraft log here..."></textarea>
            <button onclick="submitLog()" 
                class="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700">
                Upload Log
            </button>
        </div>
        <div id="result" class="mt-4 text-gray-700 dark:text-gray-300"></div>
    </div>
    <script>
        tailwind.config = {
            darkMode: 'selector'
        }
        async function submitLog() {
            const content = document.getElementById('logContent').value;
            if(!content) return;
            try {
                const response = await fetch('/api/logs', {
                    method: 'POST',
                    body: content,
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                });
                const data = await response.json();
                document.getElementById('result').innerHTML = 
                    \`Log uploaded! Access it at: <a href="\${data.url}" class="text-blue-500 hover:underline">\${data.url}</a>\`;
            } catch (error) {
                console.error('Error:', error);
            }
        }
                // Initialize Lucide icons
        lucide.createIcons();

        // Theme management
        const themeToggle = document.getElementById('themeToggle');

        // Check for saved theme preference or use system preference
        const getThemePreference = () => {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                return savedTheme;
            }
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        };

        // Apply theme
        const applyTheme = (theme) => {
            console.log('Applying theme:', theme);
                    const themeIcon = document.getElementById('themeIcon');
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
                themeIcon.setAttribute('data-lucide', 'moon');
            } else {
                document.documentElement.classList.remove('dark');
                themeIcon.setAttribute('data-lucide', 'sun');
            }
            localStorage.setItem('theme', theme);
            lucide.createIcons();
        };

        // Initialize theme
        applyTheme(getThemePreference());

        // Theme toggle handler
        themeToggle.addEventListener('click', () => {
            const currentTheme = localStorage.getItem('theme') || getThemePreference();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            console.log('Switching theme to', newTheme);
            applyTheme(newTheme);
        });

        // Watch for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    </script>
</body>
</html>`;

// Pre-compile regular expressions
const REGEX = {
    IP: /(?<!\b(?:v|version)\s)(\b(?:\d{1,3}\.){3}\d{1,3}\b)/g,
    UUID: /(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g,
    CHAT: /<[^>]+> .+/g,
    COMMANDS: {
        MSG: /(\w+) issued server command: \/msg (\w+) .+/g,
        TELL: /(\w+) issued server command: \/tell (\w+) .+/g,
        W: /(\w+) issued server command: \/w (\w+) .+/g,
        R: /(\w+) issued server command: \/r .+/g
    },
    COORDINATES: {
        MOVED: /moved too quickly! (-?\d+), (-?\d+), (-?\d+)/g,
        AT: /at (-?\d+), (-?\d+), (-?\d+)/g,
        TO: /to (-?\d+), (-?\d+), (-?\d+)/g,
        FROM: /from (-?\d+), (-?\d+), (-?\d+)/g,
        XYZ: /x=(-?\d+\.\d+), y=(-?\d+\.\d+), z=(-?\d+\.\d+)/g,
        LOGIN: /logged in with entity id \d+ at \(.+\)/g
    },
    LINUX_PATH: /\/home\/[^/]+/g,
    SERVER_INFO: {
        OS: {
            MAIN: /Running Java \d+ .+ on ([^(\r\n]*?)\s*\(([^)]+)\)/m,
            FALLBACK1: /OS ([^\r\n]*)/m,
            FALLBACK2: /Operating System: ([^\r\n]*)/m
        },
        JAVA: {
            MAIN: /Running Java (\d+) \(([^)]+)\)/m,
            FALLBACK1: /java version ([^\s]+) /m,
            FALLBACK2: /Java Version: ([^\r\n]*)/m
        }
    }
};

// Error patterns with optimized regex compilation
const ERROR_PATTERNS = [
    {
        pattern: /(?:failed to load|incompatible with) .+ version[^,\n]* required:\s*([^,\n]+).*?current:\s*([^,\n]+)/i,
        type: 'version_mismatch',
        getSuggestion: (matches) => ({
            title: 'Version Mismatch Detected',
            description: `Required version: ${matches[1]}, Current version: ${matches[2]}`,
            solutions: [
                'Update the plugin to a version compatible with your server',
                'Check if there\'s a legacy version of the plugin for your server version',
                'Contact the plugin developer for support'
            ]
        })
    },
    {
        pattern: /could not load '([^']+)' in folder '([^']+)'/i,
        type: 'plugin_load_failure',
        getSuggestion: (matches) => ({
            title: 'Plugin Load Failure',
            description: `Failed to load ${matches[1]} from ${matches[2]}`,
            solutions: [
                'Verify the plugin file is not corrupted',
                'Check if all required dependencies are installed',
                'Ensure the plugin is compatible with your server version'
            ]
        })
    },
    {
        pattern: /java\.lang\.OutOfMemoryError/i,
        type: 'memory_error',
        getSuggestion: () => ({
            title: 'Out of Memory Error',
            description: 'Server ran out of allocated memory',
            solutions: [
                'Increase the maximum memory allocation in your startup script',
                'Review and optimize plugin configurations',
                'Consider using Aikar\'s flags for better memory management',
                'Monitor memory usage with timings reports'
            ]
        })
    },
    {
        pattern: /Connection reset by peer/i,
        type: 'network_error',
        getSuggestion: () => ({
            title: 'Network Connection Issues',
            description: 'Detected connection problems',
            solutions: [
                'Check server network configuration',
                'Verify firewall settings',
                'Ensure proper port forwarding',
                'Monitor for DDoS attacks'
            ]
        })
    },
    {
        pattern: /Unable to access jarfile/i,
        type: 'jar_access',
        getSuggestion: () => ({
            title: 'JAR File Access Error',
            description: 'Server cannot access the JAR file',
            solutions: [
                'Verify file permissions',
                'Check if the JAR file exists and isn\'t corrupted',
                'Ensure proper Java installation',
                'Validate file path in startup script'
            ]
        })
    },
    {
        pattern: /(.+) has failed to load correctly/i,
        type: 'mod_load_failure',
        getSuggestion: (matches) => ({
            title: matches[0],
            description: 'An error occurred while loading a mod',
            solutions: [
                'Verify the mod file is not corrupted',
                'Check if all required dependencies are installed',
                'Ensure the mod is compatible with your server version'
            ]
        })
    },
    {
        pattern: /java\.io\.IOException/i,
        type: 'io_exception',
        getSuggestion: () => ({
            title: 'I/O Exception',
            description: 'An I/O Exception has occurred',
            solutions: [
                'Check if you\'re requesting a file on a distant server that is not reachable',
                'Check if the file system is full',
                'Verify file permissions',
                'Review the server configuration'
            ]
        })
    },
    {
        pattern: /java\.lang\.ClassNotFoundException: (.+)/i,
        type: 'class_not_found',
        getSuggestion: (matches) => ({
            title: 'Class Not Found Exception',
            description: `Class ${matches[1]} not found`,
            solutions: [
                'Check if the class name is correct',
                'Verify the plugin/mod has been compiled correctly',
                'Ensure the plugin/mod is not missing any dependencies',
                'If you compiled the plugin/mod yourself and it requires dependencies, ensure you\'re using shadowJAR or similar'
            ]
        })
    },
    {
        pattern: /java\.lang\.StackOverflowError/i,
        type: 'stack_overflow',
        getSuggestion: () => ({
            title: 'Stack Overflow Error',
            description: 'Stack overflow error detected',
            solutions: [
                'Review recursive functions in plugins',
                'Optimize plugin code to prevent infinite loops',
                'Check for plugin conflicts causing loops'
            ]
        })
    },
    {
        pattern: /java\.io\.(UTFDataFormat|EOF)Exception/i,
        type: 'world_corrupted',
        getSuggestion: () => ({
            title: 'World corrupted',
            description: 'Your world is probably corrupted',
            solutions: [
                'Restore the world from a backup',
                'Check for disk errors or hardware failures',
                'Monitor server hardware for potential issues'
            ]
        })
    },
    {
        pattern: /java\.lang\.IllegalArgumentException: n must be positive/i,
        type: 'illegal_argument_n_positive',
        getSuggestion: () => ({
            title: 'Illegal Argument Exception',
            description: 'n must be positive',
            solutions: [
                'Check for entities with negative enchantments',
                'Remove the entity/player\'s inventory to prevent the crash',
                'Ensure all items have valid enchantments'
            ]
        })
    },
    {
        pattern: /Could not pass event (.+) to (.+)/i,
        type: 'event_failure',
        getSuggestion: (matches) => ({
            title: 'Event Failure',
            description: `Failed to pass event ${matches[1]} to ${matches[2]}`,
            solutions: [
                'Check for plugin conflicts',
                'Review plugin code for potential issues'
            ]
        })
    },
    {
        pattern: /net\.minecraftforge\.fml\.common\.MissingModsException: Mod (.+) requires \[(.+)\]/i,
        type: 'missing_mods',
        getSuggestion: (matches) => ({
            title: 'Missing Mods Exception',
            description: `Mod ${matches[1]} requires [${matches[2]}]`,
            solutions: [
                'Install the missing mod(s)',
                'Check for mod dependencies',
                'Ensure all mods are up to date'
            ]
        })
    },
    {
        pattern: /Is the (.+) plugin enabled\?/i,
        type: 'plugin_disabled',
        getSuggestion: (matches) => ({
            title: 'Plugin Disabled',
            description: `Is ${matches[1]} enabled?`,
            solutions: [
                'Check if the plugin is installed',
                'Check if the plugin is working as expected',
                'Verify the plugin is not conflicting with other plugins'
            ]
        })
    },
    {
        pattern: /Plugin attempted to register task while disabled/i,
        type: 'task_disabled',
        getSuggestion: () => ({
            title: 'Task Disabled',
            description: 'Plugin attempted to register task while disabled',
            solutions: [
                'Ensure the plugin hasn\'t been disabled with Plugman or similar',
                'Check for plugin conflicts',
                'Review plugin code for potential issues'
            ]
        })
    },
    {
        pattern: /Task #\d+ for (.+) v(.+) generated an exception/i,
        type: 'task_exception',
        getSuggestion: (matches) => ({
            title: 'Task Exception',
            description: `${matches[0]}`,
            solutions: [
                'Review the task code for potential issues',
                'Check for plugin conflicts',
                'Ensure the task is registered correctly'
            ]
        })
    },
    {
        pattern: /Unhandled exception occurred in (.+) for (.+)/i,
        type: 'plugin_exception',
        getSuggestion: (matches) => ({
            title: 'Plugin Exception',
            description: `Unhandled exception occurred in ${matches[1]} for ${matches[2]}`,
            solutions: [
                'Check for plugin updates',
                'Review plugin code for potential issues',
                'Contact the plugin developer for support'
            ]
        })
    }
].map(pattern => ({
    ...pattern,
    pattern: new RegExp(pattern.pattern, pattern.pattern.flags)
}));

// Optimized server software detection patterns
const SERVER_PATTERNS = {
    PURPUR: /(?:Loading|running) Purpur ([^\s]+) \(([^)]+)\)/mi,
    PAPER: /(?:Paper|Paper-Server) version git-Paper-([^\s]+)/mi,
    FOLIA: /(?:Folia|Folia-Server) version git-Folia-([^\s]+)/mi,
    SPIGOT: /This server is running (?:CraftBukkit|Spigot) version ([^\s]+)/mi,
    FABRIC: /Fabric Loader ([^\s]+)/mi,
    FORGE: /(?:Forge Mod Loader version|MinecraftForge v)([^\s]+)/mi,
    VANILLA: /Starting minecraft server version ([^\s]+)/mi
};

// Cache log formatting patterns
const FORMAT_PATTERNS = {
    LOG_LEVEL: /(ERROR|WARN|INFO|DEBUG)/g,
    MOD_ID: /(ModID: )([^\s,]+)(,)/g,
    MOD_NAME: /([A-Za-z0-9 ]+) \(([^\s]+)\)/g
};

// Utility functions
const generateId = () => Math.random().toString(36).substring(2, 8);

const isValidIpPart = part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
};

// Main log parsing function with optimizations
function parseMinecraftLog(content) {
    let cleanContent = content;

    // Replace IPs with validation
    cleanContent = cleanContent.replace(REGEX.IP, match => {
        const parts = match.split('.');
        return parts.every(isValidIpPart) ? '***.***.***.***' : match;
    });

    // Batch UUID replacement
    const uuidMap = new Map();
    const uuids = cleanContent.match(REGEX.UUID) || [];
    uuids.forEach(uuid => {
        if (!uuidMap.has(uuid)) {
            const fakeUuid = '00000000-0000-4000-8000-000000000000'.replace(
                /0/g,
                () => Math.floor(Math.random() * 16).toString(16)
            );
            uuidMap.set(uuid, fakeUuid);
        }
    });
    uuidMap.forEach((fake, real) => {
        cleanContent = cleanContent.replace(new RegExp(real, 'g'), fake);
    });

    // Apply other replacements
    return cleanContent
        .replace(REGEX.CHAT, '<Player> [MESSAGE REDACTED]')
        .replace(REGEX.COMMANDS.MSG, 'Player issued server command: /msg Player [MESSAGE REDACTED]')
        .replace(REGEX.COMMANDS.TELL, 'Player issued server command: /tell Player [MESSAGE REDACTED]')
        .replace(REGEX.COMMANDS.W, 'Player issued server command: /w Player [MESSAGE REDACTED]')
        .replace(REGEX.COMMANDS.R, 'Player issued server command: /r [MESSAGE REDACTED]')
        .replace(REGEX.COORDINATES.MOVED, 'moved too quickly! X, Y, Z')
        .replace(REGEX.COORDINATES.AT, 'at X, Y, Z')
        .replace(REGEX.COORDINATES.TO, 'to X, Y, Z')
        .replace(REGEX.COORDINATES.FROM, 'from X, Y, Z')
        .replace(REGEX.COORDINATES.XYZ, 'x=**, y=**, z=**')
        .replace(REGEX.COORDINATES.LOGIN, 'logged in with entity id ** at (X, Y, Z)')
        .replace(REGEX.LINUX_PATH, '/home/*******');
}

// Function to find errors and generate suggestions
function analyzeErrors(content) {
    const errors = [];

    for (const pattern of ERROR_PATTERNS) {
        const matches = content.match(pattern.pattern);
        if (matches) {
            //push the error to the array and the line number
            errors.push({
                ...pattern.getSuggestion(matches),
                line: content.split('\n').findIndex(line => line.includes(matches[0])) + 1
            });
        }
    }

    return errors;
}

// Update the log viewing response to include error suggestions
function generateErrorSuggestions(errors) {
    if (errors.length === 0) return '';

    return `
        <div>
            ${errors.map(error => `
                <div class="bg-red-50 border-l-4 border-red-400 p-4 dark:bg-red-900 dark:border-red-600">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            ⚠️
                        </div>
                        <div class="ml-3">
                                                <div class="flex-shrink-0">
                            <span class="font-bold text-red-600 dark:text-red-400"><a href="#L${error.line}">Line ${error.line}</a></span>
                        </div>
                            <h3 class="text-red-800 font-medium dark:text-red-200">${error.title}</h3>
                            <div class="mt-2 text-red-700 dark:text-red-300">
                                <p>${error.description}</p>
                                <ul class="list-disc ml-5 mt-2">
                                    ${error.solutions.map(solution => `
                                        <li class="text-sm">${solution}</li>
                                    `).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function generateInfoHeader(serverInfo) {
    return `
            <div class="bg-gray-800 text-white p-4 rounded-t-lg">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="flex items-center space-x-2">
                        <span class="text-xl">${serverInfo.os.icon}</span>
                        <div>
                            <div class="font-semibold">Operating System</div>
                            <div class="text-gray-300 text-sm">${serverInfo.os.name}</div>
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                        <span class="text-xl">☕</span>
                        <div>
                            <div class="font-semibold">Java Version</div>
                            <div class="text-gray-300 text-sm">${serverInfo.java.version}</div>
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                        <span class="text-xl">${serverInfo.server.icon}</span>
                        <div>
                            <div class="font-semibold">Server Software</div>
                            <div class="text-gray-300 text-sm">${serverInfo.server.software} ${serverInfo.server.version}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
}

//generate Open Graph meta tags
function generateOpenGraphTags(id, serverInfo, lineCount, errors) {

    const recap = `

    ${serverInfo.server.icon} ${serverInfo.server.software} ${serverInfo.server.version}
    ${serverInfo.os.icon} ${serverInfo.os.name}
    ☕ Java ${serverInfo.java.version}

    📜 ${lineCount} lines analyzed
    ❌ ${errors.length} errors detected
    `;
    return `
        <meta property="og:title" content="Shulkr - Logs #${id}">
        <meta property="og:description" content="\n${recap}\n">
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="Shulkr">
    `
}

// Server info parsing with optimized pattern matching
function parseServerInfo(content) {
    const info = {
        os: { name: 'Unknown', version: '', icon: '🖥' },
        java: { version: 'Unknown', vendor: '' },
        server: { software: 'Unknown', version: '', icon: '📦' }
    };

    // OS Detection
    const osMatch =
        content.match(REGEX.SERVER_INFO.OS.MAIN) ||
        content.match(REGEX.SERVER_INFO.OS.FALLBACK1) ||
        content.match(REGEX.SERVER_INFO.OS.FALLBACK2);

    if (osMatch) {
        info.os.name = osMatch[1] + (osMatch[2] ? ` (${osMatch[2]})` : '');
        info.os.icon = info.os.name.includes('Windows') ? '⊞' :
            info.os.name.includes('Linux') ? '🐧' :
                info.os.name.includes('Mac') ? '🍎' : '🖥';
    }

    // Java Detection
    const javaMatch =
        content.match(REGEX.SERVER_INFO.JAVA.MAIN) ||
        content.match(REGEX.SERVER_INFO.JAVA.FALLBACK1) ||
        content.match(REGEX.SERVER_INFO.JAVA.FALLBACK2);

    if (javaMatch) {
        info.java.version = javaMatch[1];
        info.java.vendor = javaMatch[2] || '';
    }

    // Server Software Detection
    const serverMatches = Object.entries(SERVER_PATTERNS)
        .map(([type, pattern]) => ({ type, match: content.match(pattern) }))
        .find(({ match }) => match);

    if (serverMatches) {
        const { type, match } = serverMatches;
        const softwareMap = {
            PURPUR: { name: 'Purpur', icon: '⚡' },
            PAPER: { name: 'Paper', icon: '📄' },
            FOLIA: { name: 'Folia', icon: '🌿' },
            SPIGOT: { name: 'Spigot', icon: '🔌' },
            FABRIC: { name: 'Fabric', icon: '🧵' },
            FORGE: { name: 'Forge', icon: '⚒️' },
            VANILLA: { name: 'Vanilla', icon: '📦' }
        };

        const software = softwareMap[type];
        info.server.software = software.name;
        info.server.version = match[1];
        info.server.icon = software.icon;
    }

    return info;
}

// Request handler with performance optimizations
async function handleRequest(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Early returns for common paths
    if (path === '/' && request.method === 'GET') {
        return new Response(HTML_TEMPLATE, {
            headers: { 'Content-Type': 'text/html' }
        });
    }

    if (path.startsWith('/api/logs')) {
        if (request.method === 'POST') {
            const content = await request.text();
            if (!content) {
                return new Response(
                    JSON.stringify({ success: false, error: 'No content provided' }),
                    { headers: { 'Content-Type': 'application/json' } }
                );
            }

            const id = generateId();
            await LOGS_KV.put(id, parseMinecraftLog(content), {
                expirationTtl: 7 * 24 * 60 * 60
            });

            return new Response(
                JSON.stringify({
                    success: true,
                    id,
                    url: `${url.origin}/logs/${id}`
                }),
                { headers: { 'Content-Type': 'application/json' } }
            );
        }
    }

    // Update the log viewing response to include the header
    if (url.pathname.startsWith('/logs/')) {
        const id = url.pathname.split('/')[2];
        const content = await LOGS_KV.get(id);

        if (!content) {
            return new Response('Log not found', { status: 404 });
        }

        // Check if request wants raw content
        const isRaw = url.searchParams.has('raw');
        if (isRaw) {
            return new Response(content, {
                headers: {
                    'Content-Type': 'text/plain',
                },
            });
        }

        // Parse server information
        const serverInfo = parseServerInfo(content);
        const errors = analyzeErrors(content);

        // Format the content
        let formattedContent = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/\[([^\]]+)\]/g, '<span class="text-blue-600">[$1]</span>')
            .replace(/(ERROR|WARN|INFO|DEBUG)/g, (match) => {
                const colors = {
                    'ERROR': 'text-red-600',
                    'WARN': 'text-yellow-600',
                    'INFO': 'text-green-600',
                    'DEBUG': 'text-gray-600'
                };
                return `<span class="font-bold ${colors[match]}">${match}</span>`;
            });

        //line numbers
        formattedContent = formattedContent.split('<br>').map((line, index) => {
            return `<span class="text-gray-500 font-mono"><a name="L${index + 1}">${index + 1}</a></span> ${line}`;
        }).join('<br>');

        //modID (e.g. ModID: modid,)
        formattedContent = formattedContent.replace(/(ModID: )([^\s,]+)(,)/g, '$1<span class="text-purple-600 font-bold">$2</span>$3');

        //mod name and id (e.g. Plugin Name (pluginid))
        formattedContent = formattedContent.replace(/([A-Za-z0-9 ]+) \(([^\s]+)\)/g, '<span class="text-purple-600 font-bold">$1</span> ($2)');

        return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Shulkr #${id} - ${serverInfo.server.software} ${serverInfo.server.version}</title>
                ${generateOpenGraphTags(id, serverInfo, content.split('\n').length, errors)}
                    <script src="https://cdn.tailwindcss.com"></script>
                    <script src="https://unpkg.com/lucide@latest"></script>
            </head>
            <body class="bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
                <div class="container mx-auto px-4 py-8">
                    <div class="flex justify-between items-center m-4 mb-10">
                    <a href="/">
                        <h1 class="text-2xl font-bold dark:text-gray-100">Log #${id}</h1>
                    </a>
                    <div>
                    <a href="?raw">
                    <button class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <i data-lucide="file" class="w-6 h-6 text-gray-800 dark:text-gray-100"></i>
                    </button>
                    </a>
                    <button id="themeToggle" class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <i id="themeIcon" data-lucide="sun" class="w-6 h-6 text-gray-800 dark:text-gray-100"></i>
                    </button>
                    </div>
                    </div>
                    ${generateInfoHeader(serverInfo)}
                    ${errors.length > 0 ? generateErrorSuggestions(errors) : ''}
                    <div class="bg-white rounded-b-lg shadow-md p-6 font-mono whitespace-pre-wrap dark:bg-gray-700 dark:text-gray-100">${formattedContent}
                    </div>
                </div>
            </body>
            <script>

                tailwind.config = {
                    darkMode: 'selector'
                }


        lucide.createIcons();

        // Theme management
        const themeToggle = document.getElementById('themeToggle');

        // Check for saved theme preference or use system preference
        const getThemePreference = () => {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                return savedTheme;
            }
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        };

        // Apply theme
        const applyTheme = (theme) => {
            console.log('Applying theme:', theme);
                    const themeIcon = document.getElementById('themeIcon');
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
                themeIcon.setAttribute('data-lucide', 'moon');
            } else {
                document.documentElement.classList.remove('dark');
                themeIcon.setAttribute('data-lucide', 'sun');
            }
            localStorage.setItem('theme', theme);
            lucide.createIcons();
        };

        // Initialize theme
        applyTheme(getThemePreference());

        // Theme toggle handler
        themeToggle.addEventListener('click', () => {
            const currentTheme = localStorage.getItem('theme') || getThemePreference();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            console.log('Switching theme to', newTheme);
            applyTheme(newTheme);
        });

        // Watch for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        });
            </script>
            </html>
        `, {
            headers: {
                'Content-Type': 'text/html',
            },
        });
    }

    return new Response('Not found', { status: 404 });
}

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});