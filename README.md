# WrappedUp Frontend

A modern web application built with Next.js that provides a beautiful interface for tracking and analyzing your reading habits. This is the frontend component of the WrappedUp application.

## 🚀 Features

- 📚 Track your reading progress and habits
- 👤 User authentication and profile management
- 📊 Beautiful visualizations of reading statistics
- 📱 Responsive design for both desktop and mobile
- 🔒 Secure API integration with JWT authentication
- 📷 QR code scanning for quick book addition

## 🛠️ Tech Stack

- **Framework**: [Next.js 13](https://nextjs.org/) with TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Authentication**: JWT-based auth
- **Icons**: Heroicons
- **Data Visualization**: D3.js
- **QR Code Scanning**: react-zxing

## 🏗️ Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn
- Docker (for containerized deployment)

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd WrappedUp-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_API_URL=https://wrappedupapi.duckdns.org
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🐳 Docker Deployment

1. **Build the Docker image**
   ```bash
   docker build --build-arg NEXT_PUBLIC_API_URL=https://wrappedupapi.duckdns.org -t wrappedup-frontend:latest .
   ```

2. **Run the container**
   ```bash
   docker run -p 3000:80 wrappedup-frontend:latest
   ```

## 📁 Project Structure

```
WrappedUp-frontend/
├── src/
│   ├── app/          # Next.js app directory
│   ├── components/   # Reusable React components
│   ├── contexts/     # React Context providers
│   ├── services/     # API and other services
│   └── types/        # TypeScript type definitions
├── public/           # Static files
└── styles/          # Global styles
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🌐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| NEXT_PUBLIC_API_URL | Backend API URL | Yes |

## 🔒 Security

- JWT-based authentication
- Secure password handling
- HTTPS enforced in production
- Protected API routes
- CORS configuration

## 🤝 Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Related Projects

- [WrappedUp Backend](../WrappedUp-backend) - Spring Boot backend service
- [WrappedUp Mobile](../WrappedUp-mobile) - Mobile application (Comming next)
