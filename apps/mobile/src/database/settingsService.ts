import { settingsInput } from "@memocycle/contracts";
import { all, save } from "./repository";
export async function updateSettings(
  userId: string,
  patch: Record<string, unknown>,
) {
  const current = (await all("userSettings", userId))[0];
  if (!current)
    throw new Error("Connecte-toi à Internet pour initialiser ton compte.");
  const data = settingsInput.parse(
    Object.fromEntries(
      Object.keys(settingsInput.shape).map((k) => [
        k,
        k in patch ? patch[k] : current[k],
      ]),
    ),
  );
  await save("userSettings", userId, data, current.id);
}
