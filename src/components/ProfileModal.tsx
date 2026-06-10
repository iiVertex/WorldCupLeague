import { useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from './Toast'
import { Modal } from './Modal'
import { Avatar } from './Avatar'
import { uploadAvatar, removeAvatar } from '../lib/avatar'

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { player, refreshPlayer } = useAuth()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!player) return null

  const pick = (f: File | null) => {
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  const save = async () => {
    if (!file) return
    setBusy(true)
    try {
      await uploadAvatar(file)
      await refreshPlayer()
      toast.success('Profile picture updated!')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update picture')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await removeAvatar()
      await refreshPlayer()
      pick(null)
      toast.success('Profile picture removed.')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove picture')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Your profile" onClose={onClose}>
      <div className="flex flex-col items-center gap-4">
        <Avatar
          url={preview ?? player.avatar_url}
          name={player.display_name}
          size="lg"
        />
        <p className="text-center font-display text-lg font-bold">{player.display_name}</p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />

        <div className="flex w-full flex-col gap-2">
          <button
            className="btn-ghost w-full"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {file ? 'Choose a different photo' : 'Choose photo'}
          </button>

          {file && (
            <button className="btn-primary w-full" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save photo'}
            </button>
          )}

          {player.avatar_url && !file && (
            <button
              className="btn-ghost w-full text-red-200"
              onClick={remove}
              disabled={busy}
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
