import {randomUUID} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {NextResponse} from 'next/server';

export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function getExtension(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'jpg';
  if (name.endsWith('.png')) return 'png';
  if (name.endsWith('.webp')) return 'webp';
  if (name.endsWith('.gif')) return 'gif';

  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';

  return '';
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({error: 'No file was uploaded'}, {status: 400});
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        {error: 'Only JPG, PNG, WEBP, and GIF images are supported'},
        {status: 400}
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {error: 'Image file is too large (max 10MB)'},
        {status: 400}
      );
    }

    const ext = getExtension(file);
    if (!ext) {
      return NextResponse.json({error: 'Unsupported image format'}, {status: 400});
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'covers');
    await mkdir(uploadsDir, {recursive: true});

    const filename = `${Date.now()}-${randomUUID()}.${ext}`;
    const absolutePath = path.join(uploadsDir, filename);

    await writeFile(absolutePath, fileBuffer);

    return NextResponse.json({
      url: `/uploads/covers/${filename}`,
      filename,
      size: file.size,
    });
  } catch (error) {
    console.error('Cover upload failed', error);
    return NextResponse.json({error: 'Upload failed'}, {status: 500});
  }
}
