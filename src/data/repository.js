// Single swap point. ui/ always imports `repo` from here and never knows
// which implementation is live. Stage 5: swapped to supabaseRepo — no other
// file changes needed.
export { supabaseRepo as repo } from "./supabaseRepo.js";
