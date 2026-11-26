import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    new URL(request.url).origin;

  return NextResponse.redirect(`${origin}/bookshelf?payment=returned`, 303);
}

export async function GET(request: Request) {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    new URL(request.url).origin;

  return NextResponse.redirect(`${origin}/bookshelf?payment=returned`, 302);
}
