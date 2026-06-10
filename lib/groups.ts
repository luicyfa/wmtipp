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
    points: 0
  };
}

function sortStandings(a: GroupStanding, b: GroupStanding, matchesForGroup: Match[] = []) {
  if (b.points !== a.points) return b.points - a.points;
  const directDuel = matchesForGroup.find((match) => {
    if (match.status !== "finished" || match.home_score === null || match.away_score === null) return false;
    const home = teamName(match, "home");
    const away = teamName(match, "away");
    return (home === a.teamName && away === b.teamName) || (home === b.teamName && away === a.teamName);
  });
  if (directDuel && directDuel.home_score !== null && directDuel.away_score !== null) {
    const home = teamName(directDuel, "home");
    const aGoals = home === a.teamName ? directDuel.home_score : directDuel.away_score;
    const bGoals = home === b.teamName ? directDuel.home_score : directDuel.away_score;
    if (aGoals !== bGoals) return bGoals - aGoals;
  }
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.teamName.localeCompare(b.teamName, "de");
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
        standings: Array.from(standings.values()).sort((a, b) => sortStandings(a, b, matchesForGroup)),
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
    .sort((a, b) => sortStandings(a, b));
}
