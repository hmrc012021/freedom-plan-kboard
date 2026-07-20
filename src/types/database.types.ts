// Hand-authored to match the live mlb schema (generate_typescript_types only
// surfaces the public schema for this project, same limitation as the Spain
// app). Verify against the live schema via the Supabase SQL editor if the
// backend adds new columns.

export type KboardRole = 'owner' | 'viewer';

interface Row<T> { Row: T; Insert: Partial<T> & Record<string, unknown>; Update: Partial<T>; Relationships: [] }

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  mlb: {
    Tables: {
      teams: Row<{
        team_id: number;
        name: string | null;
        abbreviation: string | null;
        league: string | null;
        division: string | null;
        raw_json: Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
      }>;
      players: Row<{
        player_id: number;
        full_name: string | null;
        primary_position: string | null;
        bats: string | null;
        throws: string | null;
        raw_json: Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
      }>;
      games: Row<{
        game_pk: number;
        game_date: string;
        season: number | null;
        game_datetime_utc: string | null;
        status: string | null;
        home_team_id: number | null;
        away_team_id: number | null;
        venue: string | null;
        double_header: string | null;
        game_number: number | null;
        raw_json: Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
      }>;
      pitcher_outings: Row<{
        game_pk: number;
        pitcher_id: number;
        team_id: number | null;
        opponent_team_id: number | null;
        is_starter: boolean | null;
        is_opener: boolean | null;
        outs_recorded: number | null;
        strikeouts: number | null;
        walks: number | null;
        hits: number | null;
        home_runs: number | null;
        earned_runs: number | null;
        batters_faced: number | null;
        pitches: number | null;
        strikes: number | null;
        decision: string | null;
        raw_json: Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
      }>;
      daily_pitcher_projections: Row<{
        id: number;
        projection_date: string;
        game_pk: number;
        pitcher_id: number;
        team_id: number | null;
        opponent_team_id: number | null;
        starts_sampled: number | null;
        last5_k_per_inning: number | null;
        expected_innings: number | null;
        baseline: number | null;
        opponent_k_rate: number | null;
        league_k_rate: number | null;
        adjustment: number | null;
        projected_strikeouts: number | null;
        model_version: string | null;
        created_at: string;
      }>;
      kboard_access: Row<{
        user_id: string;
        email: string | null;
        role: KboardRole;
        created_at: string;
      }>;
    };
    Views: {
      pitcher_last_5_starts: {
        Row: {
          pitcher_id: number;
          starts_sampled: number;
          most_recent_start: string | null;
          outs_recorded_sum: number;
          strikeouts_sum: number;
          walks_sum: number;
          hits_sum: number;
          earned_runs_sum: number;
          pitches_sum: number;
          batters_faced_sum: number;
          innings_pitched: number | null;
          avg_innings_per_start: number | null;
          avg_pitches_per_start: number | null;
          k_per_inning: number | null;
          k_per_9: number | null;
          k_per_9bf: number | null;
          avg_batters_faced_per_start: number | null;
        };
        Relationships: [];
      };
      pitcher_last_10_starts: {
        Row: {
          pitcher_id: number;
          starts_sampled: number;
          most_recent_start: string | null;
          outs_recorded_sum: number;
          strikeouts_sum: number;
          walks_sum: number;
          hits_sum: number;
          earned_runs_sum: number;
          pitches_sum: number;
          batters_faced_sum: number;
          innings_pitched: number | null;
          avg_innings_per_start: number | null;
          avg_pitches_per_start: number | null;
          k_per_inning: number | null;
          k_per_9: number | null;
          k_per_9bf: number | null;
          avg_batters_faced_per_start: number | null;
        };
        Relationships: [];
      };
      pitcher_current_team: {
        Row: { pitcher_id: number; team_id: number; as_of: string | null };
        Relationships: [];
      };
      pitcher_role_summary: {
        Row: { pitcher_id: number; starts: number; relief_appearances: number; opener_starts: number };
        Relationships: [];
      };
    };
    Functions: {
      simulate_slate_for_et_date: {
        Args: { p_date: string };
        Returns: SlateRow[];
      };
      is_kboard_member: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_kboard_members: {
        Args: Record<PropertyKey, never>;
        Returns: { user_id: string; email: string | null; role: KboardRole; created_at: string }[];
      };
      add_kboard_member_by_email: {
        Args: { p_email: string; p_role?: KboardRole };
        Returns: void;
      };
      remove_kboard_member: {
        Args: { p_user_id: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Shape returned by mlb.simulate_slate_for_et_date — a jsonb row per starter,
// hand-typed from the fields the app actually reads (RPC returns SETOF jsonb,
// so Postgres itself carries no static column types to generate from).
export interface SlateRow {
  game_pk: number;
  game_datetime_utc: string | null;
  home_away: 'home' | 'away' | null;
  team_id: number;
  opponent_team_id: number;
  pitcher_id: number;
  pitcher_name: string | null;
  pitcher_throws: string | null;
  source: 'actual_starter' | 'probable' | string;
  is_opener_flag: boolean | null;
  starts_sampled: number | null;
  last5_k_per_9bf: number | null;
  avg_batters_faced: number | null;
  projected_strikeouts: number | null;
  projected_batters_faced: number | null;
  actual_k: number | null;
  actual_batters_faced: number | null;
  // Present in the RPC's raw JSON response (mlb.simulate_slate_for_date)
  // but previously undeclared here -- no backend change, just exposing what
  // was already on the wire for the Raw Estimator breakdown.
  adjustment: number | null;
  // Legacy fallback fields (pre-history-enrichment), kept optional since the
  // client prefers the _pitcherHistory/_opponentHistory enrichment when present.
  pitcher_recent_k_list?: number[];
  pitcher_recent_bf_list?: number[];
  pitcher_recent_opp_team_list?: number[];
  opponent_recent_k_vs_sp?: number[];
  opponent_recent_sp_names?: string[];
}
