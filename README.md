# Shulkr

Shulkr is a secure Minecraft log hosting service that helps server administrators and players share and analyze their Minecraft logs. It automatically sanitizes sensitive information, detects common errors, and provides actionable solutions.

![Shulkr Screenshot](https://github.com/user-attachments/assets/903cc578-6bbb-4053-8bb6-640e13f381df)


## Features

- 🔒 **Automatic Log Sanitization**
  - Removes IP addresses
  - Anonymizes UUIDs
  - Redacts chat messages and private commands
  - Obscures coordinates and sensitive paths

- 🔍 **Intelligent Error Detection**
  - Identifies common Minecraft server issues
  - Provides actionable solutions and recommendations
  - Links directly to error lines

- 📊 **Server Information Analysis**
  - Detects server software (Vanilla, Paper, Purpur, etc.)
  - Shows Java version and operating system details
  - Provides system compatibility insights

- 🎨 **User-Friendly Interface**
  - Syntax highlighting for better readability
  - Dark mode support
  - Mobile-responsive design
  - Direct links to specific lines
  - Raw log access option

## Technology Stack

- **Frontend**: HTML, Tailwind CSS, JavaScript
- **Backend**: Cloudflare Workers
- **Storage**: Cloudflare KV
- **Dependencies**:
  - Tailwind CSS (v2.2.19)
  - Lucide Icons

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Paylicier/Shulkr.git
cd Shulkr
```

2. Install Wrangler CLI:
```bash
npm install -g wrangler
```

3. Configure your Cloudflare account:
```bash
wrangler login
```

4. Create a KV namespace:
```bash
wrangler kv:namespace create "LOGS_KV"
```

5. Update `wrangler.toml` with your KV namespace ID:
```toml
kv_namespaces = [
  { binding = "LOGS_KV", id = "your-namespace-id" }
]
```

6. Deploy to Cloudflare Workers:
```bash
wrangler deploy
```

## Usage

1. Visit the Shulkr website
2. Paste your Minecraft server log into the text area
3. Click "Upload Log"
4. Share the generated URL with others

The log will be automatically sanitized and analyzed for common issues. The shared URL will display:
- Server information
- Error analysis with solutions
- Formatted log content with syntax highlighting
- Direct links to specific lines

## Error Detection

Shulkr automatically detects and provides solutions for common issues:

- Version mismatches
- Plugin conflicts
- Memory errors
- Network issues
- World corruption
- Missing dependencies
- Configuration problems

Each detected error includes:
- Error description
- Line number reference
- Possible solutions
- Additional context when available

## Privacy & Security

- Logs are automatically sanitized to remove sensitive information
- No user registration or tracking
- Logs automatically expire after 7 days
- Raw logs are available but still sanitized
- No external service dependencies

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

## Adding New Error Patterns

To add new error detection patterns, modify the `ERROR_PATTERNS` array in `src/index.js`:

```javascript
{
    pattern: /your_regex_pattern/i,
    type: 'error_type',
    getSuggestion: (matches) => ({
        title: 'Error Title',
        description: 'Error description',
        solutions: [
            'Solution 1',
            'Solution 2'
        ]
    })
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by various Minecraft server communities including [mclo.gs](https://mclo.gs)
- Built with Cloudflare Workers
- Styled with Tailwind CSS
- Icons by Lucide

## Support

For support, please open an issue on the GitHub repository or contact the maintainers.

