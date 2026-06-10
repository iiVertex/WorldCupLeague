import type { LeaderboardRow } from '../types'
import { Modal } from './Modal'
import { Leaderboard } from './Leaderboard'

export function LeaderboardModal({
  rows,
  currentPlayerId,
  onClose,
}: {
  rows: LeaderboardRow[]
  currentPlayerId?: string
  onClose: () => void
}) {
  return (
    <Modal title="🏆 Leaderboard" onClose={onClose} className="max-w-lg">
      <div className="max-h-[70vh] overflow-y-auto">
        <Leaderboard rows={rows} currentPlayerId={currentPlayerId} />
      </div>
    </Modal>
  )
}
