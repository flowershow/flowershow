export default function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) throw new Error("Chunk size must be greater than 0");
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
