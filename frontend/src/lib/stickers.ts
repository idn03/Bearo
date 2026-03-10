import chillBear from "@/assets/stickers/chill-bear.svg"
import fishingBear from "@/assets/stickers/fishing-bear.svg"
import lieDownBear from "@/assets/stickers/lie-down-bear.svg"
import onlyHeadBear from "@/assets/stickers/only-head-bear.svg"
import sittingBear from "@/assets/stickers/sitting-bear.svg"
import worryBear from "@/assets/stickers/worry-bear.svg"

const STICKERS = [
  chillBear,
  fishingBear,
  lieDownBear,
  onlyHeadBear,
  sittingBear,
  worryBear,
]

/**
 * Returns a deterministic sticker for a given todo ID.
 * Uses a simple hash so the same todo always gets the same sticker.
 */
export function getStickerForId(id: string): typeof chillBear {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
  }
  return STICKERS[Math.abs(hash) % STICKERS.length]
}
