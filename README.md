# B2B Portal Documentation

## Project Context
The 2D Chápeus B2B Wholesale Portal is a Next.js App Router project leveraging Firebase for Authentication and Firestore.

## Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure Environment:**
   Copy `.env.example` to `.env.local` and add your Firebase credentials.
   Make sure you activate Identity Platform (Email/Password) inside the Firebase Console.

3. **Run development server:**
   ```bash
   pnpm run dev
   ```

## Security & RBAC (Permissions)
See `firestore.rules` for the backend source of truth.

- **Cliente:** Only users with `status: "ativo"` and `role: "cliente"` can browse `/app` and place orders. They require their registrations to be approved before log in works. They can only read/write their own orders based on the `uid` matching logic in Firestore.
- **Equipe:** Sales/Operations team. Can see `/admin` routes but cannot perform destructive actions (like Delete) or mutate Settings (global selects).
- **Admin:** Master user. Can manage settings, mutate user roles, delete records.

## Data Model
See `DATA_MODEL.md` in the artifacts for a complete breakdown of Collections.

## Deployment to Vercel
1. Link your GitHub repository.
2. Under "Environment Variables", inject everything from `.env.local`.
3. Set the Framework Preset to "Next.js".
4. Build Command: `next build`
5. Deploy.
