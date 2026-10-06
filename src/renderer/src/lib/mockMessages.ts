import type { ConversationPage, ConversationsResponse, MessageItem } from '@shared/messages'
import type { TradeOffer } from '@shared/trading'

// Dev-only fake conversations for preview screenshots, toggled by MOCK_MESSAGES_ENABLED in messagesApi.ts.
const ME = '659865209741246514'
const THEM = '1019539798383398946'

const TRADE_ID = 4821
const OFFER_ID = 1307

const now = Math.floor(Date.now() / 1000)
const min = 60

type Line = [boolean, string, number, number | null, Record<string, unknown> | null]
// [from me?, content, minutes ago, parent index, metadata]. Unread = trailing messages from them with read: false.
const threads: { id: string; unread?: number; lines: Line[] }[] = [
  {
    id: THEM,
    lines: [
      [false, 'hey, saw your trade ad for the Javelin. still available?', 42, null, null],
      [true, 'yep! looking for a couple vehicles or a hyperchrome', 40, null, null],
      [false, 'I have a Torpedo and a HyperBlue lvl 3. would that work?', 38, null, null],
      [true, 'checking values real quick', 37, null, null],
      [true, "that's 49m for my 47m, works for me", 34, 2, null],
      [false, 'deal, sending the offer now', 31, null, null],
      [false, '', 29, null, { type: 'offer_accepted', trade: TRADE_ID, offer: OFFER_ID }],
      [true, 'accepted! hop in my server', 27, null, null],
      [true, 'Join me in Jailbreak', 26, null, { type: 'game_invite', place_id: '606849621', job_id: null }],
      [false, 'omw', 25, null, null],
      [false, 'smooth trade, thanks!', 6, null, null],
      [true, 'np, enjoy the Javelin', 4, null, null]
    ]
  },
  {
    id: '806892579470704672', // catalyst.c.
    unread: 2,
    lines: [
      [false, 'is Proto-8 still around 37m?', 75, null, null],
      [true, 'yeah, average demand too', 72, null, null],
      [false, 'would you do your Proto-8 for my Celsior + Raptor?', 14, null, null],
      [false, "that's 36m, can add a little", 13, null, null]
    ]
  },
  {
    id: '1314131821616697386', // senchatf
    unread: 1,
    lines: [
      [false, 'thanks for helping me out with values last week', 2 * 60, null, null],
      [false, '', 2 * 60 - 1, null, { type: 'gift_sent', level: 2 }]
    ]
  },
  {
    id: '719605734660243547', // kas_dev
    lines: [
      [false, 'dupe finder flagged a Beam Hybrid I was about to trade for', 5 * 60, null, null],
      [true, 'good catch, always check before accepting', 5 * 60 - 3, null, null],
      [false, 'yeah not risking that one', 5 * 60 - 5, null, null]
    ]
  },
  {
    id: '1123014543891775509', // pikachuwolverine
    lines: [
      [false, 'casino just opened in my server, wanna grind robberies?', 9 * 60, null, null],
      [true, 'sure, joining now', 9 * 60 - 2, null, null],
      [false, 'Join me in Jailbreak', 9 * 60 - 3, null, { type: 'game_invite', place_id: '606849621', job_id: null }]
    ]
  },
  {
    id: '328826331867381762', // fliktem
    lines: [
      [false, 'Banana Car + Parisian for your Celsior?', 1 * 24 * 60, null, null],
      [true, "hmm that's about even, let me think about it", 1 * 24 * 60 - 10, null, null]
    ]
  },
  {
    id: '943878421191196744', // aimnice123
    lines: [
      [false, "what's HyperRed lvl 5 worth right now?", 2 * 24 * 60, null, null],
      [true, '35m, average demand', 2 * 24 * 60 - 4, null, null],
      [false, 'appreciate it', 2 * 24 * 60 - 5, null, null]
    ]
  },
  {
    id: '719327905272037467', // turtletrevor123
    lines: [
      [true, 'gg on that heist earlier', 3 * 24 * 60, null, null],
      [false, 'gg! we should run it again tomorrow', 3 * 24 * 60 - 20, null, null]
    ]
  },
  {
    id: '507215623206600735', // truesmyke
    lines: [
      [false, 'did you see the new changelog? big update', 4 * 24 * 60, null, null],
      [true, 'yeah the new vehicles look sick', 4 * 24 * 60 - 6, null, null]
    ]
  },
  {
    id: '871703889676763146', // panqz3
    lines: [
      [false, 'still need a Crew Capsule?', 5 * 24 * 60, null, null],
      [true, 'nah got one yesterday, thanks though', 5 * 24 * 60 - 30, null, null]
    ]
  }
]

const conversations = new Map(
  threads.map(({ id: other, unread = 0, lines }) => {
    const items: MessageItem[] = lines.map(([mine, content, ago, parent, metadata], i) => ({
      id: `mock-${other}-${i}`,
      parent_id: parent === null ? null : `mock-${other}-${parent}`,
      sender_id: mine ? ME : other,
      receiver_id: mine ? other : ME,
      content,
      metadata,
      created_at: now - ago * min,
      read_at: i >= lines.length - unread ? null : now - ago * min + 30
    }))
    return [other, { items, unread }]
  })
)

export const mockConversations: ConversationsResponse = {
  conversations: [...conversations].map(([recipient_id, { items, unread }]) => ({
    message: items[items.length - 1],
    recipient_id,
    message_count: items.length,
    unread_count: unread
  })),
  total_conversations: conversations.size
}

export function mockConversationPage(recipientId: string): ConversationPage {
  const items = conversations.get(recipientId)?.items ?? []
  return {
    items: [...items].reverse(), // API returns newest first
    total: items.length,
    page: 1,
    total_pages: 1,
    size: items.length
  }
}

export const mockAcceptedOffer: TradeOffer = {
  id: OFFER_ID,
  trade: TRADE_ID,
  status: 1,
  created_at: now - 31 * min,
  
  offering: [
    { id: '222', name: 'Torpedo', type: 'Vehicle', info: { cash_value: '28m', duped_value: '23m', demand: 'Below Average', trend: 'Stable' } },
    { id: '549', name: 'HyperBlue Level 3', type: 'HyperChrome', info: { cash_value: '21m', demand: 'Decent', trend: 'Stable' } }
  ],
  requesting: [
    { id: '170', name: 'Javelin', type: 'Vehicle', info: { cash_value: '47m', duped_value: '44m', demand: 'Average', trend: 'Stable' } }
  ]
}
