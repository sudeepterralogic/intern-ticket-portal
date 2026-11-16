import { UserRole } from '../../users/user-role.enum.js';

// What `request.user` / @AuthUser() contains after JwtStrategy.validate()
export interface AuthenticatedUser {
  id: number; // user id as a NUMBER, so it matches ticket.createdById etc.
  sub: string; // same id as text (the JWT "subject")
  username: string;
  role: UserRole;
}
