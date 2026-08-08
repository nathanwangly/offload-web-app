// Single swap point. ui/ always imports `repo` from here and never knows
// which implementation is live. Stage 3 swaps this line for localRepo,
// Stage 5 for supabaseRepo — no other file changes.
export { fixtureRepo as repo } from "./fixtureRepo.js";
