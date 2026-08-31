/**
 * Domain types.
 *
 * The database is snake_case and TypeScript is camelCase. `lib/mapping.ts` is
 * the single layer that converts between them; nothing else should be doing
 * key translation by hand.
 */

export const PLATFORMS = ["facebook", "instagram", "tiktok", "youtube"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const RATE_PLATFORMS = [...PLATFORMS, "cross_platform"] as const;
export type RatePlatform = (typeof RATE_PLATFORMS)[number];

export const TIERS = ["nano", "micro", "mid", "macro", "mega"] as const;
export type Tier = (typeof TIERS)[number];

export const CREATOR_STATUSES = ["active", "inactive", "unreachable", "blacklisted"] as const;
export type CreatorStatus = (typeof CREATOR_STATUSES)[number];

export const GENDERS = ["male", "female", "other", "undisclosed"] as const;
export type Gender = (typeof GENDERS)[number];

export const LANGUAGES = ["bangla", "english", "mixed"] as const;
export type Language = (typeof LANGUAGES)[number];

export const DATA_CONFIDENCES = ["unverified", "partial", "verified"] as const;
export type DataConfidence = (typeof DATA_CONFIDENCES)[number];

export const CREATOR_SOURCES = ["legacy_import", "manual", "api"] as const;
export type CreatorSource = (typeof CREATOR_SOURCES)[number];

export const SNAPSHOT_SOURCES = ["manual", "media_kit", "api", "legacy_import"] as const;
export type SnapshotSource = (typeof SNAPSHOT_SOURCES)[number];

export const DELIVERABLES = [
  "reel",
  "short_video",
  "long_video",
  "story_set",
  "static_post",
  "carousel",
  "live",
  "event_appearance",
  "ugc_only",
  "package",
] as const;
export type Deliverable = (typeof DELIVERABLES)[number];

export const CONTACT_TYPES = ["creator", "manager", "agency"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const PREFERRED_CHANNELS = ["whatsapp", "phone", "email", "instagram_dm"] as const;
export type PreferredChannel = (typeof PREFERRED_CHANNELS)[number];

export const USER_ROLES = ["admin", "editor", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Display labels. Sentence case everywhere; no ALL-CAPS labels.
export const PLATFORM_LABEL: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export const RATE_PLATFORM_LABEL: Record<RatePlatform, string> = {
  ...PLATFORM_LABEL,
  cross_platform: "Cross platform",
};

export const TIER_LABEL: Record<Tier, string> = {
  nano: "Nano",
  micro: "Micro",
  mid: "Mid",
  macro: "Macro",
  mega: "Mega",
};

export const TIER_RANGE_LABEL: Record<Tier, string> = {
  nano: "Under 10k followers",
  micro: "10k to 100k followers",
  mid: "100k to 500k followers",
  macro: "500k to 1m followers",
  mega: "1m followers and above",
};

export const STATUS_LABEL: Record<CreatorStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  unreachable: "Unreachable",
  blacklisted: "Blacklisted",
};

export const DELIVERABLE_LABEL: Record<Deliverable, string> = {
  reel: "Reel",
  short_video: "Short video",
  long_video: "Long video",
  story_set: "Story set",
  static_post: "Static post",
  carousel: "Carousel",
  live: "Live",
  event_appearance: "Event appearance",
  ugc_only: "UGC only",
  package: "Package",
};

export const LANGUAGE_LABEL: Record<Language, string> = {
  bangla: "Bangla",
  english: "English",
  mixed: "Mixed",
};

export const GENDER_LABEL: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  undisclosed: "Undisclosed",
};

export const DATA_CONFIDENCE_LABEL: Record<DataConfidence, string> = {
  unverified: "Unverified",
  partial: "Partly verified",
  verified: "Verified",
};

export const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  creator: "Creator",
  manager: "Manager",
  agency: "Agency",
};

export const PREFERRED_CHANNEL_LABEL: Record<PreferredChannel, string> = {
  whatsapp: "WhatsApp",
  phone: "Phone",
  email: "Email",
  instagram_dm: "Instagram DM",
};

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

// Domain shapes ---------------------------------------------------------------

export type MetricSnapshot = {
  id: string;
  accountId: string;
  capturedOn: string;
  followers: number | null;
  avgViews: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  avgShares: number | null;
  postsLast30d: number | null;
  engagementRate: number | null;
  source: SnapshotSource;
};

export type Account = {
  id: string;
  creatorId: string;
  platform: Platform;
  handle: string | null;
  profileUrl: string;
  isPrimary: boolean;
  verifiedBadge: boolean;
  latest: MetricSnapshot | null;
};

export type CategoryRef = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isPrimary: boolean;
};

export type TagRef = { id: string; label: string; slug: string };

export type RateCard = {
  id: string;
  creatorId: string;
  platform: RatePlatform;
  deliverable: Deliverable;
  priceBdt: number;
  negotiable: boolean;
  notes: string | null;
  effectiveFrom: string;
};

export type Contact = {
  id: string;
  creatorId: string;
  contactType: ContactType;
  name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  preferredChannel: PreferredChannel;
  isPrimary: boolean;
};

export type Collaboration = {
  id: string;
  creatorId: string;
  clientName: string;
  campaignName: string | null;
  deliverables: string | null;
  /** Null for viewers, who are not permitted to see fees. */
  feeBdt: number | null;
  feeVisible: boolean;
  ranOn: string | null;
  deliveredViews: number | null;
  deliveredEngagementRate: number | null;
  wasOurCampaign: boolean;
  postUrl: string | null;
};

export type BrandConflict = {
  id: string;
  creatorId: string;
  brandName: string;
  conflictCategory: string | null;
  exclusiveUntil: string | null;
  notes: string | null;
};

export type ContentSample = {
  id: string;
  creatorId: string;
  accountId: string | null;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  views: number | null;
  isFeatured: boolean;
};

export type InternalNote = {
  id: string;
  creatorId: string;
  authorId: string | null;
  authorName: string | null;
  body: string;
  professionalism: number | null;
  responsiveness: number | null;
  punctuality: number | null;
  createdAt: string;
};

export type AudienceProfile = {
  id: string;
  accountId: string;
  capturedOn: string;
  ageBrackets: Record<string, number> | null;
  genderSplit: Record<string, number> | null;
  topCities: { city: string; percent: number }[] | null;
  topCountries: { country: string; percent: number }[] | null;
  authenticityScore: number | null;
};

export type Creator = {
  id: string;
  slug: string;
  displayName: string;
  legalName: string | null;
  bioShort: string | null;
  bioLong: string | null;
  portraitUrl: string | null;
  coverUrl: string | null;
  gender: Gender;
  city: string | null;
  country: string;
  primaryLanguage: Language;
  tier: Tier | null;
  primaryPlatform: Platform | null;
  status: CreatorStatus;
  acceptsBarter: boolean | null;
  typicalTurnaroundDays: number | null;
  dataConfidence: DataConfidence;
  source: CreatorSource;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** A creator with everything the browse grid and compare table need. */
export type CreatorWithRelations = Creator & {
  accounts: Account[];
  categories: CategoryRef[];
  tags: TagRef[];
  rateCards: RateCard[];
  conflicts: BrandConflict[];
};

export type AppUser = {
  id: string;
  fullName: string | null;
  role: UserRole;
};
