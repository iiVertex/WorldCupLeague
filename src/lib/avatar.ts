import { supabase } from './supabase'

const MAX_INPUT_BYTES = 10 * 1024 * 1024 // 10 MB raw input cap
const TARGET_SIZE = 192 // square px the avatar is downscaled to
const JPEG_QUALITY = 0.82

/**
 * Load a File into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image.'))
    }
    img.src = url
  })
}

/**
 * Center-crop to a square, downscale to TARGET_SIZE, and return a compact
 * JPEG data URL. Small enough (~10-20 KB) to store directly on the player row,
 * which avoids Supabase Storage and its auth/RLS edge cases entirely.
 */
async function resizeToDataUrl(file: File): Promise<string> {
  const img = await loadImage(file)
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  const sx = (img.naturalWidth - side) / 2
  const sy = (img.naturalHeight - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = TARGET_SIZE
  canvas.height = TARGET_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process that image.')
  ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE)

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

/**
 * Resize the chosen image and persist it on the current user's profile.
 * Returns the data URL. Uses the same authenticated RPC path as predictions.
 */
export async function uploadAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('That image is too large (max 10 MB).')
  }

  const dataUrl = await resizeToDataUrl(file)

  const { error } = await supabase.rpc('set_my_avatar', { p_url: dataUrl })
  if (error) throw error

  return dataUrl
}

/**
 * Clear the current user's avatar.
 */
export async function removeAvatar(): Promise<void> {
  const { error } = await supabase.rpc('set_my_avatar', { p_url: null })
  if (error) throw error
}
