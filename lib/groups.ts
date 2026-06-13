import type { Match } from "@/lib/types";

export type GroupStanding = {
  groupCode: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rankNote?: string | null;
  needsManualTiebreaker?: boolean;
};

export type GroupTable = {
  groupCode: string;
  standings: GroupStanding[];
  matches: Match[];
  finishedMatches: number;
  totalMatches: number;
};

function teamName(match: Match, side: "home" | "away") {
  const team = side === "home" ? match.home_team : match.away_team;
  const label = side === "home" ? match.home_team_label : match.away_team_label;
  return team?.name ?? label ?? "Offen";
}

function emptyStanding(groupCode: string, teamNameValue: string): GroupStanding {
  return {
    groupCode,
    teamName: teamNameValue,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    rankNote: null,
    needsManualTiebreaker: false
  };
}

function compareOverall(a: GroupStanding, b: GroupStanding) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.teamName.localeCompare(b.teamName, "de");
}

function h2hStanding(team: GroupStanding, teams: GroupStanding[], matchesForGroup: Match[]) {
  const teamSet = new Set(teams.map((item) => item.teamName));
  const standing = {
    teamName: team.teamName,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0
  };

  for (const match of matchesForGroup) {
    if (match.status !== "finished" || match.home_score === null || match.away_score === null) continue;
    const home = teamName(match, "home");
    const away = teamName(match, "away");
    if (!teamSet.has(home) || !teamSet.has(away)) continue;
    if (home !== team.teamName && away !== team.teamName) continue;

    const ownGoals = home === team.teamName ? match.home_score : match.away_score;
    const opponentGoals = home === team.teamName ? match.away_score : match.home_score;
    standing.goalsFor += ownGoals;
    standing.goalsAgainst += opponentGoals;
    if (ownGoals > opponentGoals) standing.points += 3;
    if (ownGoals === opponentGoals) standing.points += 1;
  }

  standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
  return standing;
}

function h2hKey(team: GroupStanding, teams: GroupStanding[], matchesForGroup: Match[]) {
  const standing = h2hStanding(team, teams, matchesForGroup);
  return `${standing.points}:${standing.goalDifference}:${standing.goalsFor}`;
}

function compareH2h(a: GroupStanding, b: GroupStanding, teams: GroupStanding[], matchesForGroup: Match[]) {
  const aH2h = h2hStanding(a, teams, matchesForGroup);
  const bH2h = h2hStanding(b, teams, matchesForGroup);
  if (bH2h.points !== aH2h.points) return bH2h.points - aH2h.points;
  if (bH2h.goalDifference !== aH2h.goalDifference) return bH2h.goalDifference - aH2h.goalDifference;
  if (bH2h.goalsFor !== aH2h.goalsFor) return bH2h.goalsFor - aH2h.goalsFor;
  return 0;
}

function partitionBy<T>(items: T[], keyForItem: (item: T) => string) {
  const groups: T[][] = [];
  for (const item of items) {
    const key = keyForItem(item);
    const existing = groups.find((group) => keyForItem(group[0]) === key);
    if (existing) existing.push(item);
    else groups.push([item]);
  }
  return groups;
}

function markManualTiebreaker(teams: GroupStanding[]) {
  return teams.map((team) => ({
    ...team,
    needsManualTiebreaker: true,
    rankNote: "Fairplay/FIFA-Ranking prüfen"
  }));
}

