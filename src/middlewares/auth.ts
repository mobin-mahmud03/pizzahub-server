import { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { User, IUser, UserRole } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: IUser;
}

// Cache the JWKS fetcher at module level — createRemoteJWKSet already caches
// the key set internally and re-fetches only when a new kid is encountered.
// CLIENT_URL must equal the deployed Next.js client URL (e.g. http://localhost:3000).
// Better Auth's jwt() plugin exposes the JWKS at <baseURL>/api/auth/jwks.
const getJWKS = () => {
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl) {
    throw new Error('CLIENT_URL environment variable is required for JWKS verification');
  }
  return createRemoteJWKSet(new URL(`${clientUrl}/api/auth/jwks`));
};

// Lazy singleton — created on first request so the env var is available.
let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Initialise JWKS on first use
    if (!JWKS) {
      JWKS = getJWKS();
    }

    let payload: Record<string, unknown>;
    try {
      const result = await jwtVerify(token, JWKS);
      payload = result.payload as Record<string, unknown>;
    } catch (err: any) {
      // jose throws JWTExpired for expired tokens; everything else is invalid
      if (err?.code === 'ERR_JWT_EXPIRED') {
        res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
      } else {
        res.status(401).json({ success: false, message: 'Authentication failed. Invalid token.' });
      }
      return;
    }

    // Better Auth jwt() plugin sets sub = user id; fall back to a custom 'id' field
    // if definePayload mapped it differently.
    const userId = (payload.sub ?? payload.id) as string | undefined;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Invalid token: missing user identifier.' });
      return;
    }

    // Always load the user from the database — never trust role from the token.
    // Better Auth stores _id (and sometimes an 'id' string field). Query both to be safe.
    let user = await User.findById(userId);
    if (!user) {
      user = await User.findOne({ id: userId });
    }
    if (!user) {
      res.status(401).json({ success: false, message: 'User account not found.' });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({
        success: false,
        message: 'Your account has been blocked. You cannot access protected features.',
      });
      return;
    }

    // Auto-downgrade expired premium subscriptions on the next authenticated request.
    if (
      user.subscriptionPlan === 'premium' &&
      user.subscriptionExpiresAt &&
      user.subscriptionExpiresAt < new Date()
    ) {
      user.subscriptionPlan = 'free';
      await user.save();
    }

    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({ success: false, message: 'Authentication failed. Invalid token.' });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}] role(s).`,
      });
      return;
    }

    next();
  };
};
