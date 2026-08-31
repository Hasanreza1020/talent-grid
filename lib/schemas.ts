/**
 * Validation schemas, shared between the admin forms and the Server Actions
 * they submit to. One definition means the browser and the server can never
 * disagree about what a valid creator record is.
 */

import { z } from "zod";
import {
  CONTACT_TYPES,
  CREATOR_STATUSES,
  DATA_CONFIDENCES,
  DELIVERABLES,
  GENDERS,
  LANGUAGES,
  PLATFORMS,
  PREFERRED_CHANNELS,
  RATE_PLATFORMS,
  SNAPSHOT_SOURCES,
  USER_ROLES,
} from "./types";

/** Empty strings from HTML forms mean "not provided", not "empty value". */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable();

const optionalInt = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  })
  .refine((value) => value === null || value >= 0, {
    message: "Must be zero or more.",
  });

export const identitySchema = z.object({
  displayName: z.string().trim().min(1, "A display name is required."),
  legalName: optionalText,
  bioShort: z
    .string()
    .trim()
    .max(160, "The short bio is used on cards and is capped at 160 characters.")
    .transform((value) => (value === "" ? null : value))
    .nullable(),
  bioLong: optionalText,
  city: optionalText,
  country: z.string().trim().min(1).default("Bangladesh"),
  gender: z.enum(GENDERS),
  primaryLanguage: z.enum(LANGUAGES),
  status: z.enum(CREATOR_STATUSES),
  dataConfidence: z.enum(DATA_CONFIDENCES),
  acceptsBarter: z.boolean().nullable(),
  typicalTurnaroundDays: optionalInt,
});

export const accountSchema = z.object({
  id: z.string().uuid().optional(),
  platform: z.enum(PLATFORMS),
  handle: optionalText,
  profileUrl: z.url("Enter a full URL, including https://"),
  verifiedBadge: z.boolean().default(false),
});

export const snapshotSchema = z.object({
  accountId: z.string().uuid(),
  capturedOn: z.iso.date("Pick the date these figures were read."),
  followers: optionalInt,
  avgViews: optionalInt,
  avgLikes: optionalInt,
  avgComments: optionalInt,
  avgShares: optionalInt,
  postsLast30d: optionalInt,
  source: z.enum(SNAPSHOT_SOURCES).default("manual"),
});

export const rateCardSchema = z.object({
  id: z.string().uuid().optional(),
  platform: z.enum(RATE_PLATFORMS),
  deliverable: z.enum(DELIVERABLES),
  priceBdt: z.coerce.number().int().min(0, "Rates are whole taka amounts."),
  negotiable: z.boolean().default(true),
  notes: optionalText,
  effectiveFrom: z.iso.date(),
});

export const contactSchema = z.object({
  id: z.string().uuid().optional(),
  contactType: z.enum(CONTACT_TYPES),
  name: optionalText,
  phone: optionalText,
  whatsapp: optionalText,
  email: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .refine((value) => value === null || z.email().safeParse(value).success, {
      message: "Enter a valid email address.",
    }),
  preferredChannel: z.enum(PREFERRED_CHANNELS),
  isPrimary: z.boolean().default(false),
});

export const internalNoteSchema = z.object({
  body: z.string().trim().min(1, "Write the note before saving it."),
  professionalism: z.coerce.number().int().min(1).max(5).nullable(),
  responsiveness: z.coerce.number().int().min(1).max(5).nullable(),
  punctuality: z.coerce.number().int().min(1).max(5).nullable(),
});

export const categoryAssignmentSchema = z.object({
  primaryCategoryId: z.string().uuid("Choose a primary category."),
  secondaryCategoryIds: z.array(z.string().uuid()).default([]),
  tagIds: z.array(z.string().uuid()).default([]),
});

export const creatorFormSchema = z.object({
  identity: identitySchema,
  accounts: z.array(accountSchema).default([]),
  categories: categoryAssignmentSchema,
  rates: z.array(rateCardSchema).default([]),
  contacts: z.array(contactSchema).default([]),
});

export type CreatorFormValues = z.infer<typeof creatorFormSchema>;
export type IdentityValues = z.infer<typeof identitySchema>;
export type AccountValues = z.infer<typeof accountSchema>;
export type RateCardValues = z.infer<typeof rateCardSchema>;
export type ContactValues = z.infer<typeof contactSchema>;
export type SnapshotValues = z.infer<typeof snapshotSchema>;

export const roleUpdateSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(USER_ROLES),
});

export const bulkStatusSchema = z.object({
  creatorIds: z.array(z.string().uuid()).min(1),
  status: z.enum(CREATOR_STATUSES),
});

export const bulkCategorySchema = z.object({
  creatorIds: z.array(z.string().uuid()).min(1),
  categoryId: z.string().uuid(),
});
