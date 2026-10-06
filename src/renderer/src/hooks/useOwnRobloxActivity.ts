import { useEffect, useState } from 'react'
import {
  getOwnRobloxActivity,
  subscribeOwnRobloxActivity,
  type OwnRobloxActivity
} from '@renderer/lib/ownRobloxActivity'

export function useOwnRobloxActivity(): OwnRobloxActivity {
  const [activity, setActivity] = useState(getOwnRobloxActivity())
  useEffect(() => subscribeOwnRobloxActivity(setActivity), [])
  return activity
}
