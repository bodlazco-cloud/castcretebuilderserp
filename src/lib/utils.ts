type ClassInput = string | undefined | null | false | Record<string, boolean>;

export function cn(...inputs: ClassInput[]): string {
  return inputs
    .flatMap((input) => {
      if (!input) return [];
      if (typeof input === "string") return [input];
      return Object.entries(input).filter(([, v]) => v).map(([k]) => k);
    })
    .join(" ");
}
