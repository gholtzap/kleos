# Post media setup

Create two signed Cloudinary upload presets and add their names to the Vercel environment:

- `CLOUDINARY_IMAGE_UPLOAD_PRESET`: allow JPEG, PNG, WebP, and GIF files; set the maximum file size to 10 MB.
- `CLOUDINARY_VIDEO_UPLOAD_PRESET`: allow MP4, MOV, WebM, and M4V files; set the maximum file size to 100 MB.

Also set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Keep the API secret server-only.

The API signs each upload for one authenticated account. It then reads the uploaded asset from Cloudinary before it stores the post. GIF delivery uses animated WebP. Video delivery uses MP4 with H.264 video and AAC audio.
