export async function embedLogoSrc(logoUrl?: string | null): Promise<string | null> {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('data:')) return logoUrl;

  const absoluteUrl = logoUrl.startsWith('/')
    ? `${process.env.STORAGE_PUBLIC_BASE_URL ?? 'http://localhost:3000/api/v1/storage/files'}${logoUrl}`
    : logoUrl;

  try {
    const response = await fetch(absoluteUrl, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return logoUrl;

    const contentType = response.headers.get('content-type')?.split(';')[0] ?? guessMime(logoUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return logoUrl;
  }
}

function guessMime(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'image/png';
  }
}
