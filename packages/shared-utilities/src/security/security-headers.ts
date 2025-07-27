import helmet from 'helmet';
import { Express } from 'express';

export function setupSecurityHeaders(app: Express) {
  // Basic security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.yggdrasil.edu'],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'no-referrer' },
      xssFilter: true,
    }),
  );

  // Additional security headers
  app.use((req, res, next) => {
    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');

    // Additional CSP for API
    if (req.path.startsWith('/api')) {
      res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
    }

    // CORP headers
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    // Expect-CT
    res.setHeader('Expect-CT', 'max-age=86400, enforce');

    next();
  });
}

// CORS configuration
export function setupCORS(app: Express) {
  const cors = require('cors');

  const corsOptions = {
    origin: function (origin: string, callback: Function) {
      const allowedOrigins = (process.env['ALLOWED_ORIGINS'] || '')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);

      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'X-API-Key',
    ],
    exposedHeaders: ['X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 86400, // 24 hours
  };

  app.use(cors(corsOptions));
}
