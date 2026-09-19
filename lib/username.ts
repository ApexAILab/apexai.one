export function normalizeUsername(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
}
