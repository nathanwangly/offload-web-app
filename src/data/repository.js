// Single swap point. ui/ always imports `repo` from here and never knows
// which implementation is live. Stage 5 swaps this line for supabaseRepo —
// no other file changes.
export { localRepo as repo } from "./localRepo.js";
