# E-Commerce API

A production-ready NestJS e-commerce backend API with Prisma 6 ORM, PostgreSQL database, and Docker containerization.

## Features

- **Authentication**: JWT-based authentication with Passport.js
- **User Management**: Complete CRUD operations with role-based access control
- **Products & Categories**: Full product catalog management
- **Shopping Cart**: Cart and cart items management
- **Orders**: Order processing and tracking
- **Payments**: Payment integration support
- **Reviews**: Product review system
- **Wishlist**: Customer wishlist functionality
- **Coupons**: Discount coupon system
- **Swagger Documentation**: Interactive API documentation at `/api-docs`

## Tech Stack

- **Framework**: NestJS 11.x
- **ORM**: Prisma 6.x with PostgreSQL
- **Authentication**: JWT + Passport.js
- **Validation**: class-validator & class-transformer
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Development Setup

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

### Docker Setup (Recommended)

```bash
# Start all services (PostgreSQL + API)
docker-compose up -d

# Apply migrations
docker-compose exec app npx prisma migrate deploy

# View logs
docker-compose logs -f app
```

The API will be available at: http://localhost:3000
Swagger documentation at: http://localhost:3000/api-docs

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
```

## API Endpoints

### Authentication

| Method | Endpoint             | Description       |
| ------ | -------------------- | ----------------- |
| POST   | `/api/auth/register` | Register new user |
| POST   | `/api/auth/login`    | Login user        |

### Users

| Method | Endpoint                     | Description              |
| ------ | ---------------------------- | ------------------------ |
| GET    | `/api/users`                 | List all users           |
| GET    | `/api/users/:id`             | Get user by ID           |
| GET    | `/api/users/profile`         | Get current user profile |
| PATCH  | `/api/users/profile`         | Update profile           |
| PATCH  | `/api/users/:id`             | Update user              |
| POST   | `/api/users/change-password` | Change password          |
| DELETE | `/api/users/:id`             | Soft delete user         |
| DELETE | `/api/users/:id/hard`        | Hard delete user         |

## Project Structure

```
src/
├── auth/           # Authentication module
├── user/           # User management module
├── prisma/         # Prisma service module
├── app.controller  # Root controller
└── main.ts         # Application entry point

prisma/
├── schema.prisma    # Database schema
└── migrations/      # Database migrations

generated/          # Prisma generated types
```

## Database Schema

The application includes models for:

- Users & Sessions
- Products & Categories
- Orders & Order Items
- Cart & Cart Items
- Payments & Refunds
- Reviews & Wishlists
- Coupons & Notifications

## Scripts

```bash
# Development
npm run start:dev      # Watch mode
npm run start:debug    # Debug mode

# Production
npm run build          # Build
npm run start:prod     # Production mode

# Database
npx prisma generate    # Generate Prisma Client
npx prisma migrate     # Run migrations
npx prisma studio      # Open Prisma Studio

# Testing
npm run test           # Unit tests
npm run test:e2e       # E2E tests
```

## Docker Commands

```bash
# Start services
docker-compose up -d

# Rebuild after changes
docker-compose up -d --build

# Stop services
docker-compose down

# Remove orphans
docker-compose down --remove-orphans

# Access app container
docker-compose exec app sh
```

## License

MIT License
