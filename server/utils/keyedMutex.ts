// Runs tasks that share a key one after another (per process). Website saves use it so an autosave
// and a publish for the same company can't read the document, upload photos and then both try to
// save it - the second save fails with a Mongoose VersionError ("No matching document found ... version N").
const tails = new Map<string, Promise<void>>();

export const runExclusive = async <T>(key: string, task: () => Promise<T>): Promise<T> => {
  if (!key) return task();
  const previous = tails.get(key) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => current);
  tails.set(key, tail);
  await previous;
  try {
    return await task();
  } finally {
    release();
    if (tails.get(key) === tail) tails.delete(key);
  }
};
