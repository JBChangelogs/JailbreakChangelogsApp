const API_BASE = 'https://api.jailbreakchangelogs.com'

export async function uploadAvatar(token: string, blob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('avatar', blob, 'avatar.png')

  const res = await fetch(`${API_BASE}/v2/users/me/avatar`, {
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

  const data = (await res.json()) as { custom_avatar: string }
  return data.custom_avatar
}

export async function getCustomAvatar(token: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/v2/users/me/avatar`, { headers: { Authorization: token } })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  const data = (await res.json()) as { custom_avatar: string | null }
  return data.custom_avatar
}
