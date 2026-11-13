// Mirrors the C# DTOs 1:1. JSON is camelCase, enums are strings, DateOnly is "YYYY-MM-DD".

export type ContestType = 'Lottery' | 'Creative'
export type ContestStatus = 'Planned' | 'Bought' | 'Submitted' | 'AwaitingResults' | 'Won' | 'Lost' | 'Archived'
export type ReminderKind = 'EndingSoon' | 'Ended' | 'ResultsDue' | 'LaureateDeadline' | 'ProofDisposable'

export interface RegisterRequest { email: string; password: string; inviteCode: string }
export interface LoginRequest { email: string; password: string }
export interface MeDto { email: string }
export interface InviteDto { code: string; createdAt: string; used: boolean }

export interface TaskDto { id: string | null; text: string; done: boolean }
export interface PurchaseDto { id: string | null; product: string; store: string | null; quantity: string | null; bought: boolean; note: string | null }
export interface ProofDto { id: string | null; what: string; keepUntil: string | null; location: string | null; discarded: boolean; note: string | null }

export interface ContestUpsertDto {
  name: string
  organizer: string | null
  url: string | null
  rulesUrl: string | null
  type: ContestType
  prizeDescription: string | null
  prizeValue: number | null
  prizeCount: number | null
  startDate: string
  endDate: string
  resultsDate: string | null
  resultsCheckNote: string | null
  entryLimitPerDay: number | null
  entryLimitTotal: number | null
  status: ContestStatus
  notes: string | null
  icon: string | null
  tasks: TaskDto[]
  purchases: PurchaseDto[]
  proofs: ProofDto[]
}

export type PhotoLabel = 'Receipt' | 'Packaging' | 'Code' | 'Other'

export interface PhotoDto {
  id: string
  label: PhotoLabel
  sizeBytes: number
}

export interface EntryDto {
  id: string
  date: string
  confirmationCode: string | null
  receiptNumber: string | null
  purchaseAmount: number | null
  contactUsed: string | null
  answerText: string | null
  store: string | null
  photos: PhotoDto[]
}

export interface WinStepDto { id: string | null; text: string; done: boolean }

export interface WinDto {
  prizeWon: string
  prizeValue: number | null
  laureateDeadline: string | null
  laureateDataSent: boolean
  steps: WinStepDto[]
}

export interface ContestDto extends ContestUpsertDto {
  id: string
  effectiveStatus: ContestStatus
  entries: EntryDto[]
  win: WinDto | null
  entriesToday: number
}

export interface OpenPurchaseDto {
  product: string
  quantity: string | null
  store: string | null
  note: string | null
}

export interface CardWinDto {
  prizeWon: string
  prizeValue: number | null
  laureateDeadline: string | null
  laureateDataSent: boolean
  stepsDone: number
  stepsTotal: number
}

export interface ContestCardDto {
  id: string
  name: string
  organizer: string | null
  icon: string | null
  type: ContestType
  prizeDescription: string | null
  prizeValue: number | null
  startDate: string
  endDate: string
  resultsDate: string | null
  status: ContestStatus
  effectiveStatus: ContestStatus
  entryCount: number
  entriesToday: number
  entryLimitTotal: number | null
  entryLimitPerDay: number | null
  url: string | null
  rulesUrl: string | null
  purchasesTotal: number
  purchasesBought: number
  firstOpenPurchase: OpenPurchaseDto | null
  stores: string[]
  firstProofLocation: string | null
  win: CardWinDto | null
  createdAt: string
}

export interface IdDto { id: string }

export interface EntryUpsertDto {
  date: string
  confirmationCode: string | null
  receiptNumber: string | null
  purchaseAmount: number | null
  contactUsed: string | null
  answerText: string | null
  store: string | null
}
export interface StatusDto { status: ContestStatus }
export interface ToggleDto { value: boolean }

export interface Reminder {
  kind: ReminderKind
  dueDate: string
  itemId: string | null
  itemText: string | null
  contest: ContestCardDto
  confirmationCodes: string[]
  winSteps: WinStepDto[]
  proofLocation: string | null
  proofNote: string | null
  boughtPurchases: OpenPurchaseDto[]
}

export interface ShoppingItemDto { id: string; contestId: string; contestName: string; product: string; quantity: string | null }
export interface ShoppingGroupDto { store: string; items: ShoppingItemDto[] }

export interface StatsDto { contests: number; entries: number; wins: number; totalSpent: number; totalWonValue: number }

// Error bodies: `{ "error": ApiErrorCode }`
export type ApiErrorCode = 'invalid_invite' | 'too_large' | 'unsupported_type'
