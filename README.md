# WhatsNextPlease - Multi-tenant Task & Project Management Platform

A comprehensive work management system built with Next.js, TypeScript, and Express.js that streamlines task delegation, client management, and team collaboration. This monorepo project features role-based access control, real-time chat integration, push notifications, and skill-based task assignments.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Database Setup](#database-setup)
- [AWS Services Configuration](#aws-services-configuration)
- [Deployment](#deployment)
- [Development Guidelines](#development-guidelines)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

WhatsNextPlease is a multi-tenant task management platform that enables organizations to efficiently manage tasks, clients, and team collaboration. The platform supports multiple user roles with distinct dashboards and permissions:

- **Super Users**: Full administrative access and system management
- **Task Supervisors**: Oversee task workflows and team management
- **Task Agents**: Execute assigned tasks and track progress
- **Clients**: Create tasks, track progress, and manage billing
- **District/Territory Managers**: Manage geographical regions and client relationships
- **Account Executives**: Handle client accounts and business development

### Key Features

- 🎯 **Task Management**: Priority-based task system with multiple status workflows
- 👥 **Multi-role Support**: Role-specific dashboards and functionalities
- 💬 **Integrated Chat**: Real-time messaging with iframe integration
- 🔔 **Smart Notifications**: Push notifications and Server-Sent Events (SSE)
- 🏢 **Client Management**: Complete CRM capabilities
- 🎨 **Skill Matching**: Match tasks with agents based on skills
- 📊 **Permissions System**: Granular role-based access control
- 🔄 **Hybrid Architecture**: Next.js App Router + standalone Express backend

## 🏗️ Architecture

```
whatsnextplease-monolith/
├── apps/
│   ├── web/                 # Next.js frontend application
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── utils/           # Utility functions
│   │   ├── prisma/          # Database schema and migrations
│   │   └── cdk/             # AWS CDK for S3/CloudFront
│   └── backend/             # Express.js backend API
│       ├── api/             # API routes and controllers
│       ├── prisma/          # Database schema (shared)
│       ├── cdk/             # AWS CDK for ECS deployment
│       └── Dockerfile       # Container configuration
├── packages/
│   ├── types/               # Shared TypeScript types
│   ├── logger/              # Centralized logging utility
│   └── typescript-config/   # Shared TypeScript configs
├── turbo.json               # Turborepo configuration
├── pnpm-workspace.yaml      # PNPM workspace configuration
└── package.json             # Root package configuration
```

### Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Express.js, Prisma ORM, PostgreSQL
- **Infrastructure**: AWS (ECS, S3, CloudFront, CDK)
- **Real-time**: SSE, Push Notifications, WebSocket
- **Build Tools**: Turborepo, PNPM, Docker
- **CI/CD**: GitHub Actions, Vercel

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18 or higher (v20+ recommended)
- **PNPM**: Version 9.0.0 (exact version)
- **PostgreSQL**: Version 14 or higher
- **Docker**: For containerization and local testing
- **AWS CLI**: For AWS deployments (optional)
- **Git**: Version control

### System Requirements

- **RAM**: Minimum 8GB (16GB recommended for development)
- **Storage**: At least 5GB free space
- **OS**: macOS, Linux, or Windows with WSL2

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/whatsnextplease-monolith.git
cd whatsnextplease-monolith
```

### 2. Install Dependencies

```bash
# Install pnpm globally if not already installed
npm install -g pnpm@9.0.0

# Install all dependencies
pnpm install
```

### 3. Set Up Environment Variables

Create `.env` files in both `apps/web` and `apps/backend`:

```bash
# Copy example files
cp apps/web/.env.example apps/web/.env
cp apps/backend/.env.example apps/backend/.env
```

### 4. Database Setup

```bash
# Start PostgreSQL (if using Docker)
docker run -d \
  --name wnp-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=wnpdb_dev \
  -p 5432:5432 \
  postgres:17

# Run migrations for both apps
cd apps/web && npx prisma migrate dev
cd ../backend && npx prisma migrate dev
```
### Common Database setup problems while working locally 

* Sometimes if you already have a postgres installed locally then the port which is exposed by docker might conflict with postgres cli running locally.
* In that case its advised to change exposed port from `5432` to something else maybe `5433`.
* Make sure to run prisma migrate commands to run all migrations 
```
pnpm dlx prisma generate
pnpm dlx prisma migrate dev | pnpm dlx prisma migrate deploy 
```
* Since currenlty project directly uses prisma and through standalone backend thus need to run migrations in both apps/backend and apps/web 

### 5. Start Development Servers

```bash
# From the root directory
pnpm dev
```

This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:5001

## 🔧 Environment Variables

### Frontend (`apps/web/.env`)

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wnpdb_dev?schema=public"

# Backend API
API_URL="http://localhost:5001"
NEXT_PUBLIC_API_URL="http://localhost:5001"

# AWS Services (for S3 file uploads)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="wnp-media-development"

# Chat Integration
NEXT_PUBLIC_CHAT_APP_URL="http://localhost:3000/"

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-vapid-public-key"

# Security
SECRET="your-secret-key-for-jwt"
```

### Backend (`apps/backend/.env`)

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wnpdb_dev?schema=public"

# AWS Services
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="wnp-media-development"
CLOUDFRONT_DOMAIN="your-cloudfront-domain.cloudfront.net"

# Push Notifications
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
WEB_PUSH_EMAIL="your-email@example.com"

# Application
NODE_ENV="development"
LOG_LEVEL="debug"
SECRET="your-secret-key-for-jwt"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email Service (optional)
EMAIL_PROVIDER="resend"  # or "ses" for AWS SES
RESEND_API_KEY="re_your_resend_key"
EMAIL_WHITELIST="*@yourdomain.com"  # For staging environments
```

## 💻 Local Development

### Running Individual Apps

```bash
# Run only the frontend
pnpm --filter web dev

# Run only the backend
pnpm --filter backend dev

# Build specific package
pnpm --filter @wnp/types build
```

### Database Management

```bash
# Create a new migration
cd apps/web  # or apps/backend
npx prisma migrate dev --name your_migration_name

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

### Testing S3 File Uploads Locally

1. Create a test S3 bucket in AWS
2. Configure CORS for your bucket:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

3. Set appropriate IAM permissions for your AWS credentials

## 🗄️ Database Setup

### PostgreSQL Installation

#### macOS
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql-14 postgresql-client-14
sudo systemctl start postgresql
```

#### Windows
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### Create Database

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE wnpdb_dev;

-- Create test database (optional)
CREATE DATABASE wnpdb_test;
```

### Running Migrations

```bash
# Development migrations
cd apps/web && npx prisma migrate dev
cd ../backend && npx prisma migrate dev

# Production migrations
npx prisma migrate deploy
```

## ☁️ AWS Services Configuration

### S3 Bucket Setup

1. Create S3 buckets for different environments:
   - `wnp-media-development`
   - `wnp-media-staging`
   - `wnp-media-production`

2. Configure bucket policies for appropriate access

### CloudFront Distribution

1. Create CloudFront distributions for each S3 bucket
2. Configure origin access identity (OAI)
3. Set appropriate cache behaviors

### ECS Deployment (Backend)

```bash
# Build and deploy to ECS
cd apps/backend

# Development deployment
./deploy-to-ecr.sh development

# Production deployment
./deploy-to-ecr.sh production
```

### CDK Deployment

```bash
# Deploy S3/CloudFront stack
cd apps/web/cdk
npm run build
cdk deploy

# Deploy ECS stack
cd apps/backend/cdk
npm run build
cdk deploy
```

## 🚢 Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set up branch deployments:
   - `main` → Production
   - `staging` → Staging environment

### Backend (AWS ECS)

1. Build Docker image:
```bash
cd apps/backend
docker build -t wnp-backend .
```

2. Push to ECR:
```bash
# Tag image
docker tag wnp-backend:latest [ECR_URI]:latest

# Push to ECR
docker push [ECR_URI]:latest
```

3. Update ECS service to use new image

### GitHub Actions CI/CD

The project includes GitHub Actions workflows for:
- Automated testing
- Staging deployments
- Production deployments

See `.github/workflows/` for configuration details.

## 📝 Development Guidelines

### Git Workflow

We use GitFlow with the following branches:
- `main`: Production-ready code
- `staging`: Staging environment
- `development`: Active development
- `feature/*`: Feature branches
- `hotfix/*`: Emergency fixes

### Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
<type>(<scope>): <subject>

# Examples
feat(tasks): add bulk task assignment
fix(auth): resolve JWT token expiration issue
docs(readme): update installation instructions
chore(deps): upgrade Next.js to 14.2.0
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Maintenance tasks

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured with Next.js recommendations
- **Prettier**: Auto-formatting on save
- **Import Order**: Enforced by ESLint

### Pre-commit Hooks

Husky runs the following checks before commits:
```bash
# Automatically runs:
- ESLint
- Prettier
- TypeScript compilation
- Build verification
```

### Testing Strategy

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run E2E tests
pnpm test:e2e
```

## 🐛 Troubleshooting

### Common Issues

#### 1. PNPM Installation Fails
```bash
# Clear cache and reinstall
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### 2. Database Connection Issues
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Verify DATABASE_URL format
# Should be: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
```

#### 3. Build Errors
```bash
# Clean build artifacts
pnpm clean
pnpm build
```

#### 4. Docker Build Failures
```bash
# Clear Docker cache
docker system prune -a
docker build --no-cache .
```

#### 5. Environment Variable Issues
- Ensure `NEXT_PUBLIC_` prefix for client-side variables
- Restart dev server after changing `.env` files
- Check for typos in variable names

### Best Practices 

* Make sure to copy new Migration created in either backend or web to web or backend as well so that its stays in sync.
* Always git commit at root of project and not in individual workspaces.
* Most of types, erros and logging info are in `packages` directory.
* You can always run `bash` scripts to generate random data for first time usage or refreshing if soemthing bad happening locally.

### Debug Mode

Enable debug logging:
```bash
# Backend
LOG_LEVEL=debug pnpm --filter backend dev

# Frontend
DEBUG=* pnpm --filter web dev
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [AWS CDK Guide](https://docs.aws.amazon.com/cdk/latest/guide/)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [PNPM Documentation](https://pnpm.io/)

## 🤝 Contributing

1. Create a feature branch from `development`
2. Make your changes following our conventions
3. Write/update tests as needed
4. Submit a pull request with a clear description
5. Ensure all CI checks pass

## 📄 License

This project is proprietary and confidential.

## 💬 Support

For issues or questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the internal documentation wiki

---

**Last Updated**: October 2024  
**Maintained By**: WNP Development Team
