const JAILBREAK_PLACE_ID = '606849621'

export function buildRobloxServerDeepLink(jobId: string): string {
  return `roblox://experiences/start?placeId=${JAILBREAK_PLACE_ID}&gameInstanceId=${jobId}`
}

export function buildRobloxGameDeepLink(placeId: string, jobId: string | null): string {
  return jobId
    ? `roblox://experiences/start?placeId=${placeId}&gameInstanceId=${jobId}`
    : `roblox://experiences/start?placeId=${placeId}`
}

export function formatServerTime(serverTime: number): string {
  const hours24 = Math.floor(serverTime)
  const minutes = Math.floor((serverTime % 1) * 60)
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function isValidCasinoCode(code: string | null | undefined): boolean {
  return typeof code === 'string' && /^\d+$/.test(code.trim())
}

export function robberyMarkerToImageName(markerName: string): string {
  return markerName === 'MoneyTruck' ? 'Bank Truck' : markerName
}

export function robberyMarkerToDisplayName(markerName: string, apiName: string): string {
  return markerName === 'MoneyTruck' ? 'Bank Truck' : apiName
}

export function robberyImageUrl(markerName: string): string {
  return `https://assets.jailbreakchangelogs.com/assets/images/robberies/${robberyMarkerToImageName(markerName)}.webp`
}

export const ROBBERY_TYPES: readonly { markerName: string; name: string }[] = [
  { markerName: 'Bank', name: 'Rising City Bank' },
  { markerName: 'CargoPlane', name: 'Cargo Plane' },
  { markerName: 'CargoShip', name: 'Cargo Ship' },
  { markerName: 'Casino', name: 'Crown Jewel' },
  { markerName: 'Jewelry', name: 'Jewelry Store' },
  { markerName: 'Grocery', name: 'Grocery Store' },
  { markerName: 'Mansion', name: 'Mansion' },
  { markerName: 'MoneyTruck', name: 'Bank Truck' },
  { markerName: 'Museum', name: 'Museum' },
  { markerName: 'OilRig', name: 'Oil Rig' },
  { markerName: 'PowerPlant', name: 'Power Plant' },
  { markerName: 'Tomb', name: 'Tomb' },
  { markerName: 'TrainCargo', name: 'Cargo Train' },
  { markerName: 'TrainPassenger', name: 'Passenger Train' }
].slice().sort((a, b) => a.name.localeCompare(b.name))
