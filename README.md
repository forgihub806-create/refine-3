
# CipherBox - Media Scraper & Manager

A powerful Electron-based application for scraping, managing, and organizing media content from various platforms. Built with React, TypeScript, Express, and SQLite.

## 🚀 Features

- **Multi-Platform Scraping**: Supports 7+ different media platforms
- **Metadata Management**: Automatic extraction of titles, thumbnails, duration, and file sizes
- **Bulk URL Processing**: Add multiple URLs at once (one per line)
- **Download Management**: Generate and manage download links with expiration handling
- **Tag System**: Organize media with custom tags and categories
- **Pagination**: Efficient loading of large media collections
- **Real-time Updates**: Live metadata fetching and status updates
- **Cross-Platform**: Works on Windows, macOS, and Linux

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **Python** (for multiscraper functionality, if needed)

## 🔧 Dependencies

### Core Dependencies
- **Electron** - Desktop app framework
- **React** - Frontend UI library
- **TypeScript** - Type-safe JavaScript
- **Express** - Backend server
- **SQLite** (via Drizzle ORM) - Database
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components

### Key Libraries
- `@tanstack/react-query` - Data fetching and caching
- `drizzle-orm` - Database ORM
- `wouter` - Lightweight routing
- `framer-motion` - Animations
- `lucide-react` - Icons
- `node-fetch` - HTTP requests
- `concurrently` - Run multiple commands

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd cipherbox
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
The SQLite database will be automatically created on first run. No additional setup required.

### 4. Development Mode
```bash
npm run dev
```
This will start:
- Express server on port 5000
- Electron app window
- Hot reload for both frontend and backend

### 5. Production Build
```bash
npm run build
npm start
```

## 🎯 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server + Electron app |
| `npm run dev:server` | Start only the Express server |
| `npm run dev:electron` | Start only the Electron app |
| `npm run build` | Build for production |
| `npm start` | Start production Electron app |
| `npm run start:web` | Start production web server only |
| `npm run check` | TypeScript type checking |

## 🏗️ Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # App pages
│   │   ├── lib/            # Utilities and API client
│   │   └── hooks/          # Custom React hooks
├── server/                 # Express backend
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database layer
│   └── vite.ts             # Development server
├── shared/                 # Shared types and schemas
├── main.js                 # Electron main process
├── preload.cjs            # Electron preload script
└── package.json           # Dependencies and scripts
```

## 🔌 API Endpoints

### Media Management
- `GET /api/media` - Get paginated media items
- `POST /api/media` - Add new media URL(s)
- `GET /api/media/:id` - Get specific media item
- `PUT /api/media/:id` - Update media item
- `DELETE /api/media/:id` - Delete media item

### Metadata & Downloads
- `POST /api/media/:id/metadata` - Fetch/refresh metadata
- `POST /api/media/:id/download` - Generate download URL
- `GET /api/media/:id/download` - Get download status

### Proxy APIs (7 platforms)
- `/api/raspywave-proxy`
- `/api/tera-fast-proxy`
- `/api/teradwn-proxy`
- `/api/tera-downloader-cc-proxy`
- `/api/iteraplay-proxy`
- `/api/terabox-proxy`
- `/api/gofile-proxy`

## 🛠️ Configuration

### API Settings
Configure scraping APIs in the Settings page:
- Custom API endpoints
- Request headers and parameters
- Timeout settings
- Response parsing options

### Database
SQLite database is stored locally. Schema includes:
- `media_items` - Main media data
- `tags` - Tag system
- `users` - User management (if needed)

## 🐛 Troubleshooting

### Common Issues

1. **Server won't start**
   - Ensure port 5000 is available
   - Check if Node.js version is 18+

2. **Electron app doesn't open**
   - Wait for server to fully start (health check)
   - Check console for error messages

3. **Database errors**
   - Delete `cipherbox.db` to reset database
   - Check file permissions

4. **Scraping failures**
   - Verify API endpoints in Settings
   - Check network connectivity
   - Some platforms may have rate limiting

### Development Tips

- Use `npm run dev:server` to test API endpoints separately
- Check browser DevTools for frontend debugging
- Monitor Electron console for main process logs
- Use `npm run check` for TypeScript errors

## 📝 Usage

1. **Add Media**: Paste URLs in the Add Media page (supports bulk entry)
2. **View Library**: Browse your media collection with pagination
3. **Get Metadata**: Click refresh on cards to fetch metadata
4. **Download**: Use detail view to generate download links
5. **Organize**: Add tags and manage your collection
6. **Settings**: Configure API endpoints and app preferences

## 🔒 Security Notes

- All data stored locally in SQLite
- No external data transmission except for scraping
- API keys and sensitive data should be stored securely
- CORS disabled for localhost development

## 📄 License

MIT License - see package.json for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Built with ❤️ using Electron, React, and TypeScript**
