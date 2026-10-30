import { useTradeHistory } from "@renderer/contexts/TradeHistoryContext";
import { SidebarHeader } from "@renderer/components/ui/sidebar-header";
import { Button } from "@renderer/components/ui/button";
import { RobloxAvatar } from "@renderer/components/dupefinder/RobloxAvatar";
import { DupeSearchBar } from "@renderer/components/dupefinder/DupeSearchBar";
import {
  userDisplay,
  userHandle,
  VerifiedIcon,
} from "@renderer/lib/dupeDisplay";

export function TradeHistorySidebar(): React.JSX.Element {
  const { lookup, search, showOwnTrades, trades, hasMore, profiles, summary } =
    useTradeHistory();
  const robloxId = lookup.status === "ready" ? lookup.robloxId : null;
  const user = robloxId ? profiles[robloxId] : undefined;
  const pending = trades.filter((trade) => trade.status === "pending").length;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <SidebarHeader>
        <DupeSearchBar
          onSearch={search}
          loading={lookup.status === "loading"}
          placeholder="Username or ID"
          suggestDupeOwners={false}
        />
      </SidebarHeader>
      <div className="flex flex-col gap-2 pt-2 px-2 empty:hidden">
        {showOwnTrades && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={showOwnTrades}
          >
            Show my trades
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {robloxId && (
          <div className="rounded-2xl border border-border-card bg-tertiary-bg p-3">
            <div className="flex items-center gap-3">
              <RobloxAvatar
                userId={robloxId}
                label={userDisplay(user, robloxId)}
                className="h-12 w-12 border border-border-card"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-sm font-bold text-primary-text">
                  {userDisplay(user, robloxId)}
                  {user?.hasVerifiedBadge && (
                    <VerifiedIcon className="h-3.5 w-3.5 shrink-0 text-button-info" />
                  )}
                </p>
                <p className="truncate text-xs text-secondary-text">
                  @{userHandle(user, robloxId)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                void window.api.openExternal(
                  `https://www.roblox.com/users/${robloxId}/profile`,
                )
              }
              className="mt-2 inline-flex items-center gap-1 text-xs text-link hover:underline"
            >
              Roblox profile
            </button>

            {(summary || trades.length > 0) && (
              <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-3 border-t border-border-card pt-3">
                {[
                  {
                    label: "Trades",
                    value: summary
                      ? summary.total.toLocaleString()
                      : `${trades.length}${hasMore ? "+" : ""}`,
                  },
                  {
                    label: "Completed",
                    value: summary?.completed.toLocaleString(),
                  },
                  {
                    label: "Pending",
                    value: summary
                      ? summary.pending.toLocaleString()
                      : pending.toLocaleString(),
                  },
                  {
                    label: "Partners",
                    value: summary?.counterparties.toLocaleString(),
                  },
                ]
                  .filter((stat) => stat.value !== undefined)
                  .map((stat) => (
                    <div key={stat.label} className="min-w-0">
                      <p className="text-[10px] text-secondary-text">
                        {stat.label}
                      </p>
                      <p className="truncate text-base font-bold text-primary-text">
                        {stat.value}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
