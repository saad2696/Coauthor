import { z } from "zod";

/** Passwordless signup input: name + email (backend sets a password, then a
 * reset email lets the user choose their own). */
export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
});

export type SignupInput = z.infer<typeof signupSchema>;
