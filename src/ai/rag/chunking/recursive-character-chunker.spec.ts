import { RecursiveCharacterChunker } from './recursive-character-chunker';

describe('RecursiveCharacterChunker', () => {
  it('should split text into chunks with respect to chunk size and overlap', () => {
    const chunker = new RecursiveCharacterChunker(100, 20);
    const sampleText = `
      Tokyo is Japan's busy capital, mixes the ultramodern and the traditional, from neon-lit skyscrapers to historic temples.
      The opulent Meiji Shinto Shrine is known for its towering gate and surrounding woods.
      The Imperial Palace sits amid large public gardens.
      The city's many museums offer exhibits ranging from classical art to a reconstructed kabuki theater.
    `;

    const chunks = chunker.chunkText(sampleText);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].text.length).toBeLessThanOrEqual(100);
  });

  it('should handle empty or whitespace text gracefully', () => {
    const chunker = new RecursiveCharacterChunker(500, 50);
    expect(chunker.chunkText('')).toEqual([]);
    expect(chunker.chunkText('   \n  \t ')).toEqual([]);
  });
});
