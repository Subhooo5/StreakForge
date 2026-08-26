import "server-only";
import mongoose, { Schema } from "mongoose";
import dbConnect from "@/lib/mongodb";
import { logger } from "@/lib/logger";

function isStoreReachable(): boolean {
  return mongoose.connection.readyState === 1;
}

const COLLECTION = "compare_counters";

const RESET_TIMEZONE = "Asia/Kolkata";

interface CounterDoc {
  _id: string;
  comparisons: number;
  reposAnalyzed: number;
  languagesTracked: number;
}

const counterSchema = new Schema<CounterDoc>(
  {
    _id: { type: String, required: true },
    comparisons: { type: Number, default: 0 },
    reposAnalyzed: { type: Number, default: 0 },
    languagesTracked: { type: Number, default: 0 },
  },
  { collection: COLLECTION, versionKey: false },
);

function counterModel() {
  return (mongoose.models.CompareCounter as mongoose.Model<CounterDoc>) ?? mongoose.model<CounterDoc>("CompareCounter", counterSchema);
}

function envScope(): string {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
}

export function istDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: RESET_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const globalId = () => `${envScope()}:global`;
const dayId = (date = istDateKey()) => `${envScope()}:day:${date}`;
const pairId = (a: string, b: string) => `${envScope()}:pair:${[a.toLowerCase(), b.toLowerCase()].sort().join("|")}`;

export interface CompareCounters {
  developersCompared: number;
  reposAnalyzed: number;
  languagesTracked: number;
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
  reposAnalyzed: number;
  languages: string[];
}

export async function recordComparison(input: RecordComparisonInput): Promise<void> {
  const languages = new Set(input.languages.map((name) => name.trim()).filter(Boolean));

  try {
    await dbConnect();
    if (!isStoreReachable()) throw new Error("counter store unreachable");
    await counterModel().bulkWrite(
      [
        {
          updateOne: {
            filter: { _id: globalId() },
            update: {
              $inc: {
                comparisons: 1,
                reposAnalyzed: Math.max(0, input.reposAnalyzed),
                languagesTracked: languages.size,
              },
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
    logger.error("Compare counters update failed", { source: "compare", error });
  }
}

export async function readCounters(): Promise<CompareCounters> {
  try {
    await dbConnect();
    if (!isStoreReachable()) throw new Error("counter store unreachable");
    const [global, today] = await Promise.all([
      counterModel().findById(globalId()).lean().exec(),
      counterModel().findById(dayId()).lean().exec(),
    ]);

    return {
      developersCompared: (global?.comparisons ?? 0) * 2,
      reposAnalyzed: global?.reposAnalyzed ?? 0,
      languagesTracked: global?.languagesTracked ?? 0,
      comparisonsToday: today?.comparisons ?? 0,
    };
  } catch (error) {
    logger.error("Compare counters read failed", { source: "compare", error });
    throw error;
  }
}

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
      counts[doc._id.slice(doc._id.indexOf(":pair:") + ":pair:".length)] = doc.comparisons ?? 0;
    }
    return counts;
  } catch (error) {
    logger.error("Compare pair counts read failed", { source: "compare", error });
    throw error;
  }
}

export function pairKey(a: string, b: string): string {
  return [a.toLowerCase(), b.toLowerCase()].sort().join("|");
}
