import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./env";
import {
  findUserByGoogleId,
  findUserByEmail,
  createGoogleUser,
  linkGoogleAccount,
} from "../repositories/userRepository";

passport.use(
  new GoogleStrategy(
    {
      clientID: env.googleClientId,
      clientSecret: env.googleClientSecret,
      callbackURL: `${env.backendUrl}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || "";
        const fullName = profile.displayName || "Google User";
        const avatarUrl = profile.photos?.[0]?.value || null;

        let user = await findUserByGoogleId(googleId);
        if (!user && email) {
          user = await findUserByEmail(email);
        }

        if (user && !user.google_id) {
          if (!user.is_email_verified) {
            return done(new Error("EMAIL_NOT_VERIFIED"));
          }
          user = await linkGoogleAccount(user.id, googleId, avatarUrl);
        }

        if (!user) {
          user = await createGoogleUser({
            email,
            fullName,
            googleId,
            avatarUrl,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

export default passport;
