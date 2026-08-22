import "server-only";
import mongoose, { Schema } from "mongoose";
import dbConnect from "@/lib/mongodb";
import { logger } from "@/lib/logger";
// LOCAL-DEV-ONLY: remove before production deploy (see local-counters.ts).
import { localReadCounters, localReadPairCounts, localRecordComparison } from "./local-counters";

/**
 * `dbConnect` resolves even when the driver never reached a server, so check
 * the connection state before issuing a query — otherwise every read waits out
 * the driver's buffering timeout before failing.
 */
function isStoreReachable(): boolean {
  return mongoose.connection.readyState === 1;
}

// Durable, server-side counters behind the Compare page's four-tile strip
// (Developers Compared / Repos Analysed / Languages Tracked / Comparisons
// Today) and the "HOT" ordering of the Trending Showdowns carousel.
//
// Colocated with the compare routes rather than living in `lib/` or
// `services/`, matching the sanctioned route-folder-helper pattern already
// used by `app/api/streak/validation-cache.ts` — nothing outside
// `app/api/compare/*` reads these.
//
// Every document id is prefixed with the deploy environment, so local
// development accumulates its own totals and a production deploy starts from
// a genuinely clean zero without any manual reset step.
//
// Nothing in here is allowed to fail a comparison: every entry point swallows
// its errors and degrades to zeros.

const COLLECTION = "compare_counters";

/** Comparisons Today rolls over at 00:00 in this zone, by calendar date. */
const RESET_TIMEZONE = "Asia/Kolkata";

interface CounterDoc {
  _id: string;
  /** Comparisons performed (global doc = all-time, day doc = that IST date). */
  comparisons: number;
  /** Cumulative count of repositories walked while building comparisons. */
  reposAnalyzed: number;
  /** Distinct language names ever seen. Bounded by GitHub's language list. */
  languages: string[];
}

const counterSchema = new Schema<CounterDoc>(
  {
    _id: { type: String, required: true },
    comparisons: { type: Number, default: 0 },
    reposAnalyzed: { type: Number, default: 0 },
    languages: { type: [String], default: [] },
  },
  { collection: COLLECTION, versionKey: false },
);

function counterModel() {
  return (mongoose.models.CompareCounter as mongoose.Model<CounterDoc>) ?? mongoose.model<CounterDoc>("CompareCounter", counterSchema);
}

/** `production` on a live deploy, `development`/`preview` elsewhere. */
function envScope(): string {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
}

/**
 * Today's calendar date in {@link RESET_TIMEZONE} as `YYYY-MM-DD`.
 *
 * Keying the daily document by the IST calendar date — rather than arming a
 * timer — is what makes the midnight rollover survive restarts, cold starts
 * and redeploys: after 00:00 IST the route simply reads a different (absent,
 * therefore zero) document.
 */
export function istDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: RESET_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const globalId = () => `${envScope()}:global`;
const dayId = (date = istDateKey()) => `${envScope()}:day:${date}`;
const pairId = (a: string, b: string) => `${envScope()}:pair:${[a.toLowerCase(), b.toLowerCase()].sort().join("|")}`;

export interface CompareCounters {
  /** All-time comparisons performed (a repeat pairing counts again). */
  developersCompared: number;
  reposAnalyzed: number;
  languagesTracked: number;
  /** Comparisons performed since the last 00:00 IST boundary. */
  comparisonsToday: number;
}

export const ZERO_COUNTERS: CompareCounters = {
  developersCompared: 0,
  reposAnalyzed: 0,
  languagesTracked: 0,
  comparisonsToday: 0,
};

export interface RecordComparisonInput {
  userA: string;
  userB: string;
  /** Repositories walked to produce this comparison, both sides combined. */
  reposAnalyzed: number;
  /** Language names observed in this comparison, both sides combined. */
  languages: string[];
}

