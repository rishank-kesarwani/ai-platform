export interface ChunkResult {
  chunkIndex: number;
  text: string;
}

export class RecursiveCharacterChunker {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;
  private readonly separators: string[];

  constructor(
    chunkSize = 800,
    chunkOverlap = 150,
    separators: string[] = ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' ', ''],
  ) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
    this.separators = separators;
  }

  chunkText(text: string): ChunkResult[] {
    if (!text || text.trim().length === 0) return [];

    const normalizedText = text.replace(/\r\n/g, '\n').trim();
    if (normalizedText.length <= this.chunkSize) {
      return [{ chunkIndex: 0, text: normalizedText }];
    }

    const rawPieces = this.splitRecursively(normalizedText, this.separators);
    const chunks: ChunkResult[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const piece of rawPieces) {
      const prospective = currentChunk ? `${currentChunk} ${piece}`.trim() : piece;

      if (prospective.length <= this.chunkSize) {
        currentChunk = prospective;
      } else {
        if (currentChunk.trim().length > 0) {
          chunks.push({
            chunkIndex,
            text: currentChunk.trim(),
          });
          chunkIndex++;
        }

        // Handle overlap
        if (this.chunkOverlap > 0 && currentChunk.length > this.chunkOverlap) {
          const overlapText = currentChunk.slice(-this.chunkOverlap).trim();
          const withOverlap = `${overlapText} ${piece}`.trim();
          if (withOverlap.length <= this.chunkSize) {
            currentChunk = withOverlap;
          } else {
            currentChunk = piece.length <= this.chunkSize ? piece : piece.substring(0, this.chunkSize);
          }
        } else {
          currentChunk = piece.length <= this.chunkSize ? piece : piece.substring(0, this.chunkSize);
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        chunkIndex,
        text: currentChunk.trim(),
      });
    }

    return chunks;
  }

  private splitRecursively(text: string, separators: string[]): string[] {
    if (text.length <= this.chunkSize || separators.length === 0) {
      return [text];
    }

    const separator = separators[0];
    const remainingSeparators = separators.slice(1);

    const parts = separator === '' ? text.split('') : text.split(separator);
    const results: string[] = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.length <= this.chunkSize) {
        results.push(trimmed);
      } else {
        const subParts = this.splitRecursively(trimmed, remainingSeparators);
        results.push(...subParts);
      }
    }

    return results;
  }
}
