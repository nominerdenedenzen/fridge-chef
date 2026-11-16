import 'server-only';

// Facebook Graph API: post a photo with a caption to YOUR Facebook Page.
// Setup: Meta developer app -> test Page -> Graph API Explorer -> permissions
// pages_manage_posts + pages_show_list -> GET /me/accounts -> copy the Page access token.
// In development mode only app admins/testers see it work; public use needs Meta app review.

export async function postPhotoToPage(imageUrl: string, caption: string): Promise<{ id?: string; error?: string }> {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_TOKEN;
  const version = process.env.FB_GRAPH_VERSION || 'v26.0';
  if (!pageId || !token) return { error: 'FB_PAGE_ID or FB_PAGE_TOKEN is not set' };

  const body = new URLSearchParams({ url: imageUrl, caption, access_token: token });
  const res = await fetch(`https://graph.facebook.com/${version}/${pageId}/photos`, {
    method: 'POST',
    body,
  });
  const data = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok) return { error: data.error?.message ?? `Facebook error ${res.status}` };
  return { id: data.id };
}
