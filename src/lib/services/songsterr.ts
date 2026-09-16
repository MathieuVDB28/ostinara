import type { SongsterrTabStructure, PlayedSection } from '@/types';
// Les deux helpers d'URL vivent a part : ils sont aussi lus par des
// composants clients, qui n'ont rien a faire du parseur Guitar Pro.
import { extractSongsterrId, getSongsterrUrl } from '@/lib/songsterr-url';

export { extractSongsterrId, getSongsterrUrl };

// New Songsterr API response format
interface SongsterrApiSong {
  songId: number;
  artistId: number;
  artist: string;
  title: string;
  hasPlayer: boolean;
  tracks: {
    instrumentId: number;
    instrument: string;
    name: string;
    tuning?: number[];
    difficulty?: number;
    hash: string;
  }[];
  defaultTrack: number;
}

interface SongsterrRevision {
  revisionId: number;
  songId: number;
  artist: string;
  title: string;
  source?: string; // URL to GP file
  tracks: {
    instrument: string;
    name: string;
    hash: string;
  }[];
}

export async function searchSongsterr(
  title: string,
  artist: string
): Promise<{ songId: number; title: string; artist: string }[]> {
  const query = `${artist} ${title}`.trim();
  if (!query) return [];

  try {
    const response = await fetch(
      `https://www.songsterr.com/api/songs?pattern=${encodeURIComponent(query)}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) return [];

    const data: SongsterrApiSong[] = await response.json();
    return data.slice(0, 10).map((s) => ({
      songId: s.songId,
      title: s.title,
      artist: s.artist,
    }));
  } catch {
    return [];
  }
}

// Fetch and parse tab structure from Songsterr by downloading the GP file
export async function fetchSongsterrTabStructure(
  songId: number
): Promise<SongsterrTabStructure | null> {
  try {
    // Step 1: Get the latest revision to find the GP file URL
    const revisionsRes = await fetch(
      `https://www.songsterr.com/api/meta/${songId}/revisions`,
      { next: { revalidate: 3600 } }
    );

    if (!revisionsRes.ok) return null;

    const revisions: SongsterrRevision[] = await revisionsRes.json();
    if (!revisions || revisions.length === 0) return null;

    const latestRevisionId = revisions[0].revisionId;

    // Step 2: Get revision details to find the GP source URL
    const revisionRes = await fetch(
      `https://www.songsterr.com/api/revision/${latestRevisionId}`,
      { next: { revalidate: 3600 } }
    );

    if (!revisionRes.ok) return null;

    const revision = await revisionRes.json() as Record<string, unknown>;
    const sourceUrl = revision.source as string | undefined;

    if (!sourceUrl) return null;

    // Step 3: Download the GP file (it's a ZIP containing XML)
    const gpRes = await fetch(sourceUrl);
    if (!gpRes.ok) return null;

    const gpBuffer = await gpRes.arrayBuffer();

    // Step 4: Parse the GP file (ZIP -> XML)
    return parseGPFile(new Uint8Array(gpBuffer));
  } catch (e) {
    console.error('Error fetching Songsterr tab structure:', e);
    return null;
  }
}

// Parse a Guitar Pro file (.gp) which is a ZIP containing score.gpif (XML)
function parseGPFile(data: Uint8Array): SongsterrTabStructure | null {
  try {
    // The GP file is a ZIP. We need to find and extract Content/score.gpif
    // ZIP files have local file headers starting with PK\x03\x04
    const xmlContent = extractFileFromZip(data, 'Content/score.gpif');
    if (!xmlContent) return null;

    return parseGPIF(xmlContent);
  } catch (e) {
    console.error('Error parsing GP file:', e);
    return null;
  }
}

// Simple ZIP file extractor - extracts a specific file from a ZIP archive
function extractFileFromZip(data: Uint8Array, targetPath: string): string | null {
  const decoder = new TextDecoder('utf-8');

  let offset = 0;
  while (offset < data.length - 4) {
    // Look for local file header signature: PK\x03\x04
    if (
      data[offset] === 0x50 &&
      data[offset + 1] === 0x4b &&
      data[offset + 2] === 0x03 &&
      data[offset + 3] === 0x04
    ) {
      // Parse local file header
      const compressionMethod = data[offset + 8] | (data[offset + 9] << 8);
      const compressedSize =
        data[offset + 18] |
        (data[offset + 19] << 8) |
        (data[offset + 20] << 16) |
        (data[offset + 21] << 24);
      const uncompressedSize =
        data[offset + 22] |
        (data[offset + 23] << 8) |
        (data[offset + 24] << 16) |
        (data[offset + 25] << 24);
      const fileNameLength = data[offset + 26] | (data[offset + 27] << 8);
      const extraFieldLength = data[offset + 28] | (data[offset + 29] << 8);

      const fileName = decoder.decode(
        data.slice(offset + 30, offset + 30 + fileNameLength)
      );
      const dataStart = offset + 30 + fileNameLength + extraFieldLength;

      if (fileName === targetPath) {
        const fileData = data.slice(dataStart, dataStart + compressedSize);

        if (compressionMethod === 0) {
          // Stored (no compression)
          return decoder.decode(fileData);
        } else if (compressionMethod === 8) {
          // Deflate - use DecompressionStream
          return decompressDeflate(fileData, uncompressedSize);
        }
        return null;
      }

      // Skip to next file
      offset = dataStart + compressedSize;
    } else {
      offset++;
    }
  }

  return null;
}

