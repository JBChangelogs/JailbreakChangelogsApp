const API_BASE = 'https://api.jailbreakchangelogs.com'

export async function uploadBanner(token: string, blob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('banner', blob, 'banner.png')

  const res = await fetch(`${API_BASE}/v2/users/me/banner`, {
    method: 'PUT',
    headers: { Authorization: token },
    body: formData
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}) as Record<string, unknown>)
    const message =
      (errorData as { message?: string; error?: string; detail?: string }).message ??
      (errorData as { message?: string; error?: string; detail?: string }).error ??
      (errorData as { message?: string; error?: string; detail?: string }).detail ??
      `Upload failed (${res.status})`
    throw new Error(res.status === 403 ? message.replace(/premium tier/gi, 'Supporter Tier') : message)
  }

  const data = (await res.json()) as { custom_banner: string }
  return data.custom_banner
}

export async function getCustomBanner(token: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/v2/users/me/banner`, { headers: { Authorization: token } })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  const data = (await res.json()) as { custom_banner: string | null }
  return data.custom_banner
}
