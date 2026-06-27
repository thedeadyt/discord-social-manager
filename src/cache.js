// In-memory cache for n8n pushed data
export const cache = {
  lastPreview: null,   // { title, caption, platform, image_url, scheduled_at, timestamp }
  lastDigest: null,    // { content, timestamp }
};
