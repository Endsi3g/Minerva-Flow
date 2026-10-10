import type { FileError } from "react-dropzone";

/** Derived validation keeps File methods usable when removing excess files. */
export function normalizeFileCount<T extends File & { errors: readonly FileError[] }>(
  files: readonly T[],
  maxFiles: number
): T[] {
  return files.map((file) => {
    const errors = file.errors.filter((error) => error.code !== "too-many-files");
    if (maxFiles > 0 && files.length > maxFiles) {
      errors.push({ code: "too-many-files", message: `Maximum ${maxFiles} file(s).` });
    }
    if (errors.length === file.errors.length && errors.every((error, i) => error === file.errors[i])) return file;
    const copy = new File([file], file.name, { type: file.type, lastModified: file.lastModified });
    return Object.assign(copy, { ...file, errors }) as T;
  });
}
