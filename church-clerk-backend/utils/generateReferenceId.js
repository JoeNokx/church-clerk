import Counter from "../models/counterModel.js";

/**
 * Generates a unique, human-readable reference ID.
 * Format: PREFIX-YYYY-XXXXXX  e.g. TTH-2026-000184
 *
 * Uses an atomic counter document per prefix+year to avoid race conditions.
 *
 * @param {string} prefix  3-letter module prefix (TTH, EXP, OFR, etc.)
 * @returns {Promise<string>}
 */
export async function generateReferenceId(prefix) {
  const year = new Date().getFullYear();
  const counterId = `${prefix}-${year}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seq = String(counter.seq).padStart(6, "0");
  return `${prefix}-${year}-${seq}`;
}
