import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.xlsx', '.xls', '.docx', '.doc', '.csv', '.txt']);

const uploadDir = () => resolve(process.env.UPLOAD_DIR ?? 'uploads');

/** Writes an uploaded file under a random name; the original name must only ever be used as a download name. */
export async function saveUpload(file: Express.Multer.File | undefined) {
  if (!file) throw new BadRequestException('Choose a file to upload');
  const ext = extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new BadRequestException(`File type ${ext || '(none)'} is not allowed`);
  const storageKey = `${randomUUID()}${ext}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(join(uploadDir(), storageKey), file.buffer);
  return { storageKey, fileName: file.originalname.slice(0, 200), mimeType: file.mimetype, size: file.size };
}

export const uploadPath = (storageKey: string) => join(uploadDir(), storageKey);

export const deleteUpload = (storageKey: string) => unlink(uploadPath(storageKey)).catch(() => undefined);
