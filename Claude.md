# eSIM Partner Platform

## Project Overview
This is a modern Next.js application for eSIM management with a Supabase backend. The platform enables users to browse, purchase, and manage eSIM packages with multi-language support and integrated payment processing.

## Tech Stack
- **Framework**: Next.js 14 (App Router with standalone output)
- **Language**: JavaScript/TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with custom typography
- **State Management**: TanStack React Query
- **Payments**: Robokassa, Stripe
- **Authentication**: Supabase Auth, Yandex OAuth
- **i18n**: next-i18next with i18next
- **QR Codes**: qrcode.react, react-qr-code
- **Email**: Resend, Nodemailer
- **Forms**: react-hook-form
- **Notifications**: react-hot-toast
- **Animations**: Framer Motion
- **Icons**: lucide-react

## Supported Languages
The application supports 6 languages with dedicated route prefixes:
- English (default, no prefix)
- Russian (`/ru`)
- Hebrew (`/he`)
- Arabic (`/ar`)
- German (`/de`)
- French (`/fr`)
- Spanish (`/es`)

## Project Structure
```
esim-partner/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── orders/            # Order management
│   │   ├── users/             # User management
│   │   ├── robokassa/         # Payment processing
│   │   └── currency/          # Currency operations
│   ├── [lang]/                # Localized pages (ru, he, ar, de, fr, es)
│   │   ├── contact/
│   │   ├── dashboard/
│   │   ├── device-compatibility/
│   │   ├── esim-plans/
│   │   ├── faq/
│   │   ├── login/
│   │   ├── privacy-policy/
│   │   ├── terms-of-service/
│   │   └── share-package/
│   ├── cart/
│   ├── checkout/
│   ├── payment-success/
│   ├── payment-failed/
│   └── auth/
├── middleware.js              # Request handling and routing
├── scripts/                   # Utility scripts (n8n sync)
├── docs/                      # Documentation
└── .env.local                 # Environment variables
```

## Development Commands
```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint

# n8n workflow management
npm run n8n:push          # Push workflows to Supabase
npm run n8n:pull          # Pull workflows from Supabase
npm run n8n:list          # List all workflows
```

## Environment Variables
Required variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side)
- Robokassa credentials for payment processing
- Stripe keys for credit card payments
- Yandex OAuth credentials
- Email service credentials (Resend/Nodemailer)

## Key Features
1. **Multi-language Support**: Full i18n with RTL support for Hebrew and Arabic
2. **eSIM Package Management**: Browse, filter, and purchase eSIM data packages
3. **User Dashboard**: View orders, balance, and mobile data usage
4. **Payment Integration**: Robokassa for Russian payments, Stripe for international
5. **QR Code Generation**: Dynamic QR codes for eSIM activation
6. **Authentication**: Email/password, OAuth (Yandex), OTP verification
7. **Order Management**: Create, update, track pending orders
8. **Currency Conversion**: Multi-currency support with real-time conversion
9. **Package Sharing**: Share eSIM packages via unique links
10. **Admin Features**: User management, stats, transaction history

## API Routes Structure
- **Auth**: `/api/auth/*` - Login, signup, password reset, OTP, profile updates
- **Orders**: `/api/orders/*` - Create, update, pending orders
- **Users**: `/api/users/*` - List, update, delete, stats, transactions
- **Payments**: `/api/robokassa/*` - Payment processing and webhooks
- **User Data**: `/api/user/*` - Balance, mobile data usage

## Database (Supabase)
The application uses Supabase for:
- User authentication and profiles
- eSIM packages and plans
- Orders and transactions
- Currency conversions
- Real-time subscriptions

## Coding Conventions
1. **File Naming**: Use kebab-case for directories, camelCase for JS/JSX files
2. **Components**: Functional components with hooks
3. **API Routes**: Use Next.js 14 route handlers (route.js)
4. **Error Handling**: Always handle errors gracefully with user-friendly messages
5. **Security**: Never expose service role keys on client-side
6. **i18n**: Use translation keys consistently across all languages
7. **Styling**: Prefer Tailwind utility classes over custom CSS

## Common Patterns
### API Response Format
```javascript
// Success
return Response.json({ success: true, data: {...} })

// Error
return Response.json({ success: false, error: 'Error message' }, { status: 400 })
```

### Supabase Client Usage
```javascript
// Server-side (API routes)
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, serviceRoleKey)

// Client-side
import { createClientComponentClient } from '@supabase/ssr'
const supabase = createClientComponentClient()
```

### React Query
```javascript
import { useQuery, useMutation } from '@tanstack/react-query'
// Use for data fetching and mutations
```

## Important Notes
1. **Standalone Output**: The app is configured for standalone deployment (Docker, VPS)
2. **Image Optimization**: Images are served in WebP and AVIF formats
3. **Security Headers**: Custom headers for content security and permissions
4. **Old Routes**: Automatic redirects from old language routes (e.g., `/hebrew/*` → `/he/*`)
5. **Middleware**: Handles authentication and locale routing
6. **n8n Integration**: Workflow automation synced with Supabase

## Testing Payment Flows
- Test Robokassa payments in test mode before production
- Verify QR code generation after successful payment
- Check email notifications for order confirmations

## Deployment
The application is configured for Docker deployment with:
- Nginx reverse proxy
- Standalone Next.js build
- Environment-based configuration

## Troubleshooting
- **Build Errors**: Check Node.js version (use latest LTS)
- **API Errors**: Verify environment variables are set correctly
- **i18n Issues**: Ensure translation files exist for all supported languages
- **Payment Failures**: Check Robokassa/Stripe webhook configurations
- **Database Connection**: Verify Supabase credentials and network access

## Git Workflow
- Main branch: `main`
- Commit messages should be descriptive
- Test thoroughly before committing
- Keep commits focused and atomic

## Additional Resources
- Documentation in `/docs` folder
- n8n workflows for automation
- Docker configuration in `docker-compose.yml` and `Dockerfile`