function resolveTiedTeams(teams: GroupStanding[], matchesForGroup: Match[]): GroupStanding[] {
  if (teams.length <= 1) return teams;

  const byH2h = [...teams].sort((a, b) => compareH2h(a, b, teams, matchesForGroup));
  const h2hGroups = partitionBy(byH2h, (team) => h2hKey(team, teams, matchesForGroup));
  const h2hSeparatedAtLeastOneTeam = h2hGroups.length > 1;

  if (h2hSeparatedAtLeastOneTeam) {
    return h2hGroups.flatMap((group) => {
      if (group.length === 1) {
        return [{ ...group[0], rankNote: "Direkter Vergleich" }];
      }
      const subset = [...group].sort((a, b) => compareH2h(a, b, group, matchesForGroup));
      const subsetGroups = partitionBy(subset, (team) => h2hKey(team, group, matchesForGroup));
      if (subsetGroups.length > 1) {
        return subsetGroups.flatMap((subsetGroup) =>
          subsetGroup.length === 1
            ? [{ ...subsetGroup[0], rankNote: "Direkter Vergleich" }]
            : resolveByOverall(subsetGroup)
        );
      }
      return resolveByOverall(group);
    });
  }

  return resolveByOverall(teams);
}

function resolveByOverall(teams: GroupStanding[]) {
  const byOverall = [...teams].sort(compareOverall);
  const overallGroups = partitionBy(
    byOverall,
    (team) => `${team.points}:${team.goalDifference}:${team.goalsFor}`
  );

  return overallGroups.flatMap((group) => {
    if (group.length === 1) {
      return [{ ...group[0], rankNote: "Gesamt-Tordifferenz/Tore" }];
    }
    return markManualTiebreaker(group.sort((a, b) => a.teamName.localeCompare(b.teamName, "de")));
  });
}

function rankStandings(standings: GroupStanding[], matchesForGroup: Match[]) {
  const byPoints = [...standings].sort((a, b) => b.points - a.points || a.teamName.localeCompare(b.teamName, "de"));
  const pointGroups = partitionBy(byPoints, (team) => String(team.points));
  return pointGroups.flatMap((group) => {
    if (group.length === 1) return group;
    return resolveTiedTeams(group, matchesForGroup);
  });
}

export function buildGroupTables(matches: Match[]): GroupTable[] {
  const groupMatches = matches.filter((match) => match.group_code && match.round.toLowerCase().includes("gruppen"));
  const grouped = new Map<string, Match[]>();

  for (const match of groupMatches) {
    const key = match.group_code ?? "";
    grouped.set(key, [...(grouped.get(key) ?? []), match]);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b, "de"))
    .map(([groupCode, matchesForGroup]) => {
      const standings = new Map<string, GroupStanding>();

      for (const match of matchesForGroup) {
        const home = teamName(match, "home");
        const away = teamName(match, "away");
        if (!standings.has(home)) standings.set(home, emptyStanding(groupCode, home));
        if (!standings.has(away)) standings.set(away, emptyStanding(groupCode, away));

        if (match.status !== "finished" || match.home_score === null || match.away_score === null) continue;

        const homeStanding = standings.get(home)!;
        const awayStanding = standings.get(away)!;
        homeStanding.played += 1;
        awayStanding.played += 1;
        homeStanding.goalsFor += match.home_score;
        homeStanding.goalsAgainst += match.away_score;
        awayStanding.goalsFor += match.away_score;
        awayStanding.goalsAgainst += match.home_score;

        if (match.home_score > match.away_score) {
          homeStanding.wins += 1;
          awayStanding.losses += 1;
          homeStanding.points += 3;
        } else if (match.home_score < match.away_score) {
          awayStanding.wins += 1;
          homeStanding.losses += 1;
          awayStanding.points += 3;
        } else {
          homeStanding.draws += 1;
          awayStanding.draws += 1;
          homeStanding.points += 1;
          awayStanding.points += 1;
        }

        homeStanding.goalDifference = homeStanding.goalsFor - homeStanding.goalsAgainst;
        awayStanding.goalDifference = awayStanding.goalsFor - awayStanding.goalsAgainst;
      }

      return {
        groupCode,
        standings: rankStandings(Array.from(standings.values()), matchesForGroup),
        matches: matchesForGroup,
        finishedMatches: matchesForGroup.filter((match) => match.status === "finished").length,
        totalMatches: matchesForGroup.length
      };
    });
}

export function bestThirdPlacedTeams(groups: GroupTable[]) {
  return groups
    .map((group) => group.standings[2])
    .filter(Boolean)
    .sort(compareOverall);
}