// Decompress deflate data synchronously using raw inflate
// Since we're in a server context, we can use zlib
function decompressDeflate(data: Uint8Array, _expectedSize: number): string | null {
  try {
    // Use Node.js zlib for server-side decompression
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const zlib = require('zlib');
    const result = zlib.inflateRawSync(Buffer.from(data));
    return result.toString('utf-8');
  } catch (e) {
    console.error('Decompression error:', e);
    return null;
  }
}

// Parse the GPIF XML to extract sections, tempo, and time signature
function parseGPIF(xmlContent: string): SongsterrTabStructure | null {
  try {
    // Simple XML parsing - we need to extract specific elements
    // Since we're on the server, we can use a basic approach

    // Extract BPM from first Automation with type=Tempo
    let bpm = 120;
    const tempoMatch = xmlContent.match(
      /<Automation>\s*<Type>Tempo<\/Type>\s*<Linear>[^<]*<\/Linear>\s*<Bar>\d+<\/Bar>\s*<Position>[^<]*<\/Position>\s*<Visible>[^<]*<\/Visible>\s*<Value>(\d+)/
    );
    if (tempoMatch) {
      bpm = parseInt(tempoMatch[1], 10);
    } else {
      // Fallback: try a simpler pattern
      const simpleTempoMatch = xmlContent.match(
        /<Type>Tempo<\/Type>[\s\S]*?<Value>(\d+)/
      );
      if (simpleTempoMatch) {
        bpm = parseInt(simpleTempoMatch[1], 10);
      }
    }

    // Extract time signature from first MasterBar
    let timeSignatureBeats = 4;
    let timeSignatureValue = 4;
    const timeMatch = xmlContent.match(/<Time>(\d+)\/(\d+)<\/Time>/);
    if (timeMatch) {
      timeSignatureBeats = parseInt(timeMatch[1], 10);
      timeSignatureValue = parseInt(timeMatch[2], 10);
    }

    // Count MasterBars for total measures
    const masterBarMatches = xmlContent.match(/<MasterBar>/g);
    const totalMeasures = masterBarMatches ? masterBarMatches.length : 0;

    // Extract sections from MasterBars
    // Pattern: <MasterBar>...<Section><Letter>...</Letter><Text>SectionName</Text></Section>...</MasterBar>
    const sections: PlayedSection[] = [];
    const sectionRegex =
      /<MasterBar>[\s\S]*?<\/MasterBar>/g;
    let masterBarIndex = 0;
    let match;

    // Collect all section markers with their measure index
    const markers: { name: string; measureIndex: number }[] = [];

    // Find sections within each MasterBar
    const masterBarRegex = /<MasterBar>([\s\S]*?)<\/MasterBar>/g;
    while ((match = masterBarRegex.exec(xmlContent)) !== null) {
      const barContent = match[1];
      const sectionMatch = barContent.match(
        /<Section>[\s\S]*?<Text>\s*(.*?)\s*<\/Text>[\s\S]*?<\/Section>/
      );
      if (sectionMatch && sectionMatch[1].trim()) {
        // Clean CDATA wrappers and whitespace
        let sectionName = sectionMatch[1].trim();
        sectionName = sectionName
          .replace(/<!\[CDATA\[/g, '')
          .replace(/\]\]>/g, '')
          .trim();
        if (sectionName) {
          markers.push({
            name: sectionName,
            measureIndex: masterBarIndex,
          });
        }
      }
      masterBarIndex++;
    }

    // Convert markers to sections with measure ranges
    for (let i = 0; i < markers.length; i++) {
      const startMeasure = markers[i].measureIndex + 1; // 1-based
      const endMeasure =
        i < markers.length - 1
          ? markers[i + 1].measureIndex // end before next section
          : totalMeasures;

      sections.push({
        name: markers[i].name,
        startMeasure,
        endMeasure,
      });
    }

    return {
      bpm,
      totalMeasures,
      timeSignatureBeats,
      timeSignatureValue,
      sections,
    };
  } catch (e) {
    console.error('Error parsing GPIF:', e);
    return null;
  }
}
