# WhatsNextPlease Authentication Documentation

## Overview

This documentation covers the authentication system migration from legacy JWT to modern Identity Provider (IDP) solutions.

## Quick Links

### Getting Started

- [Architecture Overview](./authentication/01-OVERVIEW.md)
- [Local Development (Keycloak)](./authentication/02-KEYCLOAK-SETUP.md)
- [Staging/Production (AWS Cognito)](./authentication/03-AWS-COGNITO-SETUP.md)

### Implementation Details

- [Auto-Migration System](./authentication/04-MIGRATION-GUIDE.md)
- [Deployment Guide](./authentication/05-DEPLOYMENT-GUIDE.md)

## Quick Start

### Local Development

- Clone the repo for [Identity Provider (IDP)](https://github.com/HillCountryCoder/Identity-provider-shared-infra.git)
- Then

```bash
cd docker
# Start Keycloak
docker-compose up -d keycloak
```

# Set environment

- We can setup environment in our local application using environment varaibles like in case of whatsnextplease

```bash
nvim apps/backend/.env
# add
AUTH_PROVIDER=keycloak

# Run monolith or backend by going to root
pnpm run dev
```

### Testing with AWS Cognito

```bash
# Set environment
AUTH_PROVIDER=cognito
COGNITO_USER_POOL_ID=us#####EEQQ
COGNITO_CLIENT_ID=7#############4h0

# Run backend
# Go to root of project and run
pnpm run dev
```

## Migration Status

- ✅ Keycloak integration complete
- ✅ AWS Cognito integration complete
- ✅ Auto-migration implemented
- ✅ Legacy JWT fallback working
- ✅ Frontend integration complete
- ⏳ Production deployment pending

## Contact

For questions or issues, contact:

- **Lead Developer**: Sibteali Baqar
- **Team**: Hill Country Coders
