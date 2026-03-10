import {randomUUID} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {NextResponse} from 'next/server';

export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

function isMp3(file: File) {
  return file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3');
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({error: 'No file was uploaded'}, {status: 400});
    }

    if (!isMp3(file)) {
      return NextResponse.json(
        {error: 'Only MP3 uploads are supported'},
        {status: 400}
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {error: 'MP3 file is too large (max 25MB)'},
        {status: 400}
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tracks');
    await mkdir(uploadsDir, {recursive: true});

    const filename = `${Date.now()}-${randomUUID()}.mp3`;
    const absolutePath = path.join(uploadsDir, filename);

    await writeFile(absolutePath, fileBuffer);

    return NextResponse.json({
      url: `/uploads/tracks/${filename}`,
      filename,
      size: file.size,
    });
  } catch (error) {
    console.error('Studio upload failed', error);
    return NextResponse.json({error: 'Upload failed'}, {status: 500});
  }
}
