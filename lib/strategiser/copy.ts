import { Moon, Rocket, Smartphone, Wallet } from "lucide-react";

/**
 * The strings and starter briefs shared by the home hero and the strategiser.
 *
 * Both pages show the same proposition, so it lives once. Duplicated in two
 * files it would drift the first time either was edited, and a headline that
 * changes when you follow your own call to action is worse than either version.
 */
export const PROMPT_HEADLINE = "Describe the campaign. Get the creators.";

export function promptSubline(rosterSize: number): string {
  return `Tell us what you sell, what you want to achieve and what you can spend. We build the shortlist from ${rosterSize} creators on file.`;
}

export const PROMPT_PLACEHOLDER =
  "We make affordable skincare for women 18 to 30. We're launching a new serum next month, budget around 200000 BDT, looking for about 6 creators.";

export const STARTER_CHIPS = [
  {
    label: "Product launch",
    Icon: Rocket,
    brief:
      "We make affordable skincare for women 18 to 30. We're launching a new serum next month and want people talking about it before it lands. Budget around 200000 BDT, looking for about 6 creators.",
  },
  {
    label: "Ramadan campaign",
    Icon: Moon,
    brief:
      "We're a local food delivery app. We want a Ramadan campaign around iftar ordering, aimed at families in Dhaka. Budget 300000 BDT, around 8 creators.",
  },
  {
    label: "App installs",
    Icon: Smartphone,
    brief:
      "We have a Bangla learning app for school students. The goal is installs, not awareness. Budget 100000 BDT, 5 creators.",
  },
  {
    label: "Small budget test",
    Icon: Wallet,
    brief:
      "We sell handmade jewellery on Facebook. We've never worked with creators and want to try it cheaply first. Budget 40000 BDT, 3 creators.",
  },
] as const;

/**
 * Where a brief written on the home page waits while the browser navigates.
 *
 * sessionStorage rather than a query parameter: briefs run to several hundred
 * characters, which makes for an ugly and breakable link, and it survives the
 * redirect through the login wall for free. Losing someone's typed brief at a
 * sign-in form is the fastest way to lose the person.
 */
export const HANDOFF_KEY = "grid.strategiser.brief";

export function isUsableBrief(text: string): boolean {
  return text.trim().split(/\s+/).filter(Boolean).length >= 4;
}