/**
 * Record one completed comparison. Bumps the all-time totals, the current IST
 * day, and the head-to-head tally for this pairing.
 *
 * Fire-and-forget: callers should not await this on the response path, and a
 * database outage must never surface to the user.
 */
export async function recordComparison(input: RecordComparisonInput): Promise<void> {
  const languages = [...new Set(input.languages.filter(Boolean))];

  try {
    await dbConnect();
    if (!isStoreReachable()) throw new Error("counter store unreachable");
    await counterModel().bulkWrite(
      [
        {
          updateOne: {
            filter: { _id: globalId() },
            update: {
              $inc: { comparisons: 1, reposAnalyzed: Math.max(0, input.reposAnalyzed) },
              ...(languages.length ? { $addToSet: { languages: { $each: languages } } } : {}),
            },
            upsert: true,
          },
        },
        {
          updateOne: {
            filter: { _id: dayId() },
            update: { $inc: { comparisons: 1 } },
            upsert: true,
          },
        },
        {
          updateOne: {
            filter: { _id: pairId(input.userA, input.userB) },
            update: { $inc: { comparisons: 1 } },
            upsert: true,
          },
        },
      ],
      { ordered: false },
    );
  } catch (error) {
    // LOCAL-DEV-ONLY: remove before production deploy — falls back to the
    // in-process store so the tiles still count when Mongo is unreachable.
    localRecordComparison({ ...input, languages, pairKey: pairKey(input.userA, input.userB) });
    logger.warn("Compare counters update fell back to the local store", { source: "compare", error });
  }
}

/** Current counter values. Returns zeros if the store is unreachable. */
export async function readCounters(): Promise<CompareCounters> {
  try {
    await dbConnect();
    if (!isStoreReachable()) throw new Error("counter store unreachable");
    const [global, today] = await Promise.all([
      counterModel().findById(globalId()).lean().exec(),
      counterModel().findById(dayId()).lean().exec(),
    ]);

    return {
      // Every comparison puts two developers head to head.
      developersCompared: (global?.comparisons ?? 0) * 2,
      reposAnalyzed: global?.reposAnalyzed ?? 0,
      languagesTracked: global?.languages?.length ?? 0,
      comparisonsToday: today?.comparisons ?? 0,
    };
  } catch (error) {
    // LOCAL-DEV-ONLY: remove before production deploy.
    logger.warn("Compare counters read fell back to the local store", { source: "compare", error });
    return localReadCounters();
  }
}

/**
 * Head-to-head counts for the given pairings, keyed `"<a>|<b>"` with the two
 * logins lowercased and sorted. Drives which Trending Showdowns cards are
 * flagged HOT and the order they slide past in. Unreachable store → empty map,
 * and the carousel falls back to its curated order.
 */
export async function readPairCounts(pairs: [string, string][]): Promise<Record<string, number>> {
  if (pairs.length === 0) return {};

  try {
    await dbConnect();
    if (!isStoreReachable()) throw new Error("counter store unreachable");
    const ids = pairs.map(([a, b]) => pairId(a, b));
    const docs = await counterModel()
      .find({ _id: { $in: ids } })
      .lean()
      .exec();

    const counts: Record<string, number> = {};
    for (const doc of docs) {
      // Strip the `<env>:pair:` prefix back off so callers key by the pairing.
      counts[doc._id.slice(doc._id.indexOf(":pair:") + ":pair:".length)] = doc.comparisons ?? 0;
    }
    return counts;
  } catch (error) {
    // LOCAL-DEV-ONLY: remove before production deploy.
    logger.warn("Compare pair counts read fell back to the local store", { source: "compare", error });
    return localReadPairCounts(pairs.map(([a, b]) => pairKey(a, b)));
  }
}

/** The `"<a>|<b>"` key {@link readPairCounts} returns a pairing under. */
export function pairKey(a: string, b: string): string {
  return [a.toLowerCase(), b.toLowerCase()].sort().join("|");
}
