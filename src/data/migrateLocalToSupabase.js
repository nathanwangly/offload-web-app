// Runs once right after the first successful sign-in: carries any tasks and
// settings already sitting in localStorage up into Supabase, so signing in
// doesn't wipe out data that predates having an account. Reads localRepo
// directly (not via repository.js's `repo`, which now points at Supabase).
import { localRepo } from "./localRepo.js";
import { supabaseRepo } from "./supabaseRepo.js";

const MIGRATED_FLAG = "taskTracker/migratedToSupabase";

export async function migrateLocalToSupabaseIfNeeded() {
  if (localStorage.getItem(MIGRATED_FLAG)) return;

  const [localTasks, localSettings] = await Promise.all([
    localRepo.listTasks(),
    localRepo.getSettings(),
  ]);

  for (const task of localTasks) {
    await supabaseRepo.createTask({
      name: task.name,
      category: task.category,
      emoji: task.emoji,
      frequencyAmount: task.frequencyAmount,
      frequencyUnit: task.frequencyUnit,
      completions: task.completions,
    });
  }
  await supabaseRepo.saveSettings(localSettings);

  localStorage.setItem(MIGRATED_FLAG, "true");
}
